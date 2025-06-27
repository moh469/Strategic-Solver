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

// Example formal objective function: maximize output minus gas cost, parameterizable
function formalObjective(intent, pool, params = { weightUtility: 1, weightSlippage: 0 }) {
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

// Main optimizer: matches intents and finds best routing for unmatched
function optimizeIntents(intents) {
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
      const result = simulateSwapWithUtility(cfmm, intent);
      if (result && (!best || result.utility > best.utility)) {
        best = result;
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
async function runGlobalBatchOptimizer(intents) {
  if (CFMMs.length === 0) await updateCFMMs();
  return globalBatchOptimize(intents, CFMMs, formalObjective);
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

// Export both, but backend should use only runGlobalBatchOptimizer for optimal execution
module.exports = { runOptimizerWithFreshPools, runGlobalBatchOptimizer, optimizeIntents }; // Export for use in runners and backend