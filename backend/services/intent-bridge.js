const { ethers } = require("ethers");
const config = require("../config");

/**
 * Handles cross-chain intent bridging using CCIP
 */
class IntentBridgeService {
    constructor(signer) {
        this.signer = signer;
        this.bridges = new Map(); // chainId -> bridge contract
        this.initializeBridges();
    }

    async initializeBridges() {
        try {
            // Initialize bridges for all configured chains
            for (const [chainId, contracts] of Object.entries(config.contracts)) {
                if (contracts.crossChainBridge) {
                    const provider = new ethers.JsonRpcProvider(config.rpc[chainId]);
                    const bridgeContract = new ethers.Contract(
                        contracts.crossChainBridge,
                        config.abis.crossChainBridge,
                        provider
                    );
                    this.bridges.set(Number(chainId), bridgeContract);
                }
            }
            console.log("✅ Bridge contracts initialized for chains:", Array.from(this.bridges.keys()));
        } catch (error) {
            console.error("❌ Failed to initialize bridge contracts:", error);
            throw error;
        }
    }

    /**
     * Bridge an intent to its target chain if needed
     * @param {number} currentChainId The chain where the intent currently exists
     * @param {object} intent The intent object from IntentsManager
     */
    async bridgeIntentIfNeeded(currentChainId, intent) {
        try {
            const targetChainId = Number(intent.chainId);
            
            // If intent is already on target chain, no bridging needed
            if (currentChainId === targetChainId) {
                console.log(`📍 Intent ${intent.intentId} already on target chain ${targetChainId}`);
                return null;
            }

            console.log(`🌉 Bridging intent ${intent.intentId} from chain ${currentChainId} to ${targetChainId}`);

            // Get source chain bridge contract
            const bridge = this.bridges.get(currentChainId).connect(this.signer);
            if (!bridge) throw new Error(`Bridge not configured for chain ${currentChainId}`);

            // Get CCIP chain selector for target chain
            const destSelector = await this.getChainSelector(targetChainId);
            
            // Get required CCIP fee
            const minFee = await bridge.minFees(destSelector);
            const fee = minFee * 110n / 100n; // Add 10% buffer

            console.log(`💰 Required CCIP fee: ${ethers.formatEther(fee)} ETH`);

            // Send intent cross-chain
            const tx = await bridge.sendIntentCrossChain(destSelector, intent.intentId, { value: fee });
            const receipt = await tx.wait();

            // Find the CrossChainIntentSent event
            const event = receipt.logs
                .map(log => {
                    try {
                        return bridge.interface.parseLog(log);
                    } catch (e) {
                        return null;
                    }
                })
                .find(event => event && event.name === "CrossChainIntentSent");

            if (!event) throw new Error("CrossChainIntentSent event not found in receipt");

            console.log(`✅ Intent ${intent.intentId} bridged to chain ${targetChainId}`);
            console.log(`   Message ID: ${event.args.messageId}`);
            console.log(`   TX Hash: ${tx.hash}`);

            return {
                messageId: event.args.messageId,
                txHash: tx.hash
            };

        } catch (error) {
            console.error(`❌ Failed to bridge intent ${intent.intentId}:`, error);
            throw error;
        }
    }

    /**
     * Convert a chain ID to its CCIP selector
     * @param {number} chainId EVM chain ID
     * @returns {Promise<bigint>} CCIP chain selector
     */
    async getChainSelector(chainId) {
        // Mapping of chain IDs to CCIP selectors
        // See: https://docs.chain.link/ccip/supported-networks
        const selectors = {
            1: 5009297550715157269n, // Ethereum
            43114: 6433500567565415381n, // Avalanche
            42161: 4949039107694359620n, // Arbitrum
            137: 4051577828743386545n, // Polygon
            // Add more as needed
        };

        const selector = selectors[chainId];
        if (!selector) throw new Error(`CCIP selector not found for chain ${chainId}`);
        return selector;
    }

    /**
     * Listen for cross-chain intent events
     * @param {number} chainId Chain to monitor
     * @param {Function} onIntent Callback for received intents
     */
    async monitorCrossChainIntents(chainId) {
        try {
            const bridge = this.bridges.get(chainId);
            if (!bridge) throw new Error(`Bridge not configured for chain ${chainId}`);

            console.log(`👂 Monitoring cross-chain intents on chain ${chainId}...`);

            bridge.on("CrossChainIntentReceived", 
                (intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, sourceChainId, event) => {
                    console.log(`✨ Cross-chain intent ${intentId} received on chain ${chainId} from ${sourceChainId}`);
                }
            );
        } catch (error) {
            console.error(`❌ Failed to monitor chain ${chainId}:`, error);
            throw error;
        }
    }
}

module.exports = IntentBridgeService;
