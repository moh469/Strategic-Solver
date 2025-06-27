// Adaptive ElizaOS Orchestrator for batch optimization and learning
const { db, initDB } = require('../utils/sqlite');
const {
  runGlobalBatchOptimizer,
  adaptOptimizerParams,
  setOptimizerParams
} = require('../../../Solver/optimizers/integratedOptimizer');
const matcher = require('./matcher');
const { routeToAMM } = require('./ammAdapter');
const config = require('../config');
const { ethers } = require('ethers');

initDB();

// Log batch execution outcomes for learning
async function logBatchOutcomes(batchId, outcomes) {
  for (const outcome of outcomes) {
    db.run('INSERT INTO routing_logs (order_id, action, details) VALUES (?, ?, ?)', [
      outcome.orderId,
      outcome.type,
      JSON.stringify({ utility: outcome.utility, slippage: outcome.slippage, success: outcome.success })
    ]);
  }
}

// Analyze recent outcomes and adapt optimizer parameters
async function analyzeAndAdapt() {
  return new Promise((resolve) => {
    db.all('SELECT details FROM routing_logs WHERE created_at > datetime("now", "-1 hour")', [], (err, rows) => {
      let totalSlippage = 0, totalUtility = 0, count = 0;
      for (const row of rows) {
        try {
          const details = JSON.parse(row.details);
          if (typeof details.slippage === 'number') totalSlippage += details.slippage;
          if (typeof details.utility === 'number') totalUtility += details.utility;
          count++;
        } catch {}
      }
      const stats = {
        avgSlippage: count ? totalSlippage / count : 0,
        avgUtility: count ? totalUtility / count : 0
      };
      const newParams = adaptOptimizerParams(stats);
      setOptimizerParams(newParams);
      resolve(newParams);
    });
  });
}

// Main entry: process a batch of intents with learning
async function processBatch(intents, batchId) {
  // 1. Run optimizer with current params
  const plan = await runGlobalBatchOptimizer(intents);
  const outcomes = [];

  // 2. Execute CoW matches (real on-chain execution)
  for (const match of plan.matchedViaCoW) {
    try {
      // Use matcher to execute on-chain CoW settlement
      const result = await matcher.matchIntentsIfCompatible(match);
      outcomes.push({
        orderId: match.a.id,
        type: 'CoW',
        utility: 1, // You can fetch real utility if available
        slippage: 0, // You can fetch real slippage if available
        success: result && result.success
      });
      outcomes.push({
        orderId: match.b.id,
        type: 'CoW',
        utility: 1,
        slippage: 0,
        success: result && result.success
      });
    } catch (err) {
      outcomes.push({ orderId: match.a.id, type: 'CoW', utility: 0, slippage: 0, success: false });
      outcomes.push({ orderId: match.b.id, type: 'CoW', utility: 0, slippage: 0, success: false });
    }
  }

  // 3. Execute CFMM routes (real on-chain execution)
  for (const { intent, result } of plan.routedViaCFMM) {
    try {
      // Prepare params for AMM swap
      const params = {
        chain: intent.chain, // must be set in intent
        routerAddress: result.cfmm, // must be router address
        amountIn: intent.sellAmount,
        amountOutMin: intent.minBuyAmount || 0,
        path: [intent.sellToken, intent.buyToken],
        to: intent.user || intent.recipient, // must be set in intent
        deadline: Math.floor(Date.now() / 1000) + 1800, // 30 min from now
        privateKey: process.env.PRIVATE_KEY // protocol or relayer key
      };
      const tx = await routeToAMM(params);
      outcomes.push({
        orderId: intent.id,
        type: 'AMM',
        utility: Number(result.utility),
        slippage: Number(result.slippage || 0),
        success: !!tx && !!tx.hash
      });
    } catch (err) {
      outcomes.push({ orderId: intent.id, type: 'AMM', utility: 0, slippage: 0, success: false });
    }
  }

  // 4. Log outcomes
  await logBatchOutcomes(batchId, outcomes);

  // 5. Adapt optimizer parameters based on recent outcomes
  await analyzeAndAdapt();

  return plan;
}

module.exports = { processBatch, analyzeAndAdapt };
