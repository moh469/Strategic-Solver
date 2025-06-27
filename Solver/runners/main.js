require('dotenv').config({
  path: process.env.ENV_PATH || undefined // allow ENV_PATH override for custom env file
}); // Load environment variables from .env file

// main.js
// Entry point for off-chain intent optimization and on-chain settlement
// - Fetches all intents
// - Optimizes and matches intents (CoW and CFMM)
// - Settles matched intents on-chain via CoWMatcher
// - Routes unmatched intents via CFMMAdapter (AMM)

const fetchIntents = require('../intents/fetchIntents'); // Fetches all user intents
const { runGlobalBatchOptimizer } = require('../optimizers/integratedOptimizer');
const { ethers } = require('ethers');
const cowMatcherAbi = require('../../out/CoWMatcher.sol/CoWMatcher.json').abi; // ABI for CoWMatcher contract
const cfmmAdapterAbi = require('../../out/CFMMAdapter.sol/CFMMAdapter.json').abi; // ABI for CFMMAdapter contract

// Set these values appropriately for your environment
const cowMatcherAddress = process.env.COW_MATCHER_ADDRESS || "0xYourCoWMatcherAddress";
const cfmmAdapterAddress = process.env.CFMM_ADAPTER_ADDRESS || "0xYourCFMMAdapterAddress";
const rpcUrl = process.env.RPC_URL || "https://your.rpc.url";
const privateKey = process.env.PRIVATE_KEY || "your_private_key";

// Print environment info for clarity
console.log("[ENV] Using RPC:", rpcUrl);
console.log("[ENV] CoWMatcher:", cowMatcherAddress);
console.log("[ENV] CFMMAdapter:", cfmmAdapterAddress);
console.log("[ENV] PrivateKey:", privateKey.slice(0, 8) + "..." );

async function main() {
  // Step 1: Fetch all current intents (from DB, blockchain, or API)
  const intents = await fetchIntents();

  // Step 2: Run the global batch optimizer for optimal execution
  const results = await runGlobalBatchOptimizer(intents);

  // Step 3: Log direct matches (CoW)
  if (results.matchedViaCoW) {
    console.log("\n--- Matched via CoW ---");
    for (const [index, { a, b }] of results.matchedViaCoW.entries()) {
      console.log(`#${index + 1}: ${a.id} <===> ${b.id}`);
    }
  }

  // Step 4: Prepare on-chain contract connections
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const signer = new ethers.Wallet(privateKey, provider);
  const cowMatcher = new ethers.Contract(cowMatcherAddress, cowMatcherAbi, signer);
  const cfmmAdapter = new ethers.Contract(cfmmAdapterAddress, cfmmAdapterAbi, signer);

  // Step 5: Settle all direct matches on-chain via CoWMatcher
  if (results.matchedViaCoW) {
    for (const { a, b } of results.matchedViaCoW) {
      try {
        const tx = await cowMatcher.settleMatchedOrders(a.id, b.id);
        await tx.wait();
        console.log(`Settled on-chain: ${a.id} <===> ${b.id}`);
      } catch (err) {
        console.error(`Failed to settle ${a.id} <===> ${b.id}:`, err.message);
      }
    }
  }

  // Step 6: Log and settle all fallback routes via CFMMAdapter (AMM)
  if (results.routedViaCFMM) {
    console.log("\n--- Routed via CFMM ---");
    for (const [index, { intent, result }] of results.routedViaCFMM.entries()) {
      console.log(`#${index + 1}: Intent ${intent.id} routed via ${result.cfmm}, receives ${result.amountOut} ${intent.buyToken}`);
      try {
        const tx = await cfmmAdapter.swapViaAMM({
          user: intent.user,
          tokenIn: intent.sellToken,
          tokenOut: intent.buyToken,
          amountIn: intent.sellAmount,
          minAmountOut: intent.minBuyAmount
        });
        await tx.wait();
        console.log(`CFMM swap settled on-chain for intent ${intent.id}`);
      } catch (err) {
        console.error(`Failed CFMM swap for intent ${intent.id}:`, err.message);
      }
    }
  }
}

// Run the main workflow and catch any top-level errors
main().catch(console.error);




