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


module.exports = {
  rpc: {
    sepolia: process.env.SEPOLIA_RPC,         // from .env
    mumbai: process.env.MUMBAI_RPC || "",     // optional
  },
  contracts: {
    intentsManager: process.env.INTENTS_MANAGER,
    solverRouter: process.env.SOLVER_ROUTER,
  },
  abis: {
    intentsManager: IntentsManagerABI,
    solverRouter: SolverRouterABI,
     cowMatcher: CoWMatcherABI,
  },
  chainIds: {
    sepolia: 11155111,
    mumbai: 80001,
  },
};
