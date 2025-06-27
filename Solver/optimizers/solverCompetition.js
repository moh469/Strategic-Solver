// solverCompetition.js
// Simulate multiple solvers submitting solutions and reward the best one

const { runGlobalBatchOptimizer } = require('./integratedOptimizer');

// Example: Different solver strategies
async function greedySolver(intents) {
  // Use the original greedy optimizer
  return runOptimizerWithFreshPools(intents);
}

async function batchSolver(intents) {
  // Use the global batch optimizer
  return runGlobalBatchOptimizer(intents);
}

/**
 * Simulate multiple solvers competing to solve the batch.
 * Each solver can use a different strategy.
 * @param {Array} intents
 * @param {number} numSolvers
 * @returns {Object} winner and all solutions
 */
async function solverCompetition(intents, numSolvers = 3) {
  const strategies = [greedySolver, batchSolver, batchSolver]; // Example: 1 greedy, 2 batch
  const solutions = [];
  for (let i = 0; i < numSolvers; i++) {
    const solution = await strategies[i % strategies.length](intents);
    solutions.push({ solver: `solver${i+1}`, solution });
  }
  // Select the best solution (highest utility)
  const winner = solutions.reduce((best, curr) =>
    curr.solution.result > best.solution.result ? curr : best, solutions[0]);
  winner.reward = 'Rewarded!';
  return { winner, solutions };
}

module.exports = { solverCompetition };
