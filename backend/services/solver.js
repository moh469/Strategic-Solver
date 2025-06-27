const { ethers } = require("ethers");
const config = require("../config");

// ✅ Check if ABIs are loaded properly
console.log("🧪 Checking ABIs:");
console.log("IntentsManager ABI loaded?", Array.isArray(config.abis.intentsManager));
console.log("SolverRouter ABI loaded?", Array.isArray(config.abis.solverRouter));

// Setup provider and signer
const provider = new ethers.JsonRpcProvider(config.rpc.sepolia); // Example for Sepolia
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Setup contracts
const intentsManager = new ethers.Contract(
  config.contracts.intentsManager,
  config.abis.intentsManager,
  signer
);

const solverRouter = new ethers.Contract(
  config.contracts.solverRouter,
  config.abis.solverRouter,
  signer
);

// Store intents in memory (DB recommended)
const pendingIntents = [];

function isCoWMatch(intentA, intentB) {
  return (
    intentA.tokenIn === intentB.tokenOut &&
    intentA.tokenOut === intentB.tokenIn &&
    intentA.amountIn === intentB.amountOut // You can loosen this for partial match logic
  );
}

// Utility calculation based on the paper's simplified model
function calculateUtility(intent, pb) {
  const { amountIn, amountOut, exchangeRate, type } = intent;
  if (type === "limitBuy") {
    return (amountOut * exchangeRate - amountIn) * pb; // Buy utility
  } else {
    return (amountIn - amountOut / exchangeRate) * pb; // Sell utility
  }
}

async function trySolve(intentId) {
  const newIntent = await intentsManager.getIntent(intentId);
  console.log("🧠 Received new intent:", newIntent);

  // 1. Try CoW match
  for (const intent of pendingIntents) {
    if (isCoWMatch(newIntent, intent)) {
      console.log("✅ CoW match found!");

      const tx = await solverRouter.solve(newIntent.id, intent.id);
      await tx.wait();
      console.log("🚀 CoW executed successfully");

      return;
    }
  }

  // 2. No CoW found — add to queue for future or CFMM fallback
  pendingIntents.push(newIntent);
  console.log("🕗 No CoW match. Intent saved for CFMM fallback.");
}

module.exports = {
  trySolve,
};
