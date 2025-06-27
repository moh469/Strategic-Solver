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

// Multi-chain RPC endpoints
const rpc = {
  31337: process.env.ANVIL_RPC_31337,
  421614: process.env.ANVIL_RPC_421614,
  11155111: process.env.ANVIL_RPC_11155111,
  80002: process.env.ANVIL_RPC_80002,
};

// Multi-chain contract addresses
const contracts = {
  31337: {
    intentsManager: process.env.INTENTS_MANAGER_31337,
    solverRouter: process.env.SOLVER_ROUTER_31337,
    cowMatcher: process.env.COW_MATCHER_31337,
    cfmmAdapter: process.env.CFMM_ADAPTER_31337,
    crossChainBridge: process.env.CROSS_CHAIN_BRIDGE_31337,
  },
  421614: {
    intentsManager: process.env.INTENTS_MANAGER_421614,
    solverRouter: process.env.SOLVER_ROUTER_421614,
    cowMatcher: process.env.COW_MATCHER_421614,
    cfmmAdapter: process.env.CFMM_ADAPTER_421614,
    crossChainBridge: process.env.CROSS_CHAIN_BRIDGE_421614,
  },
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

module.exports = {
  rpc,
  contracts,
  abis: {
    intentsManager: IntentsManagerABI,
    solverRouter: SolverRouterABI,
    cowMatcher: CoWMatcherABI,
  },
  chainIds: {
    anvil1: 31337,
    anvil2: 421614,
    anvil3: 11155111,
    anvil4: 80002,
    mainnet: 1,
    optimism: 10,
    arbitrum: 42161,
    // polygon and mumbai removed
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
