// fastIntentProcessor.js
// Lightweight intent processor for real-time matching without AI/ML overhead

const matchCoWs = require('./cowOptimizer');

/**
 * Fast intent processing focused on CoW matching
 * Skips expensive AI/ML operations for real-time performance
 */
async function processFastIntentMatching(allIntents) {
  console.log(`⚡ Fast processing ${allIntents.length} intents...`);
  
  // STEP 1: CoW (Coincidence of Wants) Matching - Most efficient option
  console.log("🔎 Checking for CoW matches...");
  const cowMatches = matchCoWs(allIntents);
  
  // Create execution results
  const executions = [];
  const matchedIntentIds = new Set();

  // Process CoW matches first (highest priority - direct user-to-user swaps)
  for (const match of cowMatches) {
    console.log(`✅ CoW match found: ${match.a.userAddress} ↔ ${match.b.userAddress}`);
    
    // Add both intents as successfully matched via CoW
    executions.push({
      intent: match.a,
      requiresCrossChain: false,
      targetChain: match.a.chainId,
      expectedValue: Number(match.b.sellAmount), // A gets B's sell amount
      pool: null, // No pool needed for CoW
      executionPlan: {
        estimatedOutput: Number(match.b.sellAmount),
        totalCost: 0, // Minimal gas costs for direct swap
        matchType: 'CoW',
        counterparty: match.b.userAddress
      },
      elizaMetrics: {
        confidence: 1.0, // High confidence for direct matches
        riskScore: 0.1, // Low risk - no slippage or liquidity issues
        suggestionStrength: 1.0
      },
      marketContext: { fastPath: true }
    });
    
    executions.push({
      intent: match.b,
      requiresCrossChain: false,
      targetChain: match.b.chainId,
      expectedValue: Number(match.a.sellAmount), // B gets A's sell amount
      pool: null, // No pool needed for CoW
      executionPlan: {
        estimatedOutput: Number(match.a.sellAmount),
        totalCost: 0, // Minimal gas costs for direct swap
        matchType: 'CoW',
        counterparty: match.a.userAddress
      },
      elizaMetrics: {
        confidence: 1.0, // High confidence for direct matches
        riskScore: 0.1, // Low risk - no slippage or liquidity issues
        suggestionStrength: 1.0
      },
      marketContext: { fastPath: true }
    });
    
    // Mark these intents as matched
    matchedIntentIds.add(match.a.id || match.a.userAddress);
    matchedIntentIds.add(match.b.id || match.b.userAddress);
  }

  // STEP 2: For unmatched intents, create "no match" results
  for (const intent of allIntents) {
    const intentId = intent.id || intent.userAddress;
    if (!matchedIntentIds.has(intentId)) {
      console.log(`⏳ No match found for intent ${intentId} - added to queue`);
      executions.push({
        intent,
        requiresCrossChain: false,
        targetChain: intent.chainId || 11155111,
        expectedValue: 0,
        pool: null,
        executionPlan: {
          estimatedOutput: 0,
          totalCost: 0,
          matchType: 'Queued',
          error: 'No match found yet - intent remains in pool for future matching'
        },
        elizaMetrics: {
          confidence: 1.0, // High confidence in "queued" status
          riskScore: 0.0,
          suggestionStrength: 0.0
        },
        marketContext: { fastPath: true, queued: true }
      });
    }
  }

  const cowCount = executions.filter(e => e.executionPlan.matchType === 'CoW').length;
  const queuedCount = executions.filter(e => e.executionPlan.matchType === 'Queued').length;
  
  console.log(`⚡ Fast processing complete: ${cowCount} CoW matches, ${queuedCount} queued`);

  return executions;
}

module.exports = { processFastIntentMatching };
