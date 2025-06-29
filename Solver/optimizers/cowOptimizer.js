// cowOptimizer.js
// Finds all pairs of intents that can be directly matched (CoW: Coincidence of Wants)
// Used by the integrated optimizer to maximize direct user-to-user swaps

/**
 * Finds all compatible intent pairs for direct matching (CoW)
 * @param {Array} intents - List of user intents (orders)
 * @returns {Array} Array of matched pairs: [{ a, b }, ...]
 */
function matchCoWs(intents) {
  const matches = [];

  // Iterate over all unique pairs of intents
  for (let i = 0; i < intents.length; i++) {
    for (let j = i + 1; j < intents.length; j++) {
      const a = intents[i];
      const b = intents[j];

      // Check if intents are compatible for direct swap
      // - a's sellToken is b's buyToken and vice versa
      // - Each side's sell amount covers the other's minimum buy amount (if specified)
      if (
        a.sellToken === b.buyToken &&
        a.buyToken === b.sellToken &&
        Number(a.sellAmount) >= Number(b.minBuyAmount || 0) &&
        Number(b.sellAmount) >= Number(a.minBuyAmount || 0)
      ) {
        matches.push({ a, b });
        console.log(`✅ CoW match found: ${a.userAddress} ↔ ${b.userAddress}`);
        console.log(`   ${a.sellAmount} ${a.sellToken} ↔ ${b.sellAmount} ${b.sellToken}`);
      }
    }
  }

  console.log("🔎 Matches found:", matches.length);
  return matches;
}

module.exports = matchCoWs; // Export for use in the optimizer
