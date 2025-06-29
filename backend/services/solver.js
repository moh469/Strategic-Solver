const { ethers } = require("ethers");
const config = require("../config");
const { runGlobalBatchOptimizer } = require("../../Solver/optimizers/integratedOptimizer");

// Define SolverService class
class SolverService {
    constructor(provider, contracts) {
        this.provider = provider;
        this.contracts = contracts;
        console.log('🏗️ SolverService initialized with contracts:', 
            Object.keys(contracts).join(', '));
    }

    async matchIntents(intents) {
        try {
            return await runGlobalBatchOptimizer(intents);
        } catch (error) {
            console.error('❌ Error matching intents:', error);
            throw error;
        }
    }
}

// ✅ Check if ABIs are loaded properly
console.log("🧪 Checking ABIs:");
console.log("IntentsManager ABI loaded?", Array.isArray(config.abis.intentsManager));
console.log("SolverRouter ABI loaded?", Array.isArray(config.abis.solverRouter));

// Setup contracts with validation
const IntentBridgeService = require('./intent-bridge');

async function initializeContracts() {
  try {
    console.log('📝 Initializing contracts...');

    // Dynamically select the active chain ID
    const activeChainId = parseInt(process.env.CHAIN_ID, 10);
    if (!activeChainId || !config.allContracts[activeChainId]) {
      throw new Error(`Unsupported or missing chain ID: ${activeChainId}`);
    }

    const chainConfig = config.allContracts[activeChainId];

    console.log(`[DEBUG] Active Chain ID: ${activeChainId}`);
    console.log(`[DEBUG] IntentsManager Address: ${chainConfig.intentsManager}`);

    if (!chainConfig.intentsManager) {
      throw new Error(`IntentsManager address not configured for chain ID: ${activeChainId}`);
    }
    if (!chainConfig.solverRouter) {
      throw new Error(`SolverRouter address not configured for chain ID: ${activeChainId}`);
    }

    console.log(`[DEBUG] IntentsManager ABI:`, config.abis.intentsManager);

    const provider = new ethers.JsonRpcProvider(config.rpc[activeChainId]);

    // Test provider connection
    try {
      const network = await provider.getNetwork();
      console.log(`[DEBUG] Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    } catch (providerError) {
      throw new Error(`Failed to connect to provider: ${providerError.message}`);
    }

    // Log the exact value of the address before initialization
    console.log(`[DEBUG] Address passed to ethers.Contract: ${chainConfig.intentsManager}`);

    const intentsManager = new ethers.Contract(
      chainConfig.intentsManager,
      config.abis.intentsManager,
      provider
    );

    console.log(`[DEBUG] IntentsManager Contract Initialized: ${intentsManager.address}`);

    const solverRouter = new ethers.Contract(
      chainConfig.solverRouter,
      config.abis.solverRouter,
      provider
    );

    const intentBridge = new IntentBridgeService(provider);
    await intentBridge.initializeBridges();

    // Verify contracts are deployed
    const intentsManagerCode = await provider.getCode(chainConfig.intentsManager);
    const solverRouterCode = await provider.getCode(chainConfig.solverRouter);

    if (intentsManagerCode === '0x') throw new Error('IntentsManager contract not deployed');
    if (solverRouterCode === '0x') throw new Error('SolverRouter contract not deployed');

    console.log('✅ Contracts initialized successfully');
    return { intentsManager, solverRouter, intentBridge };
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
  SolverService,
  initializeContracts
};
