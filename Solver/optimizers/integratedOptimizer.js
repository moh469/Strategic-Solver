// integratedOptimizer.js
// Off-chain optimizer for intent matching and routing
// - Matches intents directly (CoW)
// - Routes unmatched intents via CFMM/AMM pools
// - Returns a comprehensive execution plan for settlement

const matchCoWs = require('./cowOptimizer'); // CoW matching logic
const { fetchAllPools } = require('./multiChainPools'); // Import real EVM-based pools
const { globalBatchOptimize } = require('./batchOptimizer'); // Batch optimization logic
const { estimateCcipFees } = require('../utils/ccipFees'); // Add this utility
const { ElizaOptimizer } = require('../services/elizaOptimizer');
const { AutoTuner } = require('../services/autoTuner');
const { MarketConditionMonitor } = require('../services/marketMonitor');

// Replace static CFMMs with real on-chain pools
let CFMMs = [];
const elizaOS = new ElizaOptimizer();
const autoTuner = new AutoTuner();
const marketMonitor = new MarketConditionMonitor();

// Enhanced optimizer parameters with ElizaOS controls
const optimizerParams = {
  maxSlippage: 0.03, // 3% max slippage
  minValueImprovement: 0.02, // 2% min improvement needed for cross-chain
  ccipOverhead: 1.2, // CCIP overhead factor
  // ElizaOS control parameters
  adaptiveThreshold: true,
  marketConditionAware: true,
  autoTuneEnabled: true,
  elizaLearningRate: 0.01
};

// Market condition tracking
let marketState = {
  volatility: 'normal',
  liquidityDepth: 'normal',
  gasPrice: 'normal',
  ccipCongestion: 'normal'
};

async function updateCFMMs() {
  try {
    CFMMs = await fetchAllPools();
    console.log(`Updated CFMMs: ${CFMMs.length} pools available`);
  } catch (error) {
    console.error('Failed to update CFMMs:', error.message);
    CFMMs = []; // Ensure CFMMs is still an array
  }
}

// Call updateCFMMs() before running optimizer, or on a schedule
// await updateCFMMs();

// Find CFMMs that can route the intent (support both tokens)
function getCandidateCFMMs(intent) {
  return CFMMs.filter(cfmm =>
    cfmm.tokens.includes(intent.sellToken) && cfmm.tokens.includes(intent.buyToken)
  );
}

// Simulate a CFMM swap and compute net utility
// Returns null if swap is not possible or not profitable
function simulateSwapWithUtility(cfmm, intent) {
  const { sellToken, buyToken, sellAmount } = intent;
  const dx = Number(sellAmount);
  const x = cfmm.reserves[sellToken];
  const y = cfmm.reserves[buyToken];
  const maxDx = cfmm.alpha * x;

  // Liquidity constraint: can't swap more than alpha * reserve
  if (dx > maxDx) return null;

  const dxWithFee = dx * (1 - cfmm.fee); // Apply trading fee
  const dy = (dxWithFee * y) / (x + dxWithFee); // Uniswap formula

  const utility = dy - cfmm.gasCost; // Net utility after gas
  if (utility <= 0) return null; // Only consider profitable swaps

  return {
    cfmm: cfmm.id,
    amountOut: dy.toFixed(6),
    utility: utility.toFixed(6)
  };
}

// Market condition update
async function updateMarketState() {
  marketState = marketMonitor.monitor(optimizerParams);
  
  // Adjust parameters based on market conditions
  if (marketState.volatility === 'high') {
    optimizerParams.maxSlippage *= 0.8;
    optimizerParams.minValueImprovement *= 1.2;
  }
  
  if (marketState.ccipCongestion === 'high') {
    optimizerParams.ccipOverhead *= 1.3;
  }
}

// ElizaOS optimization feedback loop
class ExecutionFeedback {
  constructor() {
    this.successfulExecutions = [];
    this.failedExecutions = [];
  }

