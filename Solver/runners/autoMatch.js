// autoMatch.js
const fetch = require("node-fetch");
const { matchIntentsIfCompatible } = require("../../backend/services/matcher.js");

const MATCH_INTERVAL_MS = 10000; // every 10 seconds
const seenPairs = new Set(); // 🧠 Avoid retrying same pairs

const runAutoMatch = async () => {
  try {
    const res = await fetch("http://localhost:3001/api/intents");
    const intents = await res.json();

    const pending = intents.filter(i => i.status === 0);
    const matchedSet = new Set(); // ✅ Prevent duplicate matches in a run

    for (let i = 0; i < pending.length; i++) {
      const intentA = pending[i];
      if (matchedSet.has(intentA.intentId)) continue;

      for (let j = i + 1; j < pending.length; j++) {
        const intentB = pending[j];
        if (matchedSet.has(intentB.intentId)) continue;

        const key = `${Math.min(intentA.intentId, intentB.intentId)}-${Math.max(intentA.intentId, intentB.intentId)}`;
        if (seenPairs.has(key)) continue;

        seenPairs.add(key);

        const result = await matchIntentsIfCompatible({ a: intentA, b: intentB });

        if (result?.success) {
          console.log(`🎯 Auto-matched ID ${intentA.intentId} ↔ ${intentB.intentId}`);
          console.log(`🔗 Tx: https://sepolia.etherscan.io/tx/${result.txHash}`);
          matchedSet.add(intentA.intentId);
          matchedSet.add(intentB.intentId);
          break; // move to next intentA
        }
      }
    }
  } catch (err) {
    console.error("❌ Auto-match error:", err.message);
  }
};

setInterval(runAutoMatch, MATCH_INTERVAL_MS);
console.log("⏱️ Auto-matcher running every", MATCH_INTERVAL_MS / 1000, "seconds...");
