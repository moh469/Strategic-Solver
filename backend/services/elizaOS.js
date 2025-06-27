// ElizaOS Orchestrator Service
const { db, initDB } = require('../utils/sqlite');
const matcher = require('./matcher');
const { routeToAMM } = require('./ammAdapter');

initDB();

/**
 * Main entry: orchestrate order execution
 * 1. Try CoW match
 * 2. Fallback to AMMs/CFMMs on any EVM chain
 * 3. Log all actions
 */
async function updateLearningStats({ chain, amm, cowAttempt, cowSuccess, ammAttempt, ammSuccess }) {
  db.get('SELECT * FROM learning_stats WHERE chain = ? AND amm = ?', [chain, amm], (err, row) => {
    if (row) {
      db.run(`UPDATE learning_stats SET 
        cow_attempts = cow_attempts + ?,
        cow_successes = cow_successes + ?,
        amm_attempts = amm_attempts + ?,
        amm_successes = amm_successes + ?,
        last_updated = CURRENT_TIMESTAMP
        WHERE chain = ? AND amm = ?`,
        [cowAttempt, cowSuccess, ammAttempt, ammSuccess, chain, amm]);
    } else {
      db.run(`INSERT INTO learning_stats (chain, amm, cow_attempts, cow_successes, amm_attempts, amm_successes) VALUES (?, ?, ?, ?, ?, ?)`,
        [chain, amm, cowAttempt, cowSuccess, ammAttempt, ammSuccess]);
    }
  });
}

async function getBestFallback(order) {
  // Query stats for best AMM/chain (highest amm_successes/amm_attempts)
  return new Promise((resolve) => {
    db.all('SELECT * FROM learning_stats WHERE amm_attempts > 0 ORDER BY (CAST(amm_successes AS FLOAT)/amm_attempts) DESC LIMIT 1', [], (err, rows) => {
      if (rows && rows.length > 0) {
        resolve({ chain: rows[0].chain, amm: rows[0].amm });
      } else {
        // fallback to order's default
        resolve(order.fallbackParams);
      }
    });
  });
}

async function processOrder(order) {
  return new Promise((resolve, reject) => {
    // Store order
    db.run('INSERT INTO orders (order_json, status) VALUES (?, ?)', [JSON.stringify(order), 'pending'], function(err) {
      if (err) return reject(err);
      const orderId = this.lastID;
      // 1. Try CoW match
      updateLearningStats({ chain: order.chain, amm: 'CoW', cowAttempt: 1, cowSuccess: 0, ammAttempt: 0, ammSuccess: 0 });
      matcher.matchOrder(order).then(matchResult => {
        if (matchResult && matchResult.filled) {
          updateLearningStats({ chain: order.chain, amm: 'CoW', cowAttempt: 0, cowSuccess: 1, ammAttempt: 0, ammSuccess: 0 });
          db.run('INSERT INTO matches (order_id, match_json, type) VALUES (?, ?, ?)', [orderId, JSON.stringify(matchResult), 'CoW']);
          db.run('UPDATE orders SET status = ? WHERE id = ?', ['matched', orderId]);
          db.run('INSERT INTO routing_logs (order_id, action, details) VALUES (?, ?, ?)', [orderId, 'CoW', 'Order fully matched by CoW']);
          resolve({ status: 'matched', matchResult });
        } else {
          // 2. Fallback to best AMM/chain based on learning
          getBestFallback(order).then(best => {
            const fallbackParams = { ...order.fallbackParams, ...best };
            updateLearningStats({ chain: fallbackParams.chain, amm: fallbackParams.amm, cowAttempt: 0, cowSuccess: 0, ammAttempt: 1, ammSuccess: 0 });
            routeToAMM(fallbackParams).then(ammResult => {
              updateLearningStats({ chain: fallbackParams.chain, amm: fallbackParams.amm, cowAttempt: 0, cowSuccess: 0, ammAttempt: 0, ammSuccess: 1 });
              db.run('INSERT INTO matches (order_id, match_json, type) VALUES (?, ?, ?)', [orderId, JSON.stringify(ammResult), 'AMM']);
              db.run('UPDATE orders SET status = ? WHERE id = ?', ['amm', orderId]);
              db.run('INSERT INTO routing_logs (order_id, action, details) VALUES (?, ?, ?)', [orderId, 'AMM', 'Order routed to AMM']);
              resolve({ status: 'amm', ammResult });
            }).catch(reject);
          });
        }
      }).catch(reject);
    });
  });
}

module.exports = { processOrder };
