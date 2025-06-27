const { ethers } = require("ethers");
const { rpc } = require("../config");

// Create JsonRpcProviders for each network
const providers = {
  sepolia: new ethers.JsonRpcProvider(rpc.sepolia),
  mumbai: new ethers.JsonRpcProvider(rpc.mumbai),
};

module.exports = providers;
