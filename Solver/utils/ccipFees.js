// CCIP fee estimation utility
const { ethers } = require('ethers');
let IRouterClient;
try {
  IRouterClient = require('@chainlink/contracts-ccip').IRouterClient;
} catch (error) {
  console.warn('⚠️ CCIP contracts not found, using mock fee estimations');
}

// Cache CCIP fee estimates to avoid too many RPC calls
const feeCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Estimates CCIP fees for bridging between chains
 * @param {string} sourceChain Chain ID of source chain
 * @param {string} targetChain Chain ID of target chain
 * @param {number} amount Amount being bridged (for fee calculation)
 * @returns {Promise<number>} Estimated fee in source chain's native currency
 */
async function estimateCcipFees(sourceChain, targetChain, amount) {
  const cacheKey = `${sourceChain}-${targetChain}-${amount}`;
  const cached = feeCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.fee;
  }

  try {
    if (!IRouterClient) {
      // Return mock fees for testing
      const mockFee = ethers.parseEther('0.01'); // 0.01 ETH as example fee
      feeCache.set(cacheKey, {
        fee: mockFee,
        timestamp: Date.now()
      });
      return mockFee;
    }

    // Get CCIP router for source chain
    const sourceProvider = getChainProvider(sourceChain);
    const router = new ethers.Contract(
      getCcipRouter(sourceChain),
      IRouterClient.abi,
      sourceProvider
    );

    // Estimate fees
    const fees = await router.getFee(targetChain, {
      amount: amount.toString(),
      maxGasPrice: ethers.parseUnits('50', 'gwei'),
      gasLimit: 200000
    });

    feeCache.set(cacheKey, {
      fee: fees,
      timestamp: Date.now()
    });

    return fees;
  } catch (error) {
    console.error('Error estimating CCIP fees:', error);
    // Return a default fee estimate
    return ethers.parseEther('0.01');
  }
}

// Helper to get provider for different chains
function getChainProvider(chainId) {
  return new ethers.JsonRpcProvider(getChainRpc(chainId));
}

// Helper to get CCIP router address for different chains
function getCcipRouter(chainId) {
  const routers = {
    11155111: '0x0bf3de8c5d3e8a2b34d2beeb17abfcebaf363a59', // Sepolia
    43113: '0x554472a2720e5e7d5d3c817529aba05eed5f82d8',    // Fuji
    // Add more chains as needed
  };
  return routers[chainId];
}

// Helper to get RPC URL for different chains
function getChainRpc(chainId) {
  // Mapping of supported testnet chain IDs to their RPC URLs
  const rpcs = {
    11155111: process.env.SEPOLIA_RPC || 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    43113: process.env.FUJI_RPC || 'https://api.avax-test.network/ext/bc/C/rpc',
    // Add more testnets as needed
  };
  return rpcs[chainId];
}

module.exports = {
  estimateCcipFees
};
