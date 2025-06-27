const { ethers } = require("ethers");
const config = require("../config");
const { logMatch } = require("../matches");

const provider = new ethers.JsonRpcProvider(config.rpc.sepolia);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const solverRouter = new ethers.Contract(
  config.contracts.solverRouter,
  config.abis.solverRouter,
  signer
);

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

async function matchIntentsIfCompatible({ a, b }) {
  if (!areCompatible(a, b)) return;

  try {
    const tx = await solverRouter.solve(a.intentId, b.intentId);
    console.log(`⚡ Matching ${a.intentId} ↔ ${b.intentId} | Tx: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Match executed in block ${receipt.blockNumber}`);

    logMatch(a.intentId, b.intentId, tx.hash); // ✅ log for frontend
  } catch (err) {
    console.error(`❌ Failed to solve intents ${a.intentId} & ${b.intentId}:`, err.message);
  }
}

module.exports = { matchIntentsIfCompatible };
