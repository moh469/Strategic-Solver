const { ethers } = require("ethers");

const { parseUnits } = require("ethers");

function isMatch(a, b) {
  try {
    if (!a.amountIn || !a.amountOutMin || !b.amountIn || !b.amountOutMin) return false;

    const amountInA = parseUnits(a.amountIn.toString(), 18);
    const amountOutMinA = parseUnits(a.amountOutMin.toString(), 18);
    const amountInB = parseUnits(b.amountIn.toString(), 18);
    const amountOutMinB = parseUnits(b.amountOutMin.toString(), 18);

    return (
      a.tokenIn === b.tokenOut &&
      a.tokenOut === b.tokenIn &&
      amountInA === amountOutMinB &&
      amountInB === amountOutMinA
    );
  } catch (e) {
    console.error("❌ Matching error:", e.message);
    return false;
  }
}


function findMatchForIntent(newIntent, allIntents) {
  for (const existing of allIntents) {
    if (existing.intentId === newIntent.intentId || existing.status !== 0) continue;
    if (isMatch(newIntent, existing)) {
      return { a: newIntent, b: existing };
    }
  }
  return null;
}

module.exports = { isMatch, findMatchForIntent };
