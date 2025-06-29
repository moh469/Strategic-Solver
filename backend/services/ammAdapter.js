// Generic AMM/CFMM Adapter for EVM chains
const { getProvider } = require("../utils/provider");
const { ethers } = require("ethers");

// Example: UniswapV2Router ABI (add more as needed)
const UNISWAP_V2_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

/**
 * Route order to AMM/CFMM on any EVM chain
 * Note: This function should be called with a signer from MetaMask in the frontend
 * Backend only provides routing logic, not transaction execution
 * @param {Object} params - { chain, routerAddress, amountIn, amountOutMin, path, to, deadline, signer }
 */
async function routeToAMM({ chain, routerAddress, amountIn, amountOutMin, path, to, deadline, signer }) {
  // Signer should be passed from frontend MetaMask connection
  if (!signer) {
    throw new Error("Signer required - should be provided from MetaMask connection");
  }
  
  const router = new ethers.Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, signer);

  // Approve token if needed (should be handled in frontend)
  // ...

  // Execute swap
  return await router.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
}

module.exports = { routeToAMM };
