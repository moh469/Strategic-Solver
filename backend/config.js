require("dotenv").config();
const fs = require("fs");
const path = require("path");

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


// Validate required environment variables
const requiredEnvVars = ['ANVIL_RPC', 'INTENTS_MANAGER', 'SOLVER_ROUTER'];
requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

module.exports = {
  rpc: {
    anvil: process.env.ANVIL_RPC,
    // Keep other RPCs for reference but we'll use anvil for testing
    sepolia: process.env.SEPOLIA_RPC,
    mumbai: process.env.MUMBAI_RPC,
    // ... other networks
  },
  contracts: {
    intentsManager: process.env.INTENTS_MANAGER,
    solverRouter: process.env.SOLVER_ROUTER,
    cowMatcher: process.env.COW_MATCHER,
  },
  abis: {
    intentsManager: IntentsManagerABI,
    solverRouter: SolverRouterABI,
    cowMatcher: CoWMatcherABI,
  },
  abis: {
    intentsManager: IntentsManagerABI,
    solverRouter: SolverRouterABI,
     cowMatcher: CoWMatcherABI,
  },
  chainIds: {
    sepolia: 11155111,
    mumbai: 80001,
    avalanche_fuji: 43113,
    anvil: 31337,
    mainnet: 1,
    optimism: 10,
    arbitrum: 42161,
    polygon: 137,
    base: 8453,
    gnosis: 100,
    fantom: 250,
    bsc: 56,
    celo: 42220,
    moonbeam: 1284,
    moonriver: 1285,
    // ...add more as needed
  },
};
