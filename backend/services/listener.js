const { ethers } = require("ethers");
const providers = require("../utils/provider");
const { contracts } = require("../config");
const intentsABI = require("../contracts/IntentsManager.json").abi;

function startListening(intentPool) {
  const provider = providers.sepolia;

  const contract = new ethers.Contract(
    contracts.intentsManager,
    intentsABI,
    provider
  );

  console.log("📡 Listening for IntentSubmitted events...");

  contract.on(
    "IntentSubmitted",
    (intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, chainId, event) => {
      const intent = {
        id: intentId.toString(),
        user,
        tokenIn,
        tokenOut,
        amountIn: ethers.formatUnits(amountIn, 18),
        minAmountOut: ethers.formatUnits(minAmountOut, 18),
        chainId,
        txHash: event.transactionHash,
      };

      console.log("📥 New Intent Submitted:", intent);
      intentPool.push(intent); // Add to in-memory pool
    }
  );
}

module.exports = { startListening };
