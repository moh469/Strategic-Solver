const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") }); // Explicitly specify the path to the .env file
const fs = require("fs");

// Load ABIs from abis/ folder
const IntentsManagerABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "abis", "IntentsManager.json"), "utf8")
).abi;

const SolverRouterABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "abis", "SolverRouter.json"), "utf8")
).abi;
const CoWMatcherABI = JSON.parse(
  fs.readFileSync(path.join(__dirname, "abis", "CoWMatcher.json"), "utf8")
).abi;

// Removed unsupported chain IDs and kept only Sepolia and Fuji
// Default to Sepolia if no chain ID is specified
const activeChainId = process.env.CHAIN_ID || "11155111";

const rpc = {
  11155111: process.env.ANVIL_RPC_11155111 || "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID", // Sepolia
  80002: process.env.ANVIL_RPC_80002 || "https://api.avax-test.network/ext/bc/C/rpc", // Fuji
};

const contracts = {
  11155111: {
    intentsManager: process.env.INTENTS_MANAGER_11155111,
    solverRouter: process.env.SOLVER_ROUTER_11155111,
    cowMatcher: process.env.COW_MATCHER_11155111,
    cfmmAdapter: process.env.CFMM_ADAPTER_11155111,
    crossChainBridge: process.env.CROSS_CHAIN_BRIDGE_11155111,
  },
  80002: {
    intentsManager: process.env.INTENTS_MANAGER_80002,
    solverRouter: process.env.SOLVER_ROUTER_80002,
    cowMatcher: process.env.COW_MATCHER_80002,
    cfmmAdapter: process.env.CFMM_ADAPTER_80002,
    crossChainBridge: process.env.CROSS_CHAIN_BRIDGE_80002,
  },
};

// Select active chain's contracts
const activeContracts = contracts[activeChainId];

// Ensure CROSS_CHAIN_BRIDGE environment variables are defined
if (!process.env.CROSS_CHAIN_BRIDGE_11155111 || !process.env.CROSS_CHAIN_BRIDGE_80002) {
    console.warn("⚠️ CROSS_CHAIN_BRIDGE environment variables are missing. Using mock values.");
    process.env.CROSS_CHAIN_BRIDGE_11155111 = "0xMockBridge11155111";
    process.env.CROSS_CHAIN_BRIDGE_80002 = "0xMockBridge80002";
}

// Export configuration
module.exports = {
    rpc,
    contracts: activeContracts, // Active chain contracts
    allContracts: contracts, // All chain contracts for cross-chain functionality
    activeChainId,
    abis: {
        intentsManager: IntentsManagerABI,
        solverRouter: SolverRouterABI,
        cowMatcher: CoWMatcherABI
    }
};

// Log active configuration
console.log("[CONFIG] Active Chain ID:", activeChainId);
console.log("[CONFIG] Active RPC URL:", rpc[activeChainId]);
console.log("[CONFIG] Active Contracts:", JSON.stringify(activeContracts, null, 2));
