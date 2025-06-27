// multiHopRouter.js
// Find and evaluate multi-hop and cross-chain routes
const { advancedPools } = require('./advancedPools');

/**
 * Find all possible multi-hop paths for an intent (up to maxHops)
 * Uses BFS to find paths from sellToken to buyToken
 */
function findMultiHopPaths(intent, pools, maxHops = 3) {
  const paths = [];
  const queue = [[{ token: intent.sellToken, path: [], usedPools: new Set() }]];
  while (queue.length) {
    const current = queue.shift();
    const last = current[current.length - 1];
    if (last.token === intent.buyToken && current.length > 1) {
      paths.push(current.slice(1).map(x => x.pool));
      continue;
    }
    if (current.length > maxHops + 1) continue;
    for (const pool of pools) {
      if (last.usedPools.has(pool.address)) continue;
      if (pool.tokens.includes(last.token)) {
        const nextToken = pool.tokens.find(t => t !== last.token);
        queue.push([
          ...current,
          { token: nextToken, pool, usedPools: new Set([...last.usedPools, pool.address]) }
        ]);
      }
    }
  }
  return paths;
}

/**
 * Evaluate a multi-hop path (simulate swaps along the path)
 */
function evaluateMultiHopPath(path, intent) {
  let amount = Number(intent.sellAmount);
  let utility = 0;
  let currentToken = intent.sellToken;
  for (const pool of path) {
    if (pool.type === 'curve') {
      amount = require('./advancedPools').simulateCurveSwap(pool, { ...intent, sellToken: currentToken, sellAmount: amount });
    } else if (pool.type === 'balancer') {
      amount = require('./advancedPools').simulateBalancerSwap(pool, { ...intent, sellToken: currentToken, sellAmount: amount });
    } else {
      // Default: UniswapV2
      const x = Number(pool.reserves[currentToken]);
      const y = Number(pool.reserves[pool.tokens.find(t => t !== currentToken)]);
      const dxWithFee = amount * (1 - pool.fee);
      amount = (dxWithFee * y) / (x + dxWithFee);
    }
    currentToken = pool.tokens.find(t => t !== currentToken);
    if (!amount || amount <= 0) return { amountOut: 0, utility: 0 };
    utility += amount;
  }
  return { amountOut: amount, utility };
}

module.exports = { findMultiHopPaths, evaluateMultiHopPath };
