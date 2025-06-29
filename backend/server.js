require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ethers } = require("ethers");
const config = require("./config");
const { logMatch, getMatchLog } = require("./matches.js");
const { bridgeService, initializeBridges, forwardIntent } = require("./services/crosschain");
const { SolverService, initializeContracts } = require("./services/solver");


const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
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
    USDC: "0x447dB80B9629A84aeFcad6c3fa6C0359d73BF796",
    WETH: "0x8a1FA303F13beb1b6bd34FDC8E42881966733927",
    LINK: "0x8a78192AE2D6a59DdDA2237f9123fB7213FfEe82",
  },
  Polygon: {
    USDC: "0xdeB02C0e9a44c7609b2272AC27c38511bE61E23b",
    ETH: "0x02454B8242bD2C69d6F74D9DB81540Fe7ac01B25",
    LINK: "0x15cC3B98ebc572FC93C6C8E89e48DB28678D2E7e",
  },
};

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

// Intent submission endpoint
app.post("/submit-intent", async (req, res) => {
  try {
    const intent = req.body;
    console.log(`📝 Received new intent:`, intent);

    // Validate intent
    if (!intent.chainId || !intent.sellToken || !intent.buyToken) {
      return res.status(400).json({ 
        error: 'Invalid intent format' 
      });
    }

    // Get existing intents for matching
    const existingIntents = await getAllMatches();

    // Process intent through solver service
    const result = await solverService.processIntent(intent, existingIntents);
    
    // Log the result
    await logMatch({
      status: result.status,
      type: result.type,
      intentId: intent.id,
      txHash: result.txHash,
      targetChain: result.targetChain
    });

    res.json({
      status: 'success',
      result: result
    });
  } catch (error) {
    console.error('Error processing intent:', error);
    res.status(500).json({ 
      error: 'Failed to process intent',
      details: error.message
    });
  }
});

// Get intent status endpoint
app.get("/intent/:intentId", async (req, res) => {
  try {
    const { intentId } = req.params;
    const matchLog = await getMatchLog();
    const intentStatus = matchLog.find(m => m.intentId === intentId);
    
    if (!intentStatus) {
      return res.status(404).json({ 
        error: 'Intent not found' 
      });
    }

    res.json(intentStatus);
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
        sellToken: intent.tokenIn,
        buyToken: intent.tokenOut,
        sellAmount: ethers.formatUnits(intent.amountIn, 18),
        minBuyAmount: ethers.formatUnits(intent.minAmountOut, 18),
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
  const logs = getMatchLog();
  res.json(logs);
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

// 🚀 Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Backend server listening on port ${PORT}`);
});

