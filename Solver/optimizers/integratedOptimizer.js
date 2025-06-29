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
  CFMMs = await fetchAllPools();
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

// Main optimizer that evaluates and compares all execution paths
async function runGlobalBatchOptimizer(intents) {
  // Update market state before optimization
  await updateMarketState();
  
  // Get ElizaOS batch optimization suggestions
  const elizaBatchSuggestions = await elizaOS.analyzeBatch(intents, marketState);

  if (CFMMs.length === 0) await updateCFMMs();

  const executions = [];

  for (const intent of intents) {
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
      elizaOS.approveCrossChain(bestCrossChainValue, bestLocalValue, marketState);

    executions.push({
      intent,
      requiresCrossChain: shouldBridgeToCrossChain,
      targetChain: shouldBridgeToCrossChain ? bestCrossChainPool.chainId : intent.chainId,
      expectedValue: shouldBridgeToCrossChain ? bestCrossChainValue.value : bestLocalValue.value,
      pool: shouldBridgeToCrossChain ? bestCrossChainPool : bestLocalPool,
      executionPlan: {
        estimatedOutput: shouldBridgeToCrossChain ? bestCrossChainValue.expectedOutput : bestLocalValue.expectedOutput,
        totalCost: shouldBridgeToCrossChain ? bestCrossChainValue.totalCost : bestLocalValue.totalCost
      },
      elizaMetrics: {
        confidence: elizaIntentSuggestions.confidence,
        riskScore: elizaIntentSuggestions.riskScore,
        suggestionStrength: elizaIntentSuggestions.strength
      },
      marketContext: marketState
    });
  }

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