// multiChainPools.js
// Fetches real UniswapV2-style pool data from multiple EVM chains

const { ethers } = require('ethers');

// --- USER CONFIGURATION ---
const IS_LOCAL = process.env.POOL_ENV === 'local';
const CHAINS = IS_LOCAL ? [
  {
    name: 'Anvil',
    rpc: process.env.RPC_URL || 'http://127.0.0.1:8545',
    pools: [
      {
        address: process.env.LOCAL_POOL_ADDRESS || '0x5A53044836e090EAC1cB0e1c1E7027e925DB45A4', // USDC/WETH local UniswapV2
        tokens: ['USDC', 'WETH'],
        fee: 0.003
      }
    ]
  }
] : [
  {
    name: 'Ethereum',
    rpc: process.env.ETH_RPC_URL || 'https://mainnet.infura.io/v3/YOUR_INFURA_KEY',
    pools: [
      {
        address: '0xB4e16d0168e52d35CaCD2c6185b44281Ec28C9Dc', // USDC/ETH UniswapV2
        tokens: ['USDC', 'ETH'],
        fee: 0.003
      },
      // Add more Ethereum pools here
    ]
  },
  {
    name: 'Polygon',
    rpc: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY',
    pools: [
      {
        address: '0x45dda9cb7c25131df268515131f647d726f50608', // USDC/ETH SushiSwap
        tokens: ['USDC', 'ETH'],
        fee: 0.003
      },
      // Add more Polygon pools here
    ]
  }
  // Add more chains and pools as needed
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
