require("dotenv").config();
const { startListening } = require("./services/listener");
const { matchIntents } = require("./services/matcher");
const { solveOnChain } = require("./services/solver");

// In-memory intent pool
const intentPool = [];

function start() {
  // Start listener and push new intents to intentPool
  startListening(intentPool);
  console.log("🚀 Listener started...");

  // Periodically run the matcher
  setInterval(async () => {
    const match = matchIntents(intentPool);
    if (match) {
      console.log("🔁 Match found:", match[0].id, "<->", match[1].id);
      await solveOnChain(match[0], match[1]);
    } else {
      console.log("⏳ No match found");
    }
  }, 10000); // every 10 seconds
}

start();

const { contracts, abis, rpc } = require("./config");

console.log("🔗 Contract address (IntentsManager):", contracts.intentsManager);
console.log("🔍 Number of functions in ABI:", abis.intentsManager.length);
console.log("🌐 RPC Endpoint (Sepolia):", rpc.sepolia);

