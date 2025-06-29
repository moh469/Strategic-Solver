const { ethers } = require('ethers');

async function settleResults(results, rpcUrl, privateKey, cowMatcherAddress, cowMatcherAbi, cfmmAdapterAddress, cfmmAdapterAbi, intentBridgeAddress, intentBridgeAbi, targetChainRpcUrl = null) {
  // Step 1: Prepare on-chain contract connections
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const cowMatcher = new ethers.Contract(cowMatcherAddress, cowMatcherAbi, signer);
  const cfmmAdapter = new ethers.Contract(cfmmAdapterAddress, cfmmAdapterAbi, signer);
  const intentBridge = new ethers.Contract(intentBridgeAddress, intentBridgeAbi, signer);

  // Optional: Prepare target chain connections if targetChainRpcUrl is provided
  let targetChainProvider, targetChainSigner, targetChainCowMatcher, targetChainCfmmAdapter;
  if (targetChainRpcUrl) {
    targetChainProvider = new ethers.JsonRpcProvider(targetChainRpcUrl);
    targetChainSigner = new ethers.Wallet(privateKey, targetChainProvider);
    targetChainCowMatcher = new ethers.Contract(cowMatcherAddress, cowMatcherAbi, targetChainSigner);
    targetChainCfmmAdapter = new ethers.Contract(cfmmAdapterAddress, cfmmAdapterAbi, targetChainSigner);
  }

  // Step 2: Execute intents based on optimizer's plan
  for (const execution of results.executionPlan) {
    try {
      if (execution.requiresCrossChain) {
        // Cross-Chain Execution
        console.log(`\uD83C\uDF09 Bridging intent ${execution.intent.id} to chain ${execution.targetChain}`);
        const tx = await intentBridge.sendIntentCrossChain(
          execution.intent.id,
          execution.targetChain,
          { value: execution.bridgeFee }
        );
        await tx.wait();
        console.log(`\u2705 Cross-chain intent ${execution.intent.id} bridged successfully.`);

        // Target Chain Settlement
        if (targetChainProvider) {
          if (execution.executionType === 'CoW') {
            console.log(`\uD83D\uDEE0 Settling intent ${execution.intent.id} on target chain via CoWMatcher`);
            const tx = await targetChainCowMatcher.settleMatchedOrders(
              execution.intent.id,
              execution.matchingIntentId
            );
            await tx.wait();
            console.log(`\u2705 Intent ${execution.intent.id} settled on target chain via CoWMatcher successfully.`);
          } else if (execution.executionType === 'CFMM') {
            console.log(`\uD83D\uDEE0 Settling intent ${execution.intent.id} on target chain via CFMMAdapter`);
            const tx = await targetChainCfmmAdapter.swapViaAMM({
              user: execution.intent.user,
              tokenIn: execution.intent.sellToken,
              tokenOut: execution.intent.buyToken,
              amountIn: execution.intent.sellAmount,
              minAmountOut: execution.intent.minBuyAmount
            });
            await tx.wait();
            console.log(`\u2705 Intent ${execution.intent.id} settled on target chain via CFMMAdapter successfully.`);
          }
        }
      } else {
        // Local Execution
        if (execution.executionType === 'CoW') {
          console.log(`\uD83D\uDEE0 Executing local intent ${execution.intent.id} via CoWMatcher`);
          const tx = await cowMatcher.settleMatchedOrders(
            execution.intent.id,
            execution.matchingIntentId
          );
          await tx.wait();
          console.log(`\u2705 Local intent ${execution.intent.id} executed via CoWMatcher successfully.`);
        } else if (execution.executionType === 'CFMM') {
          console.log(`\uD83D\uDEE0 Executing local intent ${execution.intent.id} via CFMMAdapter`);
          const tx = await cfmmAdapter.swapViaAMM({
            user: execution.intent.user,
            tokenIn: execution.intent.sellToken,
            tokenOut: execution.intent.buyToken,
            amountIn: execution.intent.sellAmount,
            minAmountOut: execution.intent.minBuyAmount
          });
          await tx.wait();
          console.log(`\u2705 Local intent ${execution.intent.id} executed via CFMMAdapter successfully.`);
        }
      }
    } catch (err) {
      console.error(`\u274C Failed to execute intent ${execution.intent.id}:`, err.message);
    }
  }
}

module.exports = { settleResults };
