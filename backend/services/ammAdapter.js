// Generic AMM/CFMM Adapter for EVM chains
const { getProvider } = require("../utils/provider");
const { ethers } = require("ethers");

// Example: UniswapV2Router ABI (add more as needed)
const UNISWAP_V2_ROUTER_ABI = [
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
];

/**
 * Route order to AMM/CFMM on any EVM chain
 * @param {Object} params - { chain, routerAddress, amountIn, amountOutMin, path, to, deadline, privateKey }
 */
async function routeToAMM({ chain, routerAddress, amountIn, amountOutMin, path, to, deadline, privateKey }) {
  const provider = getProvider(chain);
  const signer = new ethers.Wallet(privateKey, provider);
  const router = new ethers.Contract(routerAddress, UNISWAP_V2_ROUTER_ABI, signer);

  // Approve token if needed (not shown here)
  // ...

  // Execute swap
  return await router.swapExactTokensForTokens(amountIn, amountOutMin, path, to, deadline);
}

module.exports = { routeToAMM };
