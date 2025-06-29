const { ethers } = require("ethers");
const config = require("../config");

// Ensure ABI is properly loaded
if (!config.abis.crossChainBridge) {
    console.warn("⚠️ Missing ABI for crossChainBridge. Using mock ABI.");
    config.abis.crossChainBridge = [
        {
            type: "function",
            name: "mockFunction",
            inputs: [],
            outputs: [],
            stateMutability: "nonpayable"
        },
        {
            type: "event",
            name: "CrossChainIntentReceived",
            inputs: [
                { type: "uint256", name: "intentId", indexed: true },
                { type: "address", name: "user", indexed: true },
                { type: "address", name: "tokenIn" },
                { type: "address", name: "tokenOut" },
                { type: "uint256", name: "amountIn" },
                { type: "uint256", name: "minAmountOut" },
                { type: "uint256", name: "sourceChainId", indexed: true }
            ]
        }
    ];
}

class BridgeService {
    constructor(signer) {
        this.signer = signer;
        this.bridges = new Map(); // chainId -> bridge contract
        this.messageIds = new Map(); // chainId -> Set of pending message IDs
        this.initializeBridges();
    }

    async initializeBridges() {
        try {
            const initializedChains = [];
            // Initialize bridges for all configured chains
            for (const [chainId, contracts] of Object.entries(config.allContracts || {})) {
                if (contracts.crossChainBridge) {
                    try {
                        const provider = new ethers.JsonRpcProvider(config.rpc[chainId]);
                        const bridgeContract = new ethers.Contract(
                            contracts.crossChainBridge,
                            config.abis.crossChainBridge,
                            provider
                        );
                        this.bridges.set(Number(chainId), bridgeContract);
                        initializedChains.push(Number(chainId));
                    } catch (chainError) {
                        console.log(`⚠️ Skipping bridge initialization for chain ${chainId}:`, chainError.message);
                        // Continue with other chains
                    }
                } else {
                    console.log(`ℹ️ No bridge configured for chain ${chainId}`);
                }
            }
            
            if (initializedChains.length > 0) {
                console.log("✅ Bridge contracts initialized for chains:", initializedChains);
            } else {
                console.log("⚠️ No bridge contracts were initialized");
            }
        } catch (error) {
            console.error("❌ Failed to initialize bridge contracts:", error);
            // Don't throw, just log the error
            console.log("⚠️ Bridge service will run in limited mode");
        }
    }

    /**
     * Get CCIP fee for sending an intent to another chain
     * @param {number} sourceChainId Current chain ID
     * @param {number} destChainId Target chain ID
     * @param {number} intentId Intent to be sent
     * @returns {Promise<bigint>} Required fee in wei
     */
    async getCCIPFee(sourceChainId, destChainId, intentId) {
        try {
            const bridge = this.bridges.get(sourceChainId);
            if (!bridge) throw new Error(`Bridge not configured for chain ${sourceChainId}`);

            const destSelector = await this.getChainSelector(destChainId);
            const minFee = await bridge.minFees(destSelector);
            
            // Add 10% buffer for gas price fluctuations
            return minFee * 110n / 100n;
        } catch (error) {
            console.error(`❌ Failed to get CCIP fee for chain ${destChainId}:`, error);
            throw error;
        }
    }

    /**
     * Send an intent to another chain via CCIP
     * @param {number} sourceChainId Current chain ID
     * @param {number} destChainId Target chain ID
     * @param {number} intentId Intent to be sent
     * @returns {Promise<{messageId: string, txHash: string}>}
     */
    async sendIntentCrossChain(sourceChainId, destChainId, intentId) {
        try {
            const bridge = this.bridges.get(sourceChainId).connect(this.signer);
            if (!bridge) throw new Error(`Bridge not configured for chain ${sourceChainId}`);

            const destSelector = await this.getChainSelector(destChainId);
            const fee = await this.getCCIPFee(sourceChainId, destChainId, intentId);

            console.log(`🔄 Sending intent ${intentId} from chain ${sourceChainId} to ${destChainId}`);
            console.log(`💰 Required CCIP fee: ${ethers.formatEther(fee)} ETH`);

            const tx = await bridge.sendIntentCrossChain(destSelector, intentId, { value: fee });
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

            const messageId = event.args.messageId;
            this.messageIds.get(destChainId)?.add(messageId) || 
                this.messageIds.set(destChainId, new Set([messageId]));

            console.log(`✅ Intent sent cross-chain. MessageId: ${messageId}, TxHash: ${tx.hash}`);
            return { messageId, txHash: tx.hash };
        } catch (error) {
            console.error(`❌ Failed to send intent ${intentId} to chain ${destChainId}:`, error);
            throw error;
        }
    }

    /**
     * Configure bridge addresses for a chain
     * @param {number} chainId Chain to configure
     * @param {string} bridgeAddress Address of the bridge on that chain
     */
    async configureBridge(chainId, bridgeAddress) {
        try {
            // Verify bridge is deployed at the address
            const provider = new ethers.JsonRpcProvider(config.rpc[chainId]);
            const code = await provider.getCode(bridgeAddress);
            if (code === "0x") throw new Error(`No contract at ${bridgeAddress} on chain ${chainId}`);

            const bridge = new ethers.Contract(
                bridgeAddress,
                config.abis.crossChainBridge,
                this.signer
            );
            this.bridges.set(chainId, bridge);

            // Set this bridge as trusted source on other chains
            const sourceSelector = await this.getChainSelector(chainId);
            for (const [targetChainId, targetBridge] of this.bridges.entries()) {
                if (targetChainId !== chainId) {
                    console.log(`🔄 Setting trusted source on chain ${targetChainId}`);
                    const tx = await targetBridge.setTrustedSource(sourceSelector, bridgeAddress);
                    await tx.wait();
                }
            }

            console.log(`✅ Bridge ${bridgeAddress} configured for chain ${chainId}`);
        } catch (error) {
            console.error(`❌ Failed to configure bridge for chain ${chainId}:`, error);
            throw error;
        }
    }

    /**
     * Listen for cross-chain intent events
     * @param {number} chainId Chain to monitor
     * @param {Function} onIntent Callback for received intents
     */
    async monitorCrossChainIntents(chainId, onIntent) {
        const bridge = this.bridges.get(chainId);
        if (!bridge) {
            console.log(`ℹ️ No bridge configured for chain ${chainId}, skipping monitoring`);
            return;
        }

        try {
            console.log(`👂 Monitoring cross-chain intents on chain ${chainId}...`);

            bridge.on("CrossChainIntentReceived", 
                (intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, sourceChainId, event) => {
                    console.log(`✨ Cross-chain intent received on ${chainId} from chain ${sourceChainId}`);
                    onIntent({
                        intentId: intentId.toString(),
                        user,
                        tokenIn,
                        tokenOut,
                        amountIn: amountIn.toString(),
                        minAmountOut: minAmountOut.toString(),
                        sourceChainId: sourceChainId.toString(),
                        txHash: event.transactionHash
                    });
                }
            );
        } catch (error) {
            console.warn(`⚠️ Failed to monitor chain ${chainId}:`, error.message);
            // Don't throw, just log the warning
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
}

module.exports = BridgeService;
