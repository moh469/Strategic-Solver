const CrossChainRouter = require("./crosschain-router");
const { ethers } = require("ethers");
const config = require("../config");

// Cross-chain manager - handles routing logic only
// Actual transactions are executed via MetaMask in frontend

/**
 * Initialize cross-chain routing logic (without signer)
 * Signer will be provided from frontend MetaMask connection for actual transactions
 */
const router = new CrossChainRouter();

/**
 * Start the cross-chain routing system monitoring
 */
async function startCrossChainRouting() {
    try {
        // Start monitoring all chains (read-only operations)
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
