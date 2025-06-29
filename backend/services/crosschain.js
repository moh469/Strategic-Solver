const BridgeService = require("./bridge");
const { ethers } = require("ethers");
const config = require("../config");

// Updated bridgeService to use a provider only
const bridgeService = new BridgeService(new ethers.JsonRpcProvider(config.rpc[process.env.HOME_CHAIN_ID || "11155111"]));

/**
 * Initialize cross-chain bridges and start monitoring
 */
async function initializeBridges() {
    try {
        // Monitor all configured chains - use allContracts if available, otherwise skip
        const contractsToMonitor = config.allContracts || {};
        for (const chainId of Object.keys(contractsToMonitor)) {
            await bridgeService.monitorCrossChainIntents(Number(chainId), handleCrossChainIntent);
        }
        console.log("🌉 Cross-chain bridge monitoring initialized");
    } catch (error) {
        console.error("❌ Failed to initialize bridges:", error);
        // Don't throw, just log the error
        console.log("⚠️ Cross-chain bridge will run in limited mode");
    }
}

/**
 * Handle a received cross-chain intent
 */
async function handleCrossChainIntent(intent) {
    try {
        console.log(`📥 Processing cross-chain intent from chain ${intent.sourceChainId}`);
        console.log(`   Intent ID: ${intent.intentId}`);
        console.log(`   User: ${intent.user}`);
        console.log(`   Swap: ${intent.amountIn} ${intent.tokenIn} -> ${intent.minAmountOut} ${intent.tokenOut}`);

        // Here we could:
        // 1. Add to local intent pool for matching
        // 2. Forward to another chain if needed
        // 3. Update UI/notify user
        // 4. etc.

    } catch (error) {
        console.error(`❌ Failed to handle cross-chain intent ${intent.intentId}:`, error);
    }
}

/**
 * Forward an intent to another chain
 */
async function forwardIntent(intentId, targetChainId) {
    try {
        const sourceChainId = Number(process.env.HOME_CHAIN_ID || "11155111"); // Default to Sepolia
        
        // Get required CCIP fee
        const fee = await bridgeService.getCCIPFee(sourceChainId, targetChainId, intentId);
        console.log(`💰 Required CCIP fee: ${ethers.formatEther(fee)} ETH`);

        // Send intent cross-chain
        const { messageId, txHash } = await bridgeService.sendIntentCrossChain(
            sourceChainId,
            targetChainId,
            intentId
        );

        console.log(`✅ Intent ${intentId} forwarded to chain ${targetChainId}`);
        console.log(`   Message ID: ${messageId}`);
        console.log(`   TX Hash: ${txHash}`);

        return { messageId, txHash };
    } catch (error) {
        console.error(`❌ Failed to forward intent ${intentId} to chain ${targetChainId}:`, error);
        throw error;
    }
}

module.exports = {
    bridgeService,
    initializeBridges,
    handleCrossChainIntent,
    forwardIntent
};
