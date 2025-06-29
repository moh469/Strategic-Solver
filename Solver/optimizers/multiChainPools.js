// multiChainPools.js
// Fetches UniswapV2-style pool data from Sepolia and Avalanche Fuji testnets

const ethers = require('ethers');

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
  // For now, return empty pools array since we're testing CoW matching
  // Pools will be added later for CFMM routing
  console.log(`Fetched 0 pools - using CoW matching only`);
  return [];
}

// Sample CoW intents for testing - these can be matched directly
function getSampleCoWIntents() {
  return [
    // Intent 1: Alice wants to sell ETH for USDC
    {
      id: '1',
      chainId: 11155111,
      sellToken: 'ETH',
      buyToken: 'USD',
      sellAmount: '0.5',
      minBuyAmount: '1200', // Expects at least 1200 USDC
      userAddress: '0xAlice123',
      deadline: Date.now() + 3600000, // 1 hour from now
      sellTokenAddress: '0x0000000000000000000000000000000000000000',
      buyTokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      isNativeETH: true
    },
    // Intent 2: Bob wants to sell USDC for ETH (perfect match for Alice)
    {
      id: '2',
      chainId: 11155111,
      sellToken: 'USD',
      buyToken: 'ETH',
      sellAmount: '1300', // Selling 1300 USDC
      minBuyAmount: '0.48', // Expects at least 0.48 ETH
      userAddress: '0xBob456',
      deadline: Date.now() + 3600000,
      sellTokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      buyTokenAddress: '0x0000000000000000000000000000000000000000',
      isNativeETH: false
    },
    // Intent 3: Charlie wants to sell ETH for USDC (partial match scenario)
    {
      id: '3',
      chainId: 11155111,
      sellToken: 'ETH',
      buyToken: 'USD',
      sellAmount: '1.0',
      minBuyAmount: '2000',
      userAddress: '0xCharlie789',
      deadline: Date.now() + 3600000,
      sellTokenAddress: '0x0000000000000000000000000000000000000000',
      buyTokenAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      isNativeETH: true
    },
    // Intent 4: David wants different tokens (no match available)
    {
      id: '4',
      chainId: 11155111,
      sellToken: 'WETH',
      buyToken: 'DAI',
      sellAmount: '2.0',
      minBuyAmount: '4000',
      userAddress: '0xDavid999',
      deadline: Date.now() + 3600000,
      sellTokenAddress: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9', // WETH on Sepolia
      buyTokenAddress: '0x68194a729C2450ad26072b3D33ADaCbcef39D574', // DAI on Sepolia
      isNativeETH: false
    }
  ];
}

module.exports = { fetchAllPools, getSampleCoWIntents };
