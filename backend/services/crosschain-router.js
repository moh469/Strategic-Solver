const { ethers } = require("ethers");
const config = require("../config");
const BridgeService = require("./bridge");

class CrossChainRouter {
    constructor(signer) {
        this.signer = signer;
        this.bridgeService = new BridgeService(signer);
        this.intentPools = new Map(); // chainId -> intents array
        this.chainConfigs = new Map(); // chainId -> { liquidityScore, gasPrice, etc }
        this.initializeRouter();
    }

    async initializeRouter() {
        try {
            // Initialize pools and configs for each chain
            for (const [chainId, contracts] of Object.entries(config.contracts)) {
                this.intentPools.set(Number(chainId), []);
                await this.updateChainConfig(Number(chainId));
            }

            // Start periodic chain config updates
            setInterval(() => {
                for (const chainId of this.chainConfigs.keys()) {
                    this.updateChainConfig(chainId).catch(console.error);
                }
            }, 5 * 60 * 1000); // Update every 5 minutes

            console.log("✅ Cross-chain router initialized");
        } catch (error) {
            console.error("❌ Failed to initialize cross-chain router:", error);
            throw error;
        }
    }

    /**
     * Update chain configuration metrics
     */
    async updateChainConfig(chainId) {
        try {
            const provider = new ethers.JsonRpcProvider(config.rpc[chainId]);
            
            // Get chain metrics
            const [gasPrice, blockNumber] = await Promise.all([
                provider.getFeeData(),
                provider.getBlockNumber()
            ]);

            // Get liquidity metrics from IntentsManager
            const intentsManager = new ethers.Contract(
                config.contracts[chainId].intentsManager,
                config.abis.intentsManager,
                provider
            );

            // TODO: Add proper liquidity scoring based on active intents and token balances
            const liquidityScore = 100; // Placeholder

            this.chainConfigs.set(chainId, {
                gasPrice: gasPrice.gasPrice,
                blockNumber,
                liquidityScore,
                lastUpdated: Date.now()
            });

        } catch (error) {
            console.error(`❌ Failed to update config for chain ${chainId}:`, error);
        }
    }

    /**
     * Route an intent to the optimal chain based on:
     * 1. Liquidity availability
     * 2. Gas costs
     * 3. Cross-chain fees
     * 4. Historical success rates
     */
    async routeIntent(sourceChainId, intent) {
        try {
            const bestChain = await this.findOptimalChain(sourceChainId, intent);
            if (!bestChain) {
                console.log(`📍 Intent ${intent.intentId} best handled on source chain ${sourceChainId}`);
                return null;
            }

            console.log(`🔄 Routing intent ${intent.intentId} from chain ${sourceChainId} to ${bestChain}`);
            
            const result = await this.bridgeService.sendIntentCrossChain(
                sourceChainId,
                bestChain,
                intent.intentId
            );

            console.log(`✅ Intent ${intent.intentId} routed to chain ${bestChain}`);
            console.log(`   Message ID: ${result.messageId}`);
            console.log(`   TX Hash: ${result.txHash}`);

            return result;

        } catch (error) {
            console.error(`❌ Failed to route intent ${intent.intentId}:`, error);
            throw error;
        }
    }

    /**
     * Find the optimal chain for intent execution
     */
    async findOptimalChain(sourceChainId, intent) {
        const scores = new Map();

        for (const [chainId, config] of this.chainConfigs.entries()) {
            if (chainId === sourceChainId) continue;

            try {
                // Get CCIP fee
                const fee = await this.bridgeService.getCCIPFee(
                    sourceChainId,
                    chainId,
                    intent.intentId
                );

                // Calculate chain score based on:
                // 1. Liquidity score (40%)
                // 2. Gas price (30%)
                // 3. CCIP fee (30%)
                const liquidityScore = config.liquidityScore * 0.4;
                const gasPriceScore = (1 / Number(config.gasPrice)) * 1e9 * 0.3;
                const feeScore = (1 / Number(fee)) * 1e18 * 0.3;

                scores.set(chainId, liquidityScore + gasPriceScore + feeScore);

            } catch (error) {
                console.warn(`⚠️ Error scoring chain ${chainId}:`, error);
                scores.set(chainId, 0);
            }
        }

        // Find chain with highest score
        let bestChain = null;
        let bestScore = 0;

        for (const [chainId, score] of scores.entries()) {
            if (score > bestScore) {
                bestScore = score;
                bestChain = chainId;
            }
        }

        // Only route if score is significantly better
        return bestScore > 1.5 ? bestChain : null;
    }

    /**
     * Handle a new intent from any chain
     */
    async handleNewIntent(chainId, intent) {
        try {
            // Add to local pool
            this.intentPools.get(chainId).push(intent);

            // Check if better handled on another chain
            await this.routeIntent(chainId, intent);

        } catch (error) {
            console.error(`❌ Failed to handle intent ${intent.intentId}:`, error);
        }
    }

    /**
     * Monitor intents across all chains
     */
    async startMonitoring() {
        for (const chainId of this.chainConfigs.keys()) {
            // Monitor new intents
            const provider = new ethers.JsonRpcProvider(config.rpc[chainId]);
            const intentsManager = new ethers.Contract(
                config.contracts[chainId].intentsManager,
                config.abis.intentsManager,
                provider
            );

            intentsManager.on("IntentSubmitted", async (intentId, user, tokenIn, tokenOut, amountIn, minAmountOut, targetChainId) => {
                const intent = {
                    intentId: intentId.toString(),
                    user,
                    tokenIn,
                    tokenOut,
                    amountIn: amountIn.toString(),
                    minAmountOut: minAmountOut.toString(),
                    chainId: targetChainId.toString()
                };

                await this.handleNewIntent(chainId, intent);
            });

            // Monitor cross-chain intents
            await this.bridgeService.monitorCrossChainIntents(chainId, async (intent) => {
                await this.handleNewIntent(chainId, intent);
            });
        }

        console.log("👀 Monitoring intents across all chains");
    }
}

module.exports = CrossChainRouter;
