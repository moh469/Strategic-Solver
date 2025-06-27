// matches.js
const fs = require("fs");
const path = require("path");

const MATCH_LOG_FILE = path.join(__dirname, "match-log.json");

function normalizeIntent(intent) {
  return {
    intentId: Number(intent.intentId),
    tokenIn: intent.tokenIn,
    tokenOut: intent.tokenOut,
    amountIn: intent.amountIn?.toString?.() || "0",
    amountOutMin: intent.amountOutMin?.toString?.() || "0",
    chainId: Number(intent.chainId),
  };
}

function logMatch(intentA, intentB, txHash) {
  const log = {
    a: normalizeIntent(intentA),
    b: normalizeIntent(intentB),
    txHash,
    timestamp: Date.now(),
  };

  let logs = [];
  try {
    if (fs.existsSync(MATCH_LOG_FILE)) {
      logs = JSON.parse(fs.readFileSync(MATCH_LOG_FILE, "utf-8"));
    }
  } catch (e) {
    logs = [];
  }

  logs.unshift(log);
  fs.writeFileSync(MATCH_LOG_FILE, JSON.stringify(logs.slice(0, 20), null, 2));
}

function getMatchLog() {
  if (!fs.existsSync(MATCH_LOG_FILE)) return [];
  return JSON.parse(fs.readFileSync(MATCH_LOG_FILE, "utf-8"));
}

module.exports = { logMatch, getMatchLog };
