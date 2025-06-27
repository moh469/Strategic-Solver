const { ethers } = require("ethers");
const { rpc } = require("../config");

// Dynamically create providers for all configured chains
const providers = {};
for (const [name, url] of Object.entries(rpc)) {
  if (url) providers[name] = new ethers.JsonRpcProvider(url);
}

// Utility to get provider by chain name or custom RPC
function getProvider(chain) {
  if (providers[chain]) return providers[chain];
  return new ethers.JsonRpcProvider(chain); // fallback: treat as RPC URL
}

module.exports = { providers, getProvider };
