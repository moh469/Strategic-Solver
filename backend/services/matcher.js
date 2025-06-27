require("dotenv").config();
const { ethers } = require("ethers");
const config = require("../config");
const { logMatch } = require("../matches");

console.log("DEBUG MATCHER_PRIVATE_KEY (matcher.js):", process.env.MATCHER_PRIVATE_KEY, "length:", process.env.MATCHER_PRIVATE_KEY?.length);
const provider = new ethers.JsonRpcProvider(config.rpc.anvil);
const signer = new ethers.Wallet(process.env.MATCHER_PRIVATE_KEY, provider);

// Coded fallback for missing env vars (for local dev)
process.env.INTENTS_MANAGER = process.env.INTENTS_MANAGER || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
process.env.SOLVER_ROUTER = process.env.SOLVER_ROUTER || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

console.log("DEBUG IntentsManager address:", process.env.INTENTS_MANAGER);
console.log("DEBUG SolverRouter address:", process.env.SOLVER_ROUTER);
const intentsManager = new ethers.Contract(
  process.env.INTENTS_MANAGER || "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  config.abis.intentsManager,
  signer
);

const solverRouter = new ethers.Contract(
  process.env.SOLVER_ROUTER || "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  config.abis.solverRouter,
  signer
);

// ✅ Compatibility logic
function areCompatible(a, b) {
  return (
    a.sellToken === b.buyToken &&
    a.buyToken === b.sellToken &&
    a.sellAmount === b.minBuyAmount &&
    a.minBuyAmount === b.sellAmount &&
    a.chainId === b.chainId &&
    a.status === 0 &&
    b.status === 0
  );
}

// ✅ Single matcher
function findMatchForIntent(newIntent, existingIntents) {
  for (let i = 0; i < existingIntents.length; i++) {
    const existing = existingIntents[i];
    if (areCompatible(newIntent, existing)) {
      return { a: newIntent, b: existing };
    }
  }
  return null;
}

// ✅ Bulk matcher
function getAllMatches(intents) {
  const matches = [];
  const used = new Set();

  for (let i = 0; i < intents.length; i++) {
    for (let j = i + 1; j < intents.length; j++) {
      const a = intents[i];
      const b = intents[j];

      if (used.has(i) || used.has(j)) continue;

      if (areCompatible(a, b)) {
        matches.push({ a, b });
        used.add(i);
        used.add(j);
        break;
      }
    }
  }

  return matches;
}

// ✅ Executable solver

async function matchIntentsIfCompatible({ a, b }) {
  if (a.status !== 0 || b.status !== 0) return;
  if (!areCompatible(a, b)) return;

  try {
    const tx = await solverRouter.solve(a.intentId, b.intentId);
    console.log(`⚡ Matching ${a.intentId} ↔ ${b.intentId} | Tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Match executed in block ${receipt.blockNumber}`);
    logMatch(a, b, tx.hash);

    return {
      success: true,
      txHash: tx.hash,
    };
  } catch (err) {
    if (
      err.code === 'CALL_EXCEPTION' &&
      err.reason === "Matched intent not pending"
    ) {
      // 🔕 This is expected sometimes due to concurrency — skip silently
    } else {
      console.error(`❌ Failed to solve ${a.intentId} ↔ ${b.intentId}:`, err.message);
    }
    return { success: false };
  }
}
function matchIntents(intentPool) {
  const matches = getAllMatches(intentPool);
  return matches.length > 0 ? matches[0] : null;
}


// ✅ Exports
module.exports = {
  findMatchForIntent,
  getAllMatches,
  matchIntentsIfCompatible,
  matchIntents
};
