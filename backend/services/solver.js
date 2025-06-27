const { ethers } = require("ethers");
const config = require("../config");

// ✅ Check if ABIs are loaded properly
console.log("🧪 Checking ABIs:");
console.log("IntentsManager ABI loaded?", Array.isArray(config.abis.intentsManager));
console.log("SolverRouter ABI loaded?", Array.isArray(config.abis.solverRouter));

// Setup provider and signer
if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY environment variable not set');
}

const provider = new ethers.JsonRpcProvider(config.rpc.anvil);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Setup contracts with validation
async function initializeContracts() {
  try {
    console.log('📝 Initializing contracts...');
    
    if (!config.contracts.intentsManager) {
      throw new Error('IntentsManager address not configured');
    }
    if (!config.contracts.solverRouter) {
      throw new Error('SolverRouter address not configured');
    }

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

    // Verify contracts are deployed
    const intentsManagerCode = await provider.getCode(config.contracts.intentsManager);
    const solverRouterCode = await provider.getCode(config.contracts.solverRouter);

    if (intentsManagerCode === '0x') throw new Error('IntentsManager contract not deployed');
    if (solverRouterCode === '0x') throw new Error('SolverRouter contract not deployed');

    console.log('✅ Contracts initialized successfully');
    return { intentsManager, solverRouter };
  } catch (error) {
    console.error('❌ Failed to initialize contracts:', error);
    throw error;
  }
}

// Initialize contracts
let intentsManager, solverRouter;
initializeContracts().then(contracts => {
  intentsManager = contracts.intentsManager;
  solverRouter = contracts.solverRouter;
}).catch(error => {
  console.error('Failed to initialize solver service:', error);
  process.exit(1);
});

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