  addExecution(execution, success, actualValue) {
    const feedback = {
      execution,
      success,
      expectedValue: execution.expectedValue,
      actualValue,
      timestamp: Date.now()
    };

    if (success) {
      this.successfulExecutions.push(feedback);
    } else {
      this.failedExecutions.push(feedback);
    }

    // Trigger ElizaOS learning
    elizaOS.learn(feedback);
  }

  getPerformanceMetrics() {
    const recentExecutions = [...this.successfulExecutions, ...this.failedExecutions]
      .filter(e => Date.now() - e.timestamp < 24 * 60 * 60 * 1000); // Last 24h

    return {
      successRate: this.calculateSuccessRate(recentExecutions),
      valueAccuracy: this.calculateValueAccuracy(recentExecutions),
      crossChainEfficiency: this.calculateCrossChainEfficiency(recentExecutions)
    };
  }
}

const executionFeedback = new ExecutionFeedback();

// Calculate execution value considering all costs
async function calculateExecutionValue(intent, pool, params = optimizerParams) {
  if (!pool) {
    console.log(`No pool available for intent ${intent.id || 'unknown'}`);
    return { 
      value: 0, 
      isCrossChain: false, 
      targetChain: intent.chainId || 11155111, // Default to Sepolia
      expectedOutput: 0,
      totalCost: 0,
      elizaConfidence: 0,
      marketConditions: marketState,
      error: 'No pool available'
    };
  }

  if (!pool.tokens.includes(intent.sellToken) || !pool.tokens.includes(intent.buyToken)) {
    return { value: 0, isCrossChain: false };
  }

  const x = Number(pool.reserves[intent.sellToken]);
  const y = Number(pool.reserves[intent.buyToken]);
  const dx = Number(intent.sellAmount);

  // Basic checks
  if (dx > 0.3 * x || x <= 0 || y <= 0) {
    return { value: 0, isCrossChain: false };
  }

  // Calculate base swap outcome
  const dxWithFee = dx * (1 - pool.fee);
  const dy = (dxWithFee * y) / (x + dxWithFee);
  const slippage = dx / x;

  if (slippage > params.maxSlippage) {
    return { value: 0, isCrossChain: false };
  }

  // Get ElizaOS suggestions
  const elizaSuggestions = await elizaOS.analyzeExecution(intent, pool, marketState);
  
  // Apply ElizaOS adjustments to parameters
  const adjustedParams = {
    ...params,
    maxSlippage: params.maxSlippage * elizaSuggestions.slippageMultiplier,
    ccipOverhead: params.ccipOverhead * elizaSuggestions.ccipMultiplier
  };

  const isCrossChain = pool.chainId !== intent.chainId;
  let totalCost = pool.gasCost || 0;

  if (isCrossChain) {
    // Estimate CCIP fees if cross-chain
    const ccipFees = await estimateCcipFees(intent.chainId, pool.chainId, dx);
    // Apply market-aware adjustments
    const marketAdjustedFees = await marketMonitor.adjustFees(ccipFees, marketState);
    totalCost = (totalCost + marketAdjustedFees) * adjustedParams.ccipOverhead;
  }

  // Get auto-tuned execution parameters
  const tuningAdjustments = await autoTuner.getTuning(intent, pool, marketState);
  
  // Calculate final value with all adjustments
  const baseValue = dy - totalCost;
  const adjustedValue = elizaOS.adjustValue(baseValue, tuningAdjustments);

  return {
    value: adjustedValue,
    isCrossChain,
    targetChain: pool.chainId,
    expectedOutput: dy,
    totalCost,
    elizaConfidence: elizaSuggestions.confidence,
    marketConditions: marketState
  };
}

