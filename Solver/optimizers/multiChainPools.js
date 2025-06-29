// multiChainPools.js
// Fetches UniswapV2-style pool data from Sepolia and Avalanche Fuji testnets

const { ethers } = require('ethers');

// --- USER CONFIGURATION ---
const CHAINS = [
  {
    name: 'Sepolia',
    rpc: process.env.SEPOLIA_RPC_URL || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    chainId: 11155111,
    pools: [
      {
        address: process.env.SEPOLIA_POOL_ADDRESS || '0xYourSepoliaCFMMAddress', // Example CFMM/AMM pool
        tokens: ['USDC', 'ETH'],
        fee: 0.003
      }
      // Add more Sepolia pools here
    ]
  },
  {
    name: 'Avalanche Fuji',
    rpc: process.env.FUJI_RPC_URL || 'https://api.avax-test.network/ext/bc/C/rpc',
    chainId: 43113,
    pools: [
      {
        address: process.env.FUJI_POOL_ADDRESS || '0xYourFujiCFMMAddress', // Example CFMM/AMM pool
        tokens: ['USDC', 'WAVAX'],
        fee: 0.003
      }
      // Add more Fuji pools here
    ]
  }
];

// UniswapV2 ABI fragment for reserves
const UNISWAP_V2_PAIR_ABI = [
  'function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
];

async function fetchAllPools() {
  const allPools = [];
  for (const chain of CHAINS) {
    const provider = new ethers.JsonRpcProvider(chain.rpc);
    for (const pool of chain.pools) {
      const contract = new ethers.Contract(pool.address, UNISWAP_V2_PAIR_ABI, provider);
      const [reserve0, reserve1] = await contract.getReserves();
      const token0 = await contract.token0();
      const token1 = await contract.token1();
      allPools.push({
        chain: chain.name,
        address: pool.address,
        tokens: [token0, token1],
        reserves: { [token0]: reserve0.toString(), [token1]: reserve1.toString() },
        fee: pool.fee
      });
    }
  }
  return allPools;
}

module.exports = { fetchAllPools };
