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
  11155111: process.env.SEPOLIA_RPC_URL || "https://1rpc.io/sepolia", // Sepolia Testnet
  // 43113: process.env.FUJI_RPC_URL || "https://api.avax-test.network/ext/bc/C/rpc", // Fuji Testnet - Disabled for now due to ENS issues
};

const contracts = {
  11155111: { // Sepolia Testnet
    intentsManager: process.env.INTENTS_MANAGER_11155111,
    solverRouter: process.env.SOLVER_ROUTER_11155111,
    cowMatcher: process.env.COW_MATCHER_11155111,
    cfmmAdapter: process.env.CFMM_ADAPTER_11155111,
    crossChainBridge: process.env.CROSS_CHAIN_BRIDGE_11155111,
  },
  // 43113: { // Avalanche Fuji Testnet - Disabled for now due to ENS issues
  //   intentsManager: process.env.INTENTS_MANAGER_43113,
  //   solverRouter: process.env.SOLVER_ROUTER_43113,
  //   cowMatcher: process.env.COW_MATCHER_43113,
  //   cfmmAdapter: process.env.CFMM_ADAPTER_43113,
  //   crossChainBridge: process.env.CROSS_CHAIN_BRIDGE_43113,
  // },
};

// Select active chain's contracts
const activeContracts = contracts[activeChainId];

// Ensure CROSS_CHAIN_BRIDGE environment variables are defined for testnets
if (!process.env.CROSS_CHAIN_BRIDGE_11155111 || !process.env.CROSS_CHAIN_BRIDGE_43113) {
    console.warn("⚠️ CROSS_CHAIN_BRIDGE environment variables are missing. Using mock values.");
    process.env.CROSS_CHAIN_BRIDGE_11155111 = "0xMockBridge11155111";
    process.env.CROSS_CHAIN_BRIDGE_43113 = "0xMockBridge43113";
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