// Fast optimizer for single intent submissions - skips expensive AI/ML operations
async function runFastSingleIntentOptimizer(intent) {
  console.log("⚡ Running fast single intent optimizer...");
  
  // No CoW matching possible with single intent
  console.log("🔎 Step 1: Skipping CoW matching (single intent)");
  
  // Return "no match found" result quickly since we have no pools and no other intents
  const result = {
    intent: intent,
    requiresCrossChain: false,
    targetChain: intent.chainId || 11155111,
    expectedValue: 0,
    pool: null,
    executionPlan: {
      estimatedOutput: 0,
      totalCost: 0,
      matchType: 'None',
      error: 'No valid execution path found. Consider adding to the intent pool for potential CoW matching.'
    },
    elizaMetrics: {
      confidence: 1.0, // High confidence in "no match" result
      riskScore: 0.0,
      suggestionStrength: 0.0
    },
    marketContext: { fastPath: true }
  };

  console.log("⚡ Fast path complete: No execution path found for single intent");
  return [result];
}

// Main optimizer that evaluates and compares all execution paths
async function runGlobalBatchOptimizer(intents) {
  console.log(`🚀 Starting batch optimizer with ${intents.length} intent(s)...`);
  
  // Only use fast path if there's truly just one intent and no possibility of matches
  // If there are multiple intents in the pool, always run full optimization for CoW matching
  if (intents.length === 1) {
    console.log("⚡ Fast path: Single intent, no other intents in pool");
    return await runFastSingleIntentOptimizer(intents[0]);
  }
  
  // Update market state before optimization (for batch processing)
  await updateMarketState();
  
  // Get ElizaOS batch optimization suggestions
  const elizaBatchSuggestions = await elizaOS.analyzeBatch(intents, marketState);

  if (CFMMs.length === 0) await updateCFMMs();

  // STEP 1: CoW (Coincidence of Wants) Matching - Most efficient option
  console.log("🔎 Step 1: Checking for CoW matches...");
  const cowMatches = matchCoWs(intents);
  
  // Create a set of matched intent IDs to track which intents are already matched
  const matchedIntentIds = new Set();
  const executions = [];

  // Process CoW matches first (highest priority - direct user-to-user swaps)
  for (const match of cowMatches) {
    console.log(`✅ CoW match executed: ${match.a.userAddress} ↔ ${match.b.userAddress}`);
    
    // Add both intents as successfully matched via CoW
    executions.push({
      intent: match.a,
      requiresCrossChain: false,
      targetChain: match.a.chainId,
      expectedValue: Number(match.b.sellAmount), // A gets B's sell amount
      pool: null, // No pool needed for CoW
      executionPlan: {
        estimatedOutput: Number(match.b.sellAmount),
        totalCost: 0, // Minimal gas costs for direct swap
        matchType: 'CoW',
        counterparty: match.b.userAddress
      },
      elizaMetrics: {
        confidence: 1.0, // High confidence for direct matches
        riskScore: 0.1, // Low risk - no slippage or liquidity issues
        suggestionStrength: 1.0
      },
      marketContext: marketState
    });
    
    executions.push({
      intent: match.b,
      requiresCrossChain: false,
      targetChain: match.b.chainId,
      expectedValue: Number(match.a.sellAmount), // B gets A's sell amount
      pool: null, // No pool needed for CoW
      executionPlan: {
        estimatedOutput: Number(match.a.sellAmount),
        totalCost: 0, // Minimal gas costs for direct swap
        matchType: 'CoW',
        counterparty: match.a.userAddress
      },
      elizaMetrics: {
        confidence: 1.0, // High confidence for direct matches
        riskScore: 0.1, // Low risk - no slippage or liquidity issues
        suggestionStrength: 1.0
      },
      marketContext: marketState
    });
    
    // Mark these intents as matched
    matchedIntentIds.add(match.a.id || match.a.userAddress);
    matchedIntentIds.add(match.b.id || match.b.userAddress);
  }

  // STEP 2: CFMM/AMM Pool Routing for unmatched intents
  console.log("🏊 Step 2: Routing unmatched intents through pools...");
  
  for (const intent of intents) {
    // Skip intents that are already matched via CoW
    const intentId = intent.id || intent.userAddress;
    if (matchedIntentIds.has(intentId)) {
      console.log(`⏭️ Skipping intent ${intentId} - already matched via CoW`);
      continue;
    }

    // Apply ElizaOS intent-specific suggestions
    const elizaIntentSuggestions = elizaBatchSuggestions[intent.id];
    
    // Find best local execution
    const localPools = CFMMs.filter(pool => pool.chainId === intent.chainId);
    let bestLocalValue = { value: 0 };
    let bestLocalPool = null;

    for (const pool of localPools) {
      const localValue = await calculateExecutionValue(intent, pool);
      if (localValue.value > bestLocalValue.value) {
        bestLocalValue = localValue;
        bestLocalPool = pool;
      }
    }

    // Find best cross-chain execution
    const crossChainPools = CFMMs.filter(pool => pool.chainId !== intent.chainId);
    let bestCrossChainValue = { value: 0 };
    let bestCrossChainPool = null;

    for (const pool of crossChainPools) {
      const crossChainValue = await calculateExecutionValue(intent, pool);
      if (crossChainValue.value > bestCrossChainValue.value) {
        bestCrossChainValue = crossChainValue;
        bestCrossChainPool = pool;
      }
    }

    // Compare and select best execution path
    const shouldBridgeToCrossChain = 
      bestCrossChainValue.value > 0 && 
      bestCrossChainValue.value > bestLocalValue.value * (1 + optimizerParams.minValueImprovement) &&
      bestCrossChainPool && // Ensure pool exists
      elizaOS.approveCrossChain(bestCrossChainValue, bestLocalValue, marketState);

    // Ensure we have a valid execution path
    const hasValidExecution = shouldBridgeToCrossChain ? bestCrossChainPool : bestLocalPool;
    
    if (!hasValidExecution) {
      console.log(`No valid execution path found for intent ${intent.id || 'unknown'}`);
      executions.push({
        intent,
        requiresCrossChain: false,
        targetChain: intent.chainId || 11155111, // Default to Sepolia
        expectedValue: 0,
        pool: null,
        executionPlan: {
          estimatedOutput: 0,
          totalCost: 0,
          error: 'No valid execution path'
        },
        elizaMetrics: {
          confidence: 0,
          riskScore: 1.0, // High risk when no execution possible
          suggestionStrength: 0
        },
        marketContext: marketState
      });
      continue;
    }

    executions.push({
      intent,
      requiresCrossChain: shouldBridgeToCrossChain,
      targetChain: shouldBridgeToCrossChain ? bestCrossChainPool.chainId : (bestLocalPool?.chainId || intent.chainId),
      expectedValue: shouldBridgeToCrossChain ? bestCrossChainValue.value : bestLocalValue.value,
      pool: shouldBridgeToCrossChain ? bestCrossChainPool : bestLocalPool,
      executionPlan: {
        estimatedOutput: shouldBridgeToCrossChain ? bestCrossChainValue.expectedOutput : bestLocalValue.expectedOutput,
        totalCost: shouldBridgeToCrossChain ? bestCrossChainValue.totalCost : bestLocalValue.totalCost
      },
      elizaMetrics: {
        confidence: elizaIntentSuggestions?.confidence || 0,
        riskScore: elizaIntentSuggestions?.riskScore || 1.0,
        suggestionStrength: elizaIntentSuggestions?.strength || 0
      },
      marketContext: marketState
    });
  }

  // Summary logging
  const cowCount = executions.filter(e => e.executionPlan.matchType === 'CoW').length;
  const poolCount = executions.filter(e => e.executionPlan.matchType !== 'CoW' && e.pool).length;
  const failedCount = executions.filter(e => e.executionPlan.error).length;
  
  console.log(`📊 Optimization Summary: ${cowCount} CoW matches, ${poolCount} pool routes, ${failedCount} failed`);

  // Update autonomous systems with batch results
  autoTuner.updateFromBatch(executions);
  elizaOS.recordBatchDecision(executions);

  return executions;
}

// Auto-update market conditions periodically
setInterval(updateMarketState, 5 * 60 * 1000); // Every 5 minutes

module.exports = {
  runGlobalBatchOptimizer,
  executionFeedback, // Export for external feedback collection
  elizaOS // Export for monitoring and configuration
};