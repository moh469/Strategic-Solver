require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ethers } = require("ethers");
const config = require("./config");
const matchCoWs = require("../Solver/optimizers/cowOptimizer.js");
const { runGlobalBatchOptimizer } = require("../Solver/optimizers/integratedOptimizer.js");
const { bridgeService, initializeBridges, forwardIntent } = require("./services/crosschain");
const { SolverService, initializeContracts } = require("./services/solver");


const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Simple test endpoint for frontend debugging
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!", timestamp: Date.now() });
});

// Test CoW matching with sample intents
app.get("/api/test-cow", async (req, res) => {
  try {
    const { getSampleCoWIntents } = require("../Solver/optimizers/multiChainPools.js");
    const sampleIntents = getSampleCoWIntents();
    
    console.log("🧪 Testing CoW matching with sample intents...");
    
    // Test CoW matching
    const matches = matchCoWs(sampleIntents);
    
    // Process through integrated AI/ML optimizer for comprehensive analysis
    const executions = await runGlobalBatchOptimizer(sampleIntents);
    
    res.json({
      message: "CoW matching test completed",
      sampleIntents: sampleIntents.length,
      cowMatches: matches.length,
      matches: matches,
      executions: executions,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in CoW test:', error);
    res.status(500).json({ 
      error: 'Failed to test CoW matching',
      details: error.message
    });
  }
});

// Initialize provider with active chain RPC
const provider = new ethers.JsonRpcProvider(config.rpc[config.activeChainId]);
let signer;

// Endpoint to verify and process signed data
app.post("/verify-signature", async (req, res) => {
    try {
        const { message, signature } = req.body;
        if (!message || !signature) {
            return res.status(400).json({ error: "Missing message or signature" });
        }

        // Recover the address from the signature
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        console.log("Recovered address:", recoveredAddress);

        // Load signer with recovered address
        signer = new ethers.Wallet(recoveredAddress, provider);
        
        // Update contracts with new signer
        await setupContracts(signer);
        console.log("📝 Contracts updated with signer:", recoveredAddress);

        // Process the transaction or intent here
        res.json({ success: true, recoveredAddress });
    } catch (error) {
        console.error("Error verifying signature:", error);
        res.status(500).json({ error: error.message });
    }
});

// 🔌 Initialize contract variables
let intentsManager;
let solverRouter;

// Function to initialize contracts with signer
async function setupContracts(signer) {
    const intentsManagerAddress = process.env.INTENTS_MANAGER || config.contracts.intentsManager;
    const solverRouterAddress = process.env.SOLVER_ROUTER || config.contracts.solverRouter;

        // Use fallback addresses if needed
    const finalIntentsManagerAddress = intentsManagerAddress || "0xMockIntentsManager";
    const finalSolverRouterAddress = solverRouterAddress || "0xMockSolverRouter";
    
    console.log("Using contract addresses:", {
        intentsManager: finalIntentsManagerAddress,
        solverRouter: finalSolverRouterAddress
    });

    console.log("Setting up contracts with addresses:", {
        intentsManager: intentsManagerAddress,
        solverRouter: solverRouterAddress
    });

    intentsManager = new ethers.Contract(
        finalIntentsManagerAddress,
        config.abis.intentsManager,
        signer || provider
    );

    solverRouter = new ethers.Contract(
        finalSolverRouterAddress,
        config.abis.solverRouter,
        signer || provider
    );

    return { intentsManager, solverRouter };
}

// 💱 Token address mapping
const TOKEN_ADDRESSES = {
  Sepolia: {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Updated to match frontend
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Updated to match frontend
    DAI:  "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", // Added DAI
    ETH:  "0x0000000000000000000000000000000000000000", // Native Sepolia ETH
    USD:  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USD represented by USDC
    LINK: "0x8a78192AE2D6a59DdDA2237f9123fB7213FfEe82", // Keep existing LINK
  },
  Fuji: {
    USDC: "0x5425890298aed601595a70AB815c96711a31Bc65",
    WETH: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3", 
    DAI:  "0x51BC2DfB9D12d9dB50C855A5330fBA0faF761D15",
    ETH:  "0x0000000000000000000000000000000000000000", // Native AVAX
    USD:  "0x5425890298aed601595a70AB815c96711a31Bc65", // USD represented by USDC
  },
  // Legacy mapping for backward compatibility
  Polygon: {
    USDC: "0xdeB02C0e9a44c7609b2272AC27c38511bE61E23b",
    ETH: "0x02454B8242bD2C69d6F74D9DB81540Fe7ac01B25",
    LINK: "0x15cC3B98ebc572FC93C6C8E89e48DB28678D2E7e",
  },
};

// Helper function to convert token address back to symbol
function getTokenSymbol(address, chainId) {
  const chainName = chainId === 11155111 ? 'Sepolia' : 'Fuji';
  const tokens = TOKEN_ADDRESSES[chainName];
  
  for (const [symbol, tokenAddress] of Object.entries(tokens)) {
    if (tokenAddress.toLowerCase() === address.toLowerCase()) {
      return symbol;
    }
  }
  
  // Return truncated address if symbol not found
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Helper function to find matches in intent pool using integrated optimizer
async function getAllMatches(intentPool) {
  if (intentPool.length === 0) return [];
  
  // Use the full AI/ML integrated optimizer for comprehensive execution plans
  const executions = await runGlobalBatchOptimizer(intentPool);
  
  // Convert execution plans back to match format for compatibility
  const matches = [];
  for (const execution of executions) {
    if (execution.requiresCrossChain) {
      // This is a cross-chain execution, not a direct match
      matches.push({
        type: 'cross-chain',
        intent: execution.intent,
        targetChain: execution.targetChain,
        expectedValue: execution.expectedValue
      });
    }
  }
  
  return matches;
}

// Initialize solver service and contracts
let solverService;
async function initializeSolver() {
    try {
        // Initialize contracts with provider (read-only mode until signer is available)
        const contracts = await setupContracts(provider);
        console.log("� Contracts initialized in read-only mode");

        // Initialize solver service with provider for now
        solverService = new SolverService(provider, contracts);
        console.log('🚀 Solver service initialized');
    } catch (error) {
        console.error("Failed to initialize solver:", error);
        process.exit(1);
    }
}

// Run initialization
initializeSolver().catch(console.error);

// Persistent intent pool for CoW matching
const intentPool = [];

// Initialize with some sample intents for initial testing
const sampleIntents = [
  // Alice wants to sell ETH for USD
  {
    id: 'sample-alice-1',
    chainId: 11155111,
    sellToken: 'ETH',
    buyToken: 'USD',
    sellAmount: '0.5',
    minBuyAmount: '1200',
    userAddress: '0xAlice123456789',
    deadline: Date.now() + 24 * 3600000, // 24 hours from now
    sellTokenAddress: '0x0000000000000000000000000000000000000000',
    buyTokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    isNativeETH: true,
    submittedAt: Date.now(),
    status: 'pending'
  },
  // Bob wants to sell USD for ETH (perfect match for Alice)
  {
    id: 'sample-bob-2',
    chainId: 11155111,
    sellToken: 'USD',
    buyToken: 'ETH',
    sellAmount: '1300',
    minBuyAmount: '0.48',
    userAddress: '0xBob987654321',
    deadline: Date.now() + 24 * 3600000,
    sellTokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    buyTokenAddress: '0x0000000000000000000000000000000000000000',
    isNativeETH: false,
    submittedAt: Date.now(),
    status: 'pending'
  }
];

// Add sample intents to the pool
intentPool.push(...sampleIntents);

console.log(`🎭 Initialized intent pool with ${intentPool.length} sample intents for testing`);

// Intent pool management functions
function addIntentToPool(intent) {
  const intentWithTimestamp = {
    ...intent,
    id: intent.id || `intent-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    submittedAt: Date.now(),
    deadline: intent.deadline || (Date.now() + 24 * 3600000), // 24 hours from now if no deadline provided
    status: 'pending'
  };
  
  intentPool.push(intentWithTimestamp);
  console.log(`➕ Added intent to pool: ${intentWithTimestamp.id} (Pool size: ${intentPool.length})`);
  return intentWithTimestamp;
}

function removeIntentFromPool(intentId) {
  const index = intentPool.findIndex(intent => intent.id === intentId);
  if (index !== -1) {
    const removed = intentPool.splice(index, 1)[0];
    console.log(`➖ Removed intent from pool: ${intentId} (Pool size: ${intentPool.length})`);
    return removed;
  }
  return null;
}

function markIntentAsMatched(intentId, matchInfo) {
  const intent = intentPool.find(intent => intent.id === intentId);
  if (intent) {
    intent.status = 'matched';
    intent.matchedAt = Date.now();
    intent.matchInfo = matchInfo;
    console.log(`✅ Marked intent as matched: ${intentId}`);
  }
}

function getPendingIntents() {
  // Filter out expired intents and return only pending ones
  const now = Date.now();
  return intentPool.filter(intent => 
    intent.status === 'pending' && 
    intent.deadline > now
  );
}

function cleanupExpiredIntents() {
  const now = Date.now();
  const initialLength = intentPool.length;
  const activeIntents = intentPool.filter(intent => intent.deadline > now);
  
  if (activeIntents.length !== initialLength) {
    intentPool.length = 0;
    intentPool.push(...activeIntents);
    console.log(`🧹 Cleaned up expired intents. Pool size: ${initialLength} → ${intentPool.length}`);
  }
}

// Clean up expired intents every 5 minutes
setInterval(cleanupExpiredIntents, 5 * 60 * 1000);

// Intent submission endpoint - Auto-queue and settle
app.post("/api/submit-intent", async (req, res) => {
  try {
    const intent = req.body;
    console.log(`📝 Received new intent:`, intent);

    // Validate intent
    if (!intent.chainId || !intent.sellToken || !intent.buyToken) {
      return res.status(400).json({ 
        error: 'Invalid intent format' 
      });
    }

    // Convert token symbols to addresses
    const chainName = intent.chainId === 11155111 ? 'Sepolia' : 'Fuji';
    const sellTokenAddress = TOKEN_ADDRESSES[chainName]?.[intent.sellToken];
    const buyTokenAddress = TOKEN_ADDRESSES[chainName]?.[intent.buyToken];

    if (!sellTokenAddress || !buyTokenAddress) {
      return res.status(400).json({ 
        error: `Unsupported token on chain ${chainName}. Sell: ${intent.sellToken}, Buy: ${intent.buyToken}` 
      });
    }

    // Create intent with token addresses
    const processedIntent = {
      ...intent,
      sellTokenAddress,
      buyTokenAddress,
      isNativeETH: intent.sellToken === 'ETH' || sellTokenAddress === '0x0000000000000000000000000000000000000000'
    };

    console.log(`📝 Processed intent with addresses:`, processedIntent);

    // AUTOMATICALLY QUEUE THE INTENT
    const intentInPool = addIntentToPool(processedIntent);
    console.log(`🔄 Intent automatically queued for optimization: ${intentInPool.id}`);
    console.log(`📊 Current pool status: ${intentPool.length} total, ${getPendingIntents().length} pending`);
    
    // TRIGGER IMMEDIATE SETTLEMENT OPTIMIZATION
    console.log(`🎯 Triggering immediate settlement optimization...`);
    setTimeout(() => performAutomaticSettlement(), 100); // Run after 100ms to ensure intent is in pool
    
    // Return immediate response that intent is queued and being optimized
    res.json({
      status: 'success',
      result: {
        status: 'queued',
        type: 'automatic',
        message: 'Intent successfully queued and being optimized automatically',
        intentId: intentInPool.id,
        queuePosition: getPendingIntents().length,
        optimizationStages: [
          'Stage 1: CoW Matching (checking for direct user matches)',
          'Stage 2: CFMM/Linear Programming (pool routing optimization)', 
          'Stage 3: ElizaOS AI Enhancement (parameter optimization)'
        ],
        nextCheck: 'Settlement will occur automatically within 30 seconds'
      }
    });

  } catch (error) {
    console.error('Error processing intent:', error);
    res.status(500).json({ 
      error: 'Failed to process intent',
      details: error.message
    });
  }
});

// Alternative endpoint for submit-intent (same functionality)
app.post("/submit-intent", async (req, res) => {
  try {
    const intent = req.body;
    console.log(`📝 Received new intent via /submit-intent:`, intent);

    // Validate intent
    if (!intent.chainId || !intent.sellToken || !intent.buyToken) {
      return res.status(400).json({ 
        error: 'Invalid intent format' 
      });
    }

    // Verify MetaMask signature if provided
    if (intent.signature && intent.signedBy) {
      try {
        const { signature, signedBy, ...intentData } = intent;
        const message = JSON.stringify(intentData);
        
        // Verify the signature
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== signedBy.toLowerCase()) {
          return res.status(400).json({ 
            error: 'Invalid signature' 
          });
        }
        
        if (recoveredAddress.toLowerCase() !== intent.userAddress.toLowerCase()) {
          return res.status(400).json({ 
            error: 'Signature does not match user address' 
          });
        }
        
        console.log(`✅ Signature verified for user: ${recoveredAddress}`);
      } catch (err) {
        console.error('❌ Signature verification failed:', err);
        return res.status(400).json({ 
          error: 'Signature verification failed' 
        });
      }
    } else {
      console.log(`⚠️ No signature provided - processing intent without verification`);
    }

    // Convert token symbols to addresses
    const chainName = intent.chainId === 11155111 ? 'Sepolia' : 'Fuji';
    const sellTokenAddress = TOKEN_ADDRESSES[chainName]?.[intent.sellToken];
    const buyTokenAddress = TOKEN_ADDRESSES[chainName]?.[intent.buyToken];

    if (!sellTokenAddress || !buyTokenAddress) {
      return res.status(400).json({ 
        error: `Unsupported token on chain ${chainName}. Sell: ${intent.sellToken}, Buy: ${intent.buyToken}` 
      });
    }

    // Create intent with token addresses
    const processedIntent = {
      ...intent,
      sellTokenAddress,
      buyTokenAddress,
      isNativeETH: intent.sellToken === 'ETH' || sellTokenAddress === '0x0000000000000000000000000000000000000000'
    };

    // AUTOMATICALLY QUEUE THE INTENT
    const intentInPool = addIntentToPool(processedIntent);
    console.log(`🔄 Intent automatically queued for optimization: ${intentInPool.id}`);
    
    // TRIGGER IMMEDIATE SETTLEMENT OPTIMIZATION
    setTimeout(() => performAutomaticSettlement(), 100);
    
    // Return immediate response that intent is queued and being optimized
    res.json({
      status: 'success',
      result: {
        status: 'queued',
        type: 'automatic',
        message: 'Intent successfully queued and being optimized automatically',
        intentId: intentInPool.id,
        queuePosition: getPendingIntents().length,
        optimizationStages: [
          'Stage 1: CoW Matching (checking for direct user matches)',
          'Stage 2: CFMM/Linear Programming (pool routing optimization)', 
          'Stage 3: ElizaOS AI Enhancement (parameter optimization)'
        ],
        nextCheck: 'Settlement will occur automatically within 30 seconds'
      }
    });

  } catch (error) {
    console.error('Error processing intent:', error);
    res.status(500).json({ 
      error: 'Failed to process intent',
      details: error.message
    });
  }
});

// Get intent pool status endpoint
app.get("/api/intent-pool", (req, res) => {
  try {
    const pendingIntents = getPendingIntents();
    const matchedIntents = intentPool.filter(intent => intent.status === 'matched');
    
    res.json({
      status: 'success',
      pool: {
        totalIntents: intentPool.length,
        pendingIntents: pendingIntents.length,
        matchedIntents: matchedIntents.length,
        pending: pendingIntents.map(intent => ({
          id: intent.id,
          sellToken: intent.sellToken,
          buyToken: intent.buyToken,
          sellAmount: intent.sellAmount,
          minBuyAmount: intent.minBuyAmount,
          userAddress: intent.userAddress.substr(0, 10) + '...',
          chainId: intent.chainId,
          submittedAt: new Date(intent.submittedAt).toISOString(),
          timeRemaining: Math.max(0, intent.deadline - Date.now())
        })),
        recentMatches: matchedIntents.slice(-10).reverse().map(intent => ({
          id: intent.id,
          sellToken: intent.sellToken,
          buyToken: intent.buyToken,
          userAddress: intent.userAddress.substr(0, 10) + '...',
          matchedAt: new Date(intent.matchedAt).toISOString(),
          counterparty: intent.matchInfo?.counterparty?.substr(0, 10) + '...'
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching intent pool:', error);
    res.status(500).json({ error: 'Failed to fetch intent pool' });
  }
});

// Get sample intents pool endpoint for testing (deprecated - use intent-pool instead)
app.get("/api/sample-intents", (req, res) => {
  try {
    const pendingIntents = getPendingIntents();
    res.json({
      status: 'success',
      message: 'This endpoint is deprecated. Use /api/intent-pool instead.',
      totalSampleIntents: intentPool.length,
      activeSampleIntents: pendingIntents.length,
      intents: pendingIntents.map(intent => ({
        id: intent.id,
        sellToken: intent.sellToken,
        buyToken: intent.buyToken,
        sellAmount: intent.sellAmount,
        minBuyAmount: intent.minBuyAmount,
        userAddress: intent.userAddress,
        chainId: intent.chainId
      }))
    });
  } catch (error) {
    console.error('Error fetching sample intents:', error);
    res.status(500).json({ error: 'Failed to fetch sample intents' });
  }
});

// Get intent status endpoint
app.get("/intent/:intentId", async (req, res) => {
  try {
    const { intentId } = req.params;
    
    // Since we removed matches.js, return a simple response
    res.status(404).json({ 
      error: 'Intent tracking not implemented. Use the integrated optimizer for intent processing.' 
    });
  } catch (error) {
    console.error('Error fetching intent status:', error);
    res.status(500).json({ 
      error: 'Failed to fetch intent status',
      details: error.message 
    });
  }
});

// 📤 Get All Intents
app.get("/api/intents", async (req, res) => {
  try {
    const latestIntentId = await intentsManager.nextIntentId();
    const intents = [];

    for (let i = 0; i < Number(latestIntentId); i++) {
      const intent = await intentsManager.getIntent(i);
      intents.push({
        intentId: i,
        sellToken: getTokenSymbol(intent.tokenIn, Number(intent.chainId)),
        buyToken: getTokenSymbol(intent.tokenOut, Number(intent.chainId)),
        sellTokenAddress: intent.tokenIn, // Keep addresses for internal use
        buyTokenAddress: intent.tokenOut,
        sellAmount: intent.amountIn.toString(), // Keep as string to preserve precision
        minBuyAmount: intent.minAmountOut.toString(),
        chainId: Number(intent.chainId),
        status: Number(intent.status),
      });
    }

    res.json(intents);
  } catch (err) {
    console.error("❌ Failed to fetch intents:", err);
    res.status(500).json({ error: "Failed to fetch intents", details: err.toString() });
  }
});

// 🔁 Get Matches (pair logic)
app.get("/api/matches", async (req, res) => {
  try {
    const latestIntentId = await intentsManager.nextIntentId();
    const intentPool = [];

    for (let i = 0; i < Number(latestIntentId); i++) {
      const intent = await intentsManager.getIntent(i);
      intentPool.push({
        intentId: i,
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: intent.amountIn.toString(),
        amountOutMin: intent.minAmountOut.toString(),
        chainId: Number(intent.chainId),
        status: Number(intent.status),
      });
    }

    const matches = getAllMatches(intentPool);
    const safeMatches = matches.map(({ a, b }) => ({
      a: { ...a, amountIn: a.amountIn.toString(), amountOutMin: a.amountOutMin.toString() },
      b: { ...b, amountIn: b.amountIn.toString(), amountOutMin: b.amountOutMin.toString() }
    }));

    res.json(safeMatches);
  } catch (err) {
    console.error("❌ Failed to get matches:", err);
    res.status(500).json({ error: "Failed to get matches", details: err.toString() });
  }
});


app.get("/api/logged-matches", (req, res) => {
  // Since we removed matches.js, return empty array
  res.json([]);
});


// 🌉 Cross-chain Routes
app.post("/api/cross-chain/forward-intent", async (req, res) => {
  try {
    const { intentId, targetChainId } = req.body;
    
    if (!intentId || !targetChainId) {
      return res.status(400).json({ error: "Missing intentId or targetChainId" });
    }

    const result = await forwardIntent(intentId, Number(targetChainId));
    res.json({
      status: "success",
      messageId: result.messageId,
      txHash: result.txHash
    });
  } catch (error) {
    console.error("❌ Failed to forward intent:", error);
    res.status(500).json({ error: error.toString() });
  }
});

app.get("/api/cross-chain/fee", async (req, res) => {
  try {
    const { targetChainId, intentId } = req.query;
    
    if (!targetChainId || !intentId) {
      return res.status(400).json({ error: "Missing targetChainId or intentId" });
    }

    const sourceChainId = Number(process.env.HOME_CHAIN_ID || "11155111"); // Default to Sepolia
    const fee = await bridgeService.getCCIPFee(sourceChainId, Number(targetChainId), intentId);
    
    res.json({
      fee: fee.toString(),
      formattedFee: ethers.formatEther(fee)
    });
  } catch (error) {
    console.error("❌ Failed to get CCIP fee:", error);
    res.status(500).json({ error: error.toString() });
  }
});

// Initialize cross-chain bridges
initializeBridges().catch(console.error);

// Endpoint to update contract addresses after MetaMask deployment
app.post("/api/update-contract-addresses", async (req, res) => {
    try {
        const { addresses } = req.body;
        
        if (!addresses) {
            return res.status(400).json({ error: "Missing addresses" });
        }

        console.log("📝 Updating contract addresses:", addresses);
        
        // Update environment variables (in memory)
        process.env.INTENTS_MANAGER_ADDRESS = addresses.IntentsManager;
        process.env.COW_MATCHER_ADDRESS = addresses.CoWMatcher;
        process.env.CFMM_ADAPTER_ADDRESS = addresses.CFMMAdapter;
        process.env.CROSS_CHAIN_BRIDGE_ADDRESS = addresses.CrossChainIntentBridge;
        process.env.SOLVER_ROUTER_ADDRESS = addresses.SolverRouter;

        // Reinitialize contracts with new addresses
        try {
            const { reinitializeContracts } = require("./services/solver");
            const success = await reinitializeContracts();
            if (success) {
                console.log("✅ Contracts reinitialized with new addresses");
            } else {
                console.warn("⚠️ Contract reinitialization failed");
            }
        } catch (contractError) {
            console.warn("⚠️ Contract reinitialization failed:", contractError.message);
        }

        res.json({ 
            success: true, 
            message: "Contract addresses updated successfully",
            addresses 
        });
    } catch (error) {
        console.error("Error updating contract addresses:", error);
        res.status(500).json({ error: error.message });
    }
});

// Add contracts status endpoint
app.get("/api/contracts/status", (req, res) => {
    try {
        const { getContractsStatus } = require("./services/solver");
        const status = getContractsStatus();
        res.json({ 
            contractsReady: status.initialized,
            contracts: status.contracts,
            message: status.initialized ? "Contracts are ready" : "Contracts need to be deployed"
        });
    } catch (error) {
        res.json({ 
            contractsReady: false,
            contracts: {},
            message: "Contracts not initialized",
            error: error.message
        });
    }
});

// Get optimization pipeline info endpoint
app.get("/api/optimization-info", (req, res) => {
  try {
    res.json({
      status: 'success',
      pipeline: {
        name: 'Multi-Stage AI/ML Optimization',
        stages: [
          {
            stage: 1,
            name: 'CoW Matching',
            description: 'Direct user-to-user intent matching',
            features: ['Zero slippage', 'Minimal gas costs', 'Instant execution'],
            priority: 'Highest'
          },
          {
            stage: 2,
            name: 'CFMM/Linear Programming',
            description: 'Pool routing optimization for unmatched intents',
            features: ['Multi-chain routing', 'Liquidity optimization', 'Cost minimization'],
            priority: 'Medium'
          },
          {
            stage: 3,
            name: 'ElizaOS AI Enhancement',
            description: 'AI parameter optimization and continuous learning',
            features: ['Market adaptation', 'Risk scoring', 'Parameter tuning'],
            priority: 'Continuous'
          }
        ],
        currentSettings: {
          maxSlippage: '3%',
          minValueImprovement: '2%',
          ccipOverhead: '1.2x',
          elizaLearningRate: '0.01'
        }
      }
    });
  } catch (error) {
    console.error('Error fetching optimization info:', error);
    res.status(500).json({ error: 'Failed to fetch optimization info' });
  }
});

// Enhanced automatic settlement function for all optimization paths
async function performAutomaticSettlement() {
  try {
    const pendingIntents = getPendingIntents();
    
    if (pendingIntents.length === 0) {
      console.log("🔍 Auto-settlement check: No pending intents");
      return;
    }
    
    console.log(`🔍 Auto-settlement check: Analyzing ${pendingIntents.length} pending intents...`);
    console.log(`🎯 Running Multi-Stage Optimization Pipeline:`);
    console.log(`   Stage 1: CoW Matching (direct user-to-user)`);
    console.log(`   Stage 2: CFMM/Linear Programming (pool routing)`);
    console.log(`   Stage 3: ElizaOS AI Optimization (parameter tuning)`);
    
    // Run the complete multi-stage optimizer to find best execution paths
    const executions = await runGlobalBatchOptimizer(pendingIntents);
    
    let cowSettled = 0;
    let poolSettled = 0;
    let crossChainSettled = 0;
    let totalSettled = 0;
    
    // Process all executions and settle based on best optimization path
    for (const execution of executions) {
      if (!execution.intent || !execution.executionPlan) continue;
      
      const intent = execution.intent;
      const plan = execution.executionPlan;
      
      // Skip if already matched or has error
      if (intent.status === 'matched' || plan.error) continue;
      
      let settlementType = 'unknown';
      let settlementInfo = {
        matchedAt: Date.now(),
        autoSettled: true,
        executionPlan: plan,
        elizaMetrics: execution.elizaMetrics,
        marketContext: execution.marketContext
      };
      
      // STAGE 1: CoW Settlement (Highest Priority)
      if (plan.matchType === 'CoW') {
        settlementType = 'CoW';
        settlementInfo.type = 'CoW';
        settlementInfo.counterparty = plan.counterparty;
        settlementInfo.expectedOutput = plan.estimatedOutput;
        settlementInfo.totalCost = plan.totalCost;
        cowSettled++;
        
        console.log(`✅ Auto-settled via CoW: ${intent.userAddress} ↔ ${plan.counterparty}`);
        console.log(`   Trade: ${intent.sellAmount} ${intent.sellToken} → ${plan.estimatedOutput} ${intent.buyToken}`);
      }
      
      // STAGE 2: CFMM/Pool Settlement (Medium Priority)
      else if (execution.pool && plan.estimatedOutput > 0) {
        settlementType = execution.requiresCrossChain ? 'cross-chain-pool' : 'local-pool';
        settlementInfo.type = settlementType;
        settlementInfo.pool = execution.pool;
        settlementInfo.targetChain = execution.targetChain;
        settlementInfo.expectedOutput = plan.estimatedOutput;
        settlementInfo.totalCost = plan.totalCost;
        
        if (execution.requiresCrossChain) {
          crossChainSettled++;
          console.log(`✅ Auto-settled via Cross-Chain Pool: ${intent.userAddress}`);
          console.log(`   Route: ${intent.chainId} → ${execution.targetChain} via ${execution.pool.id}`);
        } else {
          poolSettled++;
          console.log(`✅ Auto-settled via Local Pool: ${intent.userAddress}`);
          console.log(`   Pool: ${execution.pool.id} (${execution.pool.tokens.join('/')})`)
        }
        console.log(`   Trade: ${intent.sellAmount} ${intent.sellToken} → ${plan.estimatedOutput} ${intent.buyToken}`);
        console.log(`   Total Cost: ${plan.totalCost} • ElizaOS Confidence: ${execution.elizaMetrics?.confidence || 'N/A'}`);
      }
      
      // STAGE 3: ElizaOS Enhanced Settlement (Parameter Optimization)
      else if (execution.elizaMetrics && execution.elizaMetrics.confidence > 0.5) {
        settlementType = 'eliza-optimized';
        settlementInfo.type = 'eliza-optimized';
        settlementInfo.confidence = execution.elizaMetrics.confidence;
        settlementInfo.riskScore = execution.elizaMetrics.riskScore;
        settlementInfo.suggestion = 'ElizaOS suggests waiting for better market conditions';
        
        console.log(`🧠 ElizaOS optimization applied to: ${intent.userAddress}`);
        console.log(`   Confidence: ${execution.elizaMetrics.confidence} • Risk: ${execution.elizaMetrics.riskScore}`);
        console.log(`   Action: Keeping in queue with optimized parameters`);
        
        // Update intent with ElizaOS optimizations but keep in queue
        intent.elizaOptimized = true;
        intent.elizaMetrics = execution.elizaMetrics;
        continue; // Don't mark as settled, keep optimizing
      }
      
      // Mark intent as settled with appropriate settlement info
      if (settlementType !== 'unknown') {
        markIntentAsMatched(intent.id || intent.userAddress, settlementInfo);
        totalSettled++;
      }
    }
    
    // Summary logging
    if (totalSettled > 0) {
      console.log(`🎯 Auto-settlement Summary:`);
      console.log(`   CoW Matches: ${cowSettled}`);
      console.log(`   Local Pool Routes: ${poolSettled}`);
      console.log(`   Cross-Chain Routes: ${crossChainSettled}`);
      console.log(`   Total Settled: ${totalSettled}`);
      console.log(`   Remaining in Queue: ${getPendingIntents().length}`);
    } else {
      console.log("⏳ Auto-settlement check: No optimal settlement paths found, intents remain in queue");
    }
    
  } catch (error) {
    console.error('❌ Error in automatic settlement:', error);
  }
}

// Run automatic settlement every 10 seconds for faster response
setInterval(performAutomaticSettlement, 10 * 1000);
console.log("🤖 Automatic settlement service started (10s intervals)");

// Also run settlement check immediately on startup after a delay
setTimeout(performAutomaticSettlement, 3000);

// Manual settlement trigger endpoint
app.post("/api/trigger-settlement", async (req, res) => {
  try {
    console.log("🔧 Manual settlement trigger requested...");
    await performAutomaticSettlement();
    
    // Get updated pool status
    const pendingIntents = getPendingIntents();
    const matchedIntents = intentPool.filter(intent => intent.status === 'matched');
    
    res.json({
      status: 'success',
      message: 'Settlement check completed',
      results: {
        pendingIntents: pendingIntents.length,
        matchedIntents: matchedIntents.length,
        recentMatches: matchedIntents.slice(-3).map(intent => ({
          id: intent.id,
          userAddress: intent.userAddress.substr(0, 10) + '...',
          matchInfo: intent.matchInfo
        }))
      }
    });
  } catch (error) {
    console.error('Error in manual settlement trigger:', error);
    res.status(500).json({ error: 'Failed to trigger settlement' });
  }
});

// 🚀 Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend server listening on port ${PORT}`);
});

