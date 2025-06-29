#!/bin/bash

echo "⚡ Quick Intent Test - Strategic Solver"
echo "======================================"

# Submit a matching pair for instant CoW testing
echo "🔄 Submitting matching intent pair for CoW testing..."

# Intent 1: Sell USDC, Buy WETH
curl -X POST http://localhost:3001/api/submit-intent \
    -H "Content-Type: application/json" \
    -d '{
        "sellToken": "USDC",
        "buyToken": "WETH", 
        "sellAmount": "3000",
        "minBuyAmount": "1.3",
        "userAddress": "0xQuickTestAlice123456789",
        "chainId": 11155111
    }'

echo ""
echo ""

# Intent 2: Sell WETH, Buy USDC (matching intent)
curl -X POST http://localhost:3001/api/submit-intent \
    -H "Content-Type: application/json" \
    -d '{
        "sellToken": "WETH",
        "buyToken": "USDC",
        "sellAmount": "1.4", 
        "minBuyAmount": "2900",
        "userAddress": "0xQuickTestBob987654321",
        "chainId": 11155111
    }'

echo ""
echo ""
echo "⏰ Waiting 10 seconds for CoW matching..."
sleep 10

echo "📊 Checking intent pool status..."
curl -s http://localhost:3001/api/intent-pool | jq '{
    totalIntents: .pool.totalIntents,
    pendingIntents: .pool.pendingIntents, 
    matchedIntents: .pool.matchedIntents,
    recentMatches: [.pool.recentMatches[0:2][] | {sellToken, buyToken, userAddress}]
}'
