// ElizaOS - Autonomous Optimization System
const { MachineLearningModel } = require('./ml/model');
const { RiskAnalyzer } = require('./risk/analyzer');
const { MarketPredictor } = require('./market/predictor');

class ElizaOptimizer {
    constructor() {
        this.mlModel = new MachineLearningModel();
        this.riskAnalyzer = new RiskAnalyzer();
        this.marketPredictor = new MarketPredictor();
        this.learningHistory = [];
        this.confidenceThreshold = 0.85;
    }

    async analyzeExecution(intent, pool, marketState) {
        // Analyze specific execution with ML model
        const mlPrediction = await this.mlModel.predict({
            intent,
            pool,
            marketState,
            history: this.learningHistory
        });

        // Assess risks
        const riskMetrics = await this.riskAnalyzer.analyze({
            intent,
            pool,
            marketState,
            prediction: mlPrediction
        });

        // Get market predictions
        const marketPrediction = await this.marketPredictor.getShortTermPrediction(
            pool?.chainId || intent.chainId || 11155111, // Use pool chainId, fallback to intent chainId, then Sepolia
            intent.tokens
        );

        return {
            slippageMultiplier: this.calculateSlippageMultiplier(mlPrediction, riskMetrics),
            ccipMultiplier: this.calculateCcipMultiplier(marketState, marketPrediction),
            confidence: mlPrediction.confidence,
            riskScore: riskMetrics.overallRisk
        };
    }

    async analyzeBatch(intents, marketState) {
        const batchAnalysis = {};
        
        // Analyze entire batch for patterns and opportunities
        const batchPatterns = await this.mlModel.analyzeBatchPatterns(intents);
        const batchRisks = await this.riskAnalyzer.analyzeBatchRisks(intents, marketState);
        
        for (const intent of intents) {
            batchAnalysis[intent.id] = {
                ...await this.analyzeExecution(intent, null, marketState),
                batchContext: {
                    patterns: batchPatterns[intent.id],
                    risks: batchRisks[intent.id]
                }
            };
        }

        return batchAnalysis;
    }

    async learn(feedback) {
        this.learningHistory.push(feedback);
        
        // Train ML model with new data
        await this.mlModel.train(feedback);
        
        // Update risk models
        await this.riskAnalyzer.updateModels(feedback);
        
        // Adjust market predictions
        await this.marketPredictor.incorporateFeedback(feedback);
        
        // Prune old history
        this.pruneHistory();
    }

    approveCrossChain(crossChainValue, localValue, marketState) {
        const confidence = this.mlModel.getConfidence(crossChainValue, localValue);
        const riskAssessment = this.riskAnalyzer.assessCrossChainRisk(
            crossChainValue,
            localValue,
            marketState
        );

        return confidence > this.confidenceThreshold && riskAssessment.acceptable;
    }

    adjustValue(baseValue, tuning) {
        return baseValue * tuning.valueMultiplier;
    }

    recordBatchDecision(executions) {
        // Record batch-level decisions for learning
        this.mlModel.recordBatchOutcome(executions);
        this.riskAnalyzer.updateBatchMetrics(executions);
    }

    calculateSlippageMultiplier(mlPrediction, riskMetrics) {
        // Adjust slippage tolerance based on ML predictions and risk
        let multiplier = 1.0;
        
        if (mlPrediction.volatilityRisk > 0.7) {
            multiplier *= 0.8;
        }
        
        if (riskMetrics.liquidityRisk > 0.6) {
            multiplier *= 0.9;
        }
        
        return Math.max(0.5, Math.min(1.5, multiplier));
    }

    calculateCcipMultiplier(marketState, prediction) {
        // Adjust CCIP overhead based on network conditions and predictions
        let multiplier = 1.0;
        
        if (marketState.ccipCongestion === 'high') {
            multiplier *= 1.3;
        }
        
        if (prediction.ccipCostTrend === 'increasing') {
            multiplier *= 1.1;
        }
        
        return Math.max(1.0, Math.min(2.0, multiplier));
    }

    pruneHistory() {
        // Keep only last 24 hours of history
        const cutoff = Date.now() - 24 * 60 * 60 * 1000;
        this.learningHistory = this.learningHistory.filter(
            entry => entry.timestamp > cutoff
        );
    }
}

module.exports = {
    ElizaOptimizer
};
