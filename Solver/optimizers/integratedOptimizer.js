// integratedOptimizer.js
// Off-chain optimizer for intent matching and routing
// - Matches intents directly (CoW)
// - Routes unmatched intents via CFMM/AMM pools
// - Returns a comprehensive execution plan for settlement

const matchCoWs = require('./cowOptimizer'); // CoW matching logic
const { fetchAllPools } = require('./multiChainPools'); // Import real EVM-based pools
const { globalBatchOptimize } = require('./batchOptimizer'); // Batch optimization logic

// Replace static CFMMs with real on-chain pools
let CFMMs = [];

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

// Extended optimizer parameters with learning rates and constraints
let optimizerParams = {
  weightUtility: 1,
  weightSlippage: 0,
  learningRate: 0.1,
  minWeightUtility: 0.1,
  maxWeightUtility: 5,
  minWeightSlippage: 0,
  maxWeightSlippage: 5,
  crossChainPenalty: 1.2, // Higher cost for cross-chain routes
  batchSizeLimit: 50,     // Max intents per batch
  maxGasPerIntent: 500000 // Gas limit per intent
};

// Enhanced parameter adaptation using exponential moving averages
const historicalStats = {
  avgUtility: 1.0,
  avgSlippage: 0.005,
  successRate: 0.95,
  alpha: 0.1 // EMA decay factor
};

function updateHistoricalStats(newStats) {
  const α = historicalStats.alpha;
  historicalStats.avgUtility = α * newStats.avgUtility + (1 - α) * historicalStats.avgUtility;
  historicalStats.avgSlippage = α * newStats.avgSlippage + (1 - α) * historicalStats.avgSlippage;
  historicalStats.successRate = α * newStats.successRate + (1 - α) * historicalStats.successRate;
}

// Sophisticated parameter adaptation based on historical performance
function adaptOptimizerParams(stats) {
  updateHistoricalStats(stats);
  const { learningRate, minWeightUtility, maxWeightUtility, minWeightSlippage, maxWeightSlippage } = optimizerParams;
  
  // Utility weight adaptation
  if (historicalStats.avgUtility < 0.5 && historicalStats.successRate > 0.8) {
    optimizerParams.weightUtility = Math.min(
      optimizerParams.weightUtility * (1 + learningRate),
      maxWeightUtility
    );
  } else if (historicalStats.avgUtility > 2.0 || historicalStats.successRate < 0.7) {
    optimizerParams.weightUtility = Math.max(
      optimizerParams.weightUtility * (1 - learningRate),
      minWeightUtility
    );
  }

  // Slippage weight adaptation
  if (historicalStats.avgSlippage > 0.01) {
    optimizerParams.weightSlippage = Math.min(
      optimizerParams.weightSlippage * (1 + learningRate),
      maxWeightSlippage
    );
  } else if (historicalStats.avgSlippage < 0.003 && historicalStats.successRate > 0.9) {
    optimizerParams.weightSlippage = Math.max(
      optimizerParams.weightSlippage * (1 - learningRate),
      minWeightSlippage
    );
  }

  // Adjust learning rate based on success rate
  if (historicalStats.successRate < 0.8) {
    optimizerParams.learningRate = Math.max(optimizerParams.learningRate * 0.9, 0.01);
  } else if (historicalStats.successRate > 0.95) {
    optimizerParams.learningRate = Math.min(optimizerParams.learningRate * 1.1, 0.5);
  }

  return optimizerParams;
}

// Enhanced formal objective function with cross-chain awareness
function formalObjective(intent, pool, params = optimizerParams) {
  // Only consider pools with both tokens
  if (!pool.tokens.includes(intent.sellToken) || !pool.tokens.includes(intent.buyToken)) return 0;
  const x = Number(pool.reserves[intent.sellToken]);
  const y = Number(pool.reserves[intent.buyToken]);
  const dx = Number(intent.sellAmount);
  if (dx > 0.3 * x) return 0; // liquidity constraint
  const dxWithFee = dx * (1 - pool.fee);
  const dy = (dxWithFee * y) / (x + dxWithFee);
  const slippage = (dx / x);
  const utility = dy - (pool.gasCost || 0);
  // Weighted sum: utility - (weightSlippage * slippage)
  return params.weightUtility * utility - params.weightSlippage * slippage;
}

// Default optimizer parameters (can be updated by ElizaOS)
// let optimizerParams = { weightUtility: 1, weightSlippage: 0 };

function setOptimizerParams(params) {
  optimizerParams = { ...optimizerParams, ...params };
}

// Main optimizer: matches intents and finds best routing for unmatched
function optimizeIntents(intents, params = optimizerParams) {
  // Step 1: Find all direct matches (CoW)
  const matches = matchCoWs(intents);
  const matchedIntents = new Set();

  // Track matched intents to avoid double routing
  matches.forEach(({ a, b }) => {
    matchedIntents.add(a.id);
    matchedIntents.add(b.id);
  });

  // Step 2: Find unmatched intents
  const unmatched = intents.filter(intent => !matchedIntents.has(intent.id));
  const cfmmRoutes = [];

  // Step 3: For each unmatched intent, find best CFMM route
  for (const intent of unmatched) {
    const candidates = getCandidateCFMMs(intent);
    let best = null;

    for (const cfmm of candidates) {
      // Use formalObjective with dynamic params
      const score = formalObjective(intent, cfmm, params);
      if (score > 0 && (!best || score > best.score)) {
        const result = simulateSwapWithUtility(cfmm, intent);
        if (result) best = { ...result, score };
      }
    }

    if (best) {
      cfmmRoutes.push({ intent, result: best });
    }
  }

  // Step 4: Return execution plan
  return {
    matchedViaCoW: matches, // Direct matches
    routedViaCFMM: cfmmRoutes // Fallback AMM routes
  };
}

// New entry point for global batch optimization
async function runGlobalBatchOptimizer(intents, params = optimizerParams) {
  if (CFMMs.length === 0) await updateCFMMs();
  return globalBatchOptimize(intents, CFMMs, (intent, pool) => formalObjective(intent, pool, params));
}

// Automatically refresh CFMMs every 60 seconds
setInterval(updateCFMMs, 60 * 1000);

// Ensure pools are loaded before optimizer runs
async function runOptimizerWithFreshPools(intents) {
  if (CFMMs.length === 0) {
    await updateCFMMs();
  }
  return optimizeIntents(intents);
}

// ElizaOS can call this to adapt parameters based on recent stats
function adaptOptimizerParams(stats) {
  // Example: if avg slippage > 1%, increase slippage penalty
  if (stats.avgSlippage > 0.01) {
    optimizerParams.weightSlippage = Math.min(optimizerParams.weightSlippage + 0.5, 5);
  }
  // Example: if avg utility < threshold, increase utility weight
  if (stats.avgUtility < 0.5) {
    optimizerParams.weightUtility = Math.min(optimizerParams.weightUtility + 0.5, 5);
  }
  // ...add more rules as needed
  return optimizerParams;
}

// Export both, but backend should use only runGlobalBatchOptimizer for optimal execution
module.exports = {
  runOptimizerWithFreshPools,
  runGlobalBatchOptimizer,
  optimizeIntents,
  setOptimizerParams,
  adaptOptimizerParams
}; // Export for use in runners and backend