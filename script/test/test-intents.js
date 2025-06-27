// test-intents.js
const ethers = require('ethers');
const axios = require('axios');

const ANVIL_URL = 'http://localhost:8545';
const BACKEND_URL = 'http://localhost:3000';

// Anvil test account #0
const TEST_ACCOUNT = {
    address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    privateKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
};

// Test tokens (we'll use deployed mock tokens)
const TEST_TOKENS = {
    ETH: '0x...',  // Will be filled after deployment
    USDC: '0x...', // Will be filled after deployment
    DAI: '0x...'   // Will be filled after deployment
};

async function submitTestIntents() {
    try {
        // Create test intents
        const testIntents = [
            // Intent 1: Sell ETH for USDC
            {
                id: '1',
                sellToken: TEST_TOKENS.ETH,
                buyToken: TEST_TOKENS.USDC,
                sellAmount: ethers.utils.parseEther('1.0'),
                minBuyAmount: ethers.utils.parseUnits('1800', 6), // 1 ETH ≈ 1800 USDC
                sender: TEST_ACCOUNT.address
            },
            // Intent 2: Sell USDC for ETH (matching intent)
            {
                id: '2',
                sellToken: TEST_TOKENS.USDC,
                buyToken: TEST_TOKENS.ETH,
                sellAmount: ethers.utils.parseUnits('1800', 6),
                minBuyAmount: ethers.utils.parseEther('0.95'), // Allowing 5% slippage
                sender: TEST_ACCOUNT.address
            },
            // Intent 3: Sell ETH for DAI (will likely use AMM)
            {
                id: '3',
                sellToken: TEST_TOKENS.ETH,
                buyToken: TEST_TOKENS.DAI,
                sellAmount: ethers.utils.parseEther('0.5'),
                minBuyAmount: ethers.utils.parseEther('900'), // 1 ETH ≈ 1800 DAI
                sender: TEST_ACCOUNT.address
            }
        ];

        // Submit intents to backend
        for (const intent of testIntents) {
            console.log(`Submitting intent ${intent.id}...`);
            await axios.post(`${BACKEND_URL}/submit-intent`, intent);
        }

        console.log('Test intents submitted successfully');
        
        // Wait for optimization and execution
        console.log('Waiting for optimization...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Get results
        const results = await axios.get(`${BACKEND_URL}/execution-results`);
        console.log('Execution Results:', JSON.stringify(results.data, null, 2));

    } catch (error) {
        console.error('Error submitting test intents:', error);
    }
}

async function checkBalances() {
    const provider = new ethers.providers.JsonRpcProvider(ANVIL_URL);
    const wallet = new ethers.Wallet(TEST_ACCOUNT.privateKey, provider);

    // Check ETH balance
    const ethBalance = await wallet.getBalance();
    console.log('ETH Balance:', ethers.utils.formatEther(ethBalance));

    // Check token balances
    for (const [name, address] of Object.entries(TEST_TOKENS)) {
        const tokenContract = new ethers.Contract(
            address,
            ['function balanceOf(address) view returns (uint256)'],
            wallet
        );
        const balance = await tokenContract.balanceOf(TEST_ACCOUNT.address);
        console.log(`${name} Balance:`, balance.toString());
    }
}

// Export functions for manual testing
module.exports = {
    submitTestIntents,
    checkBalances,
    TEST_TOKENS
};
