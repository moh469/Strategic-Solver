// Test intents for end-to-end testing
const { ethers } = require('ethers');
const fetch = require('node-fetch');

async function submitTestIntents() {
    const provider = new ethers.JsonRpcProvider('http://localhost:8545');
    
    // Test wallet (Anvil's first account)
    const wallet = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);

    // Test batch of intents
    const testBatch = [
        // Normal case: ETH to USDC swap
        {
            sellToken: "ETH",
            buyToken: "USDC",
            amount: ethers.parseEther("1.0"),
            minAmountOut: ethers.parseUnits("1800", 6), // 1 ETH ≈ 1800 USDC
            user: wallet.address
        },
        // Edge case: Very small amount
        {
            sellToken: "USDC",
            buyToken: "ETH",
            amount: ethers.parseUnits("0.01", 6), // Very small USDC amount
            minAmountOut: ethers.parseEther("0.000001"),
            user: wallet.address
        },
        // Edge case: Large slippage tolerance
        {
            sellToken: "ETH",
            buyToken: "DAI",
            amount: ethers.utils.parseEther("5.0"),
            minAmountOut: ethers.utils.parseEther("1000"), // Much lower than market rate
            user: wallet.address
        },
        // Edge case: Cross-chain intent
        {
            sellToken: "ETH",
            buyToken: "USDC",
            amount: ethers.utils.parseEther("2.0"),
            minAmountOut: ethers.utils.parseUnits("3600", 6),
            targetChain: "arbitrum_sepolia",
            user: wallet.address
        }
    ];

    console.log("Submitting test batch...");
    
    try {
        // Submit batch to backend
        const response = await fetch('http://localhost:3000/api/submit-batch', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testBatch)
        });

        const result = await response.json();
        console.log("Batch submitted successfully:", result);
        return result.batchId;
    } catch (error) {
        console.error("Error submitting batch:", error);
        throw error;
    }
}

// Export for use in test script
module.exports = { submitTestIntents };
