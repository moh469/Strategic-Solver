require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ethers } = require("ethers");
const config = require("./config");
const { findMatchForIntent } = require("./Matcher.js");
const { getAllMatches } = require("./services/matcher.js");
const { logMatch, getMatchLog } = require("./matches.js");


require("../Solver/runners/autoMatch.js");
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// 🔧 Setup provider and signer
console.log("DEBUG MATCHER_PRIVATE_KEY:", process.env.MATCHER_PRIVATE_KEY, "length:", process.env.MATCHER_PRIVATE_KEY?.length);
const provider = new ethers.JsonRpcProvider(config.rpc.anvil);
const signer = new ethers.Wallet(process.env.MATCHER_PRIVATE_KEY, provider);

// 🧪 Log environment details
console.log("🧪 Loaded .env MATCHER_PRIVATE_KEY:", process.env.MATCHER_PRIVATE_KEY?.slice(0, 10) + "...");
console.log("🧪 Loaded .env RPC:", process.env.ANVIL_RPC);
console.log("🧪 Intents Manager:", process.env.INTENTS_MANAGER);
console.log("🧪 CoW Matcher:", process.env.COW_MATCHER);
console.log("🧪 CFMM Adapter:", process.env.CFMM_ADAPTER);
console.log("🧪 Cross Chain Bridge:", process.env.CROSS_CHAIN_BRIDGE);
console.log("🧪 Solver Router:", process.env.SOLVER_ROUTER);
signer.getAddress().then(addr => console.log("🧪 Signer address:", addr));

// 🔌 Connect contracts
const intentsManagerAddress = process.env.INTENTS_MANAGER || config.contracts.intentsManager;
const solverRouterAddress = process.env.SOLVER_ROUTER || config.contracts.solverRouter;

const intentsManager = new ethers.Contract(
  intentsManagerAddress,
  config.abis.intentsManager,
  signer
);

const solverRouter = new ethers.Contract(
  solverRouterAddress,
  config.abis.solverRouter,
  signer
);

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

// 📬 Submit Intent Route
app.post("/api/submit-intent", async (req, res) => {
  try {
    const { sellToken, buyToken, sellAmount, minBuyAmount, chainId } = req.body;
    const network = chainId === 11155111 ? "Sepolia" : "Polygon";
    const tokenAddresses = TOKEN_ADDRESSES[network];

    if (!tokenAddresses[sellToken] || !tokenAddresses[buyToken]) {
      return res.status(400).json({ error: "❌ Invalid token symbol" });
    }

    const tx = await intentsManager.submitIntent(
      tokenAddresses[sellToken],
      tokenAddresses[buyToken],
      ethers.parseUnits(sellAmount.toString(), 18),
      ethers.parseUnits(minBuyAmount.toString(), 18),
      chainId
    );
    const receipt = await tx.wait();
    console.log("✅ Intent confirmed:", tx.hash);

    const latestIntentId = await intentsManager.nextIntentId() - 1n;
    const newIntentRaw = await intentsManager.getIntent(latestIntentId);
    const newIntent = {
      intentId: Number(latestIntentId),
      tokenIn: newIntentRaw.tokenIn,
      tokenOut: newIntentRaw.tokenOut,
      amountIn: newIntentRaw.amountIn,
      amountOutMin: newIntentRaw.minAmountOut,
      chainId: Number(newIntentRaw.chainId),
      status: Number(newIntentRaw.status),
    };

    const allRawIntents = [];
    for (let i = 0; i < Number(latestIntentId); i++) {
      const intent = await intentsManager.getIntent(i);
      allRawIntents.push({
        intentId: i,
        tokenIn: intent.tokenIn,
        tokenOut: intent.tokenOut,
        amountIn: intent.amountIn,
        amountOutMin: intent.minAmountOut,
        chainId: Number(intent.chainId),
        status: Number(intent.status),
      });
    }

    const match = findMatchForIntent(newIntent, allRawIntents);
    if (match) {
      console.log(`🎯 Match found: ${match.a.intentId} ↔ ${match.b.intentId}`);
      try {
        const matchTx = await solverRouter.solve(match.a.intentId, match.b.intentId);
        console.log("📤 solve() tx sent:", matchTx.hash);
        const receipt = await matchTx.wait();
        console.log("✅ Match executed in block:", receipt.blockNumber);

        // ✅ Log match for frontend
        logMatch(match.a, match.b, matchTx.hash);

      } catch (err) {
        console.error("❌ Failed to execute match:", err);
      }
    }

    res.json({
      status: "✅ Intent submitted",
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (err) {
    console.error("❌ Submit intent failed:", err);
    res.status(500).json({ error: "Submission failed", details: err.toString() });
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




// 🚀 Start Server
app.listen(3001, () => {
  console.log("🚀 Backend API running on http://localhost:3001");
});

