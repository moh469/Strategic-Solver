const CrossChainRouter = require("./crosschain-router");
const { ethers } = require("ethers");
const config = require("../config");

// Initialize signer
const signer = new ethers.Wallet(
    process.env.ROUTER_OPERATOR_KEY || process.env.PRIVATE_KEY,
    new ethers.JsonRpcProvider(config.rpc[process.env.HOME_CHAIN_ID || "11155111"]) // Default to Sepolia
);

// Initialize router
const router = new CrossChainRouter(signer);

/**
 * Start the cross-chain routing system
 */
async function startCrossChainRouting() {
    try {
        // Start monitoring all chains
        await router.startMonitoring();
        console.log("🌉 Cross-chain routing system started");

        // Log status every hour
        setInterval(() => {
            for (const [chainId, intents] of router.intentPools.entries()) {
                console.log(`Chain ${chainId}: ${intents.length} pending intents`);
            }
        }, 60 * 60 * 1000);

    } catch (error) {
        console.error("❌ Failed to start cross-chain routing:", error);
        throw error;
    }
}

module.exports = {
    startCrossChainRouting,
    router
};
