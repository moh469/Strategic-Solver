const { ethers } = require("ethers");
const config = require("../config");

// Chain selector mapping
const CCIP_SELECTORS = {
    1: 5009297550715157269n,    // Ethereum
    43114: 6433500567565415381n, // Avalanche
    42161: 4949039107694359620n, // Arbitrum
    137: 4051577828743386545n,   // Polygon
};

class MatchingService {
    constructor(signer) {
        this.signer = signer;
        this.chainProviders = new Map();
        this.intentsManagers = new Map();
        this.bridges = new Map();
        this.initializeServices();
    }

    async initializeServices() {
        try {
            // Initialize providers and contracts for each chain
            for (const [chainId, contracts] of Object.entries(config.contracts)) {
                const provider = new ethers.JsonRpcProvider(config.rpc[chainId]);
                this.chainProviders.set(Number(chainId), provider);

                // Initialize IntentsManager
                const intentsManager = new ethers.Contract(
                    contracts.intentsManager,
                    config.abis.intentsManager,
                    provider
                );
                this.intentsManagers.set(Number(chainId), intentsManager);

                // Initialize Bridge if exists
                if (contracts.crossChainBridge) {
                    const bridge = new ethers.Contract(
                        contracts.crossChainBridge,
                        config.abis.crossChainBridge,
                        provider
                    );
                    this.bridges.set(Number(chainId), bridge);
                }
            }
            console.log("✅ Services initialized for chains:", Array.from(this.chainProviders.keys()));
        } catch (error) {
            console.error("❌ Failed to initialize services:", error);
            throw error;
        }
    }

    /**
     * When a new intent is submitted, check for matches on current chain first
     */
    async processNewIntent(chainId, intent) {
        try {
            // First try to match on current chain
            const localMatch = await this.findLocalMatch(chainId, intent);
            if (localMatch) {
                console.log(`✅ Found local match for intent ${intent.intentId} on chain ${chainId}`);
                await this.executeMatch(chainId, localMatch);
                return;
            }

            // If no local match, check liquidity and rates on other chains
            const betterChain = await this.findBetterExecution(chainId, intent);
            if (betterChain) {
                console.log(`🌉 Better execution found on chain ${betterChain} for intent ${intent.intentId}`);
                await this.bridgeIntent(chainId, betterChain, intent);
            } else {
                console.log(`⏳ No immediate execution for intent ${intent.intentId}, keeping in local pool`);
            }
        } catch (error) {
            console.error(`❌ Error processing intent ${intent.intentId}:`, error);
        }
    }

    /**
     * Look for matching intent on current chain
     */
    async findLocalMatch(chainId, intent) {
        // Implementation depends on your matching logic
        // Return matching intent if found
        return null; // Placeholder
    }

    /**
     * Check if better execution is available on another chain
     */
    async findBetterExecution(sourceChain, intent) {
        let bestChain = null;
        let bestScore = 0;

        for (const [chainId, intentsManager] of this.intentsManagers.entries()) {
            if (chainId === sourceChain) continue;

            try {
                // Check liquidity
                const liquidity = await this.checkChainLiquidity(chainId, intent);
                if (!liquidity.sufficient) continue;

                // Get execution price
                const price = await this.getExecutionPrice(chainId, intent);
                
                // Calculate total cost including CCIP
                const ccipFee = await this.estimateCcipFee(sourceChain, chainId);
                const gasCost = await this.estimateGasCost(chainId);
                const totalCost = ccipFee + gasCost;

                // Calculate score (example: price advantage vs costs)
                const score = this.calculateScore(price, liquidity, totalCost);
                
                if (score > bestScore) {
                    bestScore = score;
                    bestChain = chainId;
                }
            } catch (error) {
                console.warn(`⚠️ Error analyzing chain ${chainId}:`, error);
            }
        }

        // Only return if significantly better
        return bestScore > 1.5 ? bestChain : null;
    }

    /**
     * Bridge intent to target chain
     */
    async bridgeIntent(sourceChain, targetChain, intent) {
        try {
            const bridge = this.bridges.get(sourceChain).connect(this.signer);
            const targetSelector = CCIP_SELECTORS[targetChain];
            
            // Get CCIP fee
            const minFee = await bridge.minFees(targetSelector);
            const fee = minFee * 110n / 100n; // Add 10% buffer

            console.log(`🌉 Bridging intent ${intent.intentId} to chain ${targetChain}`);
            const tx = await bridge.sendIntentCrossChain(
                targetSelector,
                intent.intentId,
                { value: fee }
            );
            await tx.wait();
            
            console.log(`✅ Intent bridged. TX: ${tx.hash}`);
        } catch (error) {
            console.error(`❌ Failed to bridge intent ${intent.intentId}:`, error);
            throw error;
        }
    }

    // Helper methods for price/liquidity checks
    async checkChainLiquidity(chainId, intent) {
        // Implementation depends on your liquidity sources
        return { sufficient: true, amount: 0n };
    }

    async getExecutionPrice(chainId, intent) {
        // Implementation depends on your price sources
        return 0n;
    }

    async estimateCcipFee(sourceChain, targetChain) {
        // Get from bridge contract
        return 0n;
    }

    async estimateGasCost(chainId) {
        // Get from provider
        return 0n;
    }

    calculateScore(price, liquidity, cost) {
        // Implement your scoring logic
        return 1.0;
    }
}

module.exports = MatchingService;
