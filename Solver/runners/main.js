require('dotenv').config({
  path: process.env.ENV_PATH || undefined // allow ENV_PATH override for custom env file
}); // Load environment variables from .env file

// main.js
// Entry point for off-chain intent optimization and on-chain settlement
// - Fetches all intents
// - Optimizes and matches intents (CoW and CFMM)
// - Delegates settlement to settleResults.js

const fetchIntents = require('../intents/fetchIntents'); // Fetches all user intents
const { runGlobalBatchOptimizer } = require('../optimizers/integratedOptimizer');
const { settleResults } = require('./settleResults'); // Import the settlement module
const { ethers } = require('ethers');
const cowMatcherAbi = require('../../out/CoWMatcher.sol/CoWMatcher.json').abi; // ABI for CoWMatcher contract
const cfmmAdapterAbi = require('../../out/CFMMAdapter.sol/CFMMAdapter.json').abi; // ABI for CFMMAdapter contract

// Set these values appropriately for your environment
const cowMatcherAddress = process.env.COW_MATCHER_ADDRESS || "0xYourCoWMatcherAddress";
const cfmmAdapterAddress = process.env.CFMM_ADAPTER_ADDRESS || "0xYourCFMMAdapterAddress";
const rpcUrl = process.env.RPC_URL || "https://your.rpc.url";
// Private key removed - all user transactions should go through MetaMask in frontend

// Print environment info for clarity
console.log("[ENV] Using RPC:", rpcUrl);
console.log("[ENV] CoWMatcher:", cowMatcherAddress);
console.log("[ENV] CFMMAdapter:", cfmmAdapterAddress);
console.log("[ENV] Note: User transactions handled via MetaMask in frontend");

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

  // Step 3.1: Log CFMM matches
  if (results.matchedViaCFMM) {
    console.log("\n--- Matched via CFMM ---");
    for (const [index, { a, b }] of results.matchedViaCFMM.entries()) {
      console.log(`#${index + 1}: ${a.id} <===> ${b.id}`);
    }
  }

  // Step 4: Note - Settlement should be handled via MetaMask transactions in frontend
  // Backend only provides matching logic, actual transactions signed by user
  console.log("✅ Matching complete. Settlement should be initiated via frontend MetaMask integration.");
  
  // For development/testing, we can simulate settlement without actual transactions
  if (results.matchedViaCoW?.length > 0 || results.matchedViaCFMM?.length > 0) {
    console.log("🔄 Settlement simulation - actual transactions handled by frontend");
  }
}

// Run the main workflow and catch any top-level errors
main().catch(console.error);




