#!/bin/bash

echo "🧪 Strategic Solver - Sample Intent Testing"
echo "==========================================="

# Check if backend is running
if ! curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "❌ Backend is not running. Please start it first with:"
    echo "   cd /home/mg/Strategic-Solver && ./start-backend.sh"
    exit 1
fi

echo "✅ Backend is running"

# Function to submit intent
submit_intent() {
    local sell_token=$1
    local buy_token=$2
    local sell_amount=$3
    local min_buy_amount=$4
    local user_address=$5
    local description=$6
    
    echo ""
    echo "📝 Submitting: $description"
    echo "   Sell: $sell_amount $sell_token → Buy: $min_buy_amount $buy_token"
    
    response=$(curl -s -X POST http://localhost:3001/api/submit-intent \
        -H "Content-Type: application/json" \
        -d "{
            \"sellToken\": \"$sell_token\",
            \"buyToken\": \"$buy_token\",
            \"sellAmount\": \"$sell_amount\",
            \"minBuyAmount\": \"$min_buy_amount\",
            \"userAddress\": \"$user_address\",
            \"chainId\": 11155111
        }")
    
    if echo "$response" | jq -e '.status == "success"' > /dev/null 2>&1; then
        intent_id=$(echo "$response" | jq -r '.result.intentId')
        echo "   ✅ Intent submitted successfully: $intent_id"
    else
        echo "   ❌ Failed to submit intent"
        echo "   Response: $response"
    fi
    
    sleep 2
}

# Function to check intent pool
check_pool() {
    echo ""
    echo "🎯 Current Intent Pool Status:"
    echo "=============================="
    
    pool_response=$(curl -s http://localhost:3001/api/intent-pool)
    
    if echo "$pool_response" | jq -e '.status == "success"' > /dev/null 2>&1; then
        total=$(echo "$pool_response" | jq -r '.pool.totalIntents')
        pending=$(echo "$pool_response" | jq -r '.pool.pendingIntents')
        matched=$(echo "$pool_response" | jq -r '.pool.matchedIntents')
        
        echo "📊 Total: $total | Pending: $pending | Matched: $matched"
        
        echo ""
        echo "⏳ Pending Intents:"
        echo "$pool_response" | jq -r '.pool.pending[] | "  • \(.sellToken)→\(.buyToken): \(.sellAmount) for \(.minBuyAmount) (ID: \(.id))"' 2>/dev/null || echo "  None"
        
        echo ""
        echo "✅ Recent Matches:"
        echo "$pool_response" | jq -r '.pool.recentMatches[0:3][] | "  • \(.sellToken)→\(.buyToken): \(.userAddress) ↔ \(.counterparty)"' 2>/dev/null || echo "  None"
    else
        echo "❌ Failed to fetch pool status"
    fi
}

echo ""
echo "🎯 Test Scenarios:"
echo "=================="
echo "1. Individual intent submission"
echo "2. Matching intent pairs (CoW testing)"
echo "3. Multiple intents for batch optimization"
echo "4. Cross-token swaps"

echo ""
read -p "Choose test scenario (1-4) or 'a' for all: " choice

case $choice in
    1|a)
        echo ""
        echo "📋 Scenario 1: Individual Intent Submission"
        echo "============================================"
        
        submit_intent "USDC" "WETH" "2000" "1.0" "0xTestUser1111111111111111" "USDC to WETH swap"
        submit_intent "ETH" "USD" "0.5" "1100" "0xTestUser2222222222222222" "ETH to USD swap"
        submit_intent "WETH" "DAI" "0.8" "1800" "0xTestUser3333333333333333" "WETH to DAI swap"
        
        check_pool
        ;&
        
    2|a)
        echo ""
        echo "📋 Scenario 2: Matching Intent Pairs (CoW Testing)"
        echo "=================================================="
        
        # Submit matching intents that should trigger CoW
        submit_intent "USDC" "WETH" "3000" "1.4" "0xAliceCoW111111111111111" "Alice: USDC→WETH"
        submit_intent "WETH" "USDC" "1.5" "2800" "0xBobCoW2222222222222222" "Bob: WETH→USDC (should match Alice)"
        
        echo "⏰ Waiting 15 seconds for CoW matching..."
        sleep 15
        
        check_pool
        ;&
        
    3|a)
        echo ""
        echo "📋 Scenario 3: Multiple Intents for Batch Optimization"
        echo "======================================================"
        
        submit_intent "DAI" "USDC" "1000" "950" "0xBatchUser1111111111111" "DAI to USDC"
        submit_intent "USDC" "ETH" "2500" "1.1" "0xBatchUser2222222222222" "USDC to ETH"
        submit_intent "ETH" "DAI" "1.2" "2800" "0xBatchUser3333333333333" "ETH to DAI"
        submit_intent "WETH" "USDC" "0.9" "2000" "0xBatchUser4444444444444" "WETH to USDC"
        
        echo "⏰ Waiting 20 seconds for batch optimization..."
        sleep 20
        
        check_pool
        ;&
        
    4|a)
        echo ""
        echo "📋 Scenario 4: Cross-Token Swaps"
        echo "================================="
        
        submit_intent "ETH" "USD" "0.6" "1350" "0xCrossUser111111111111" "ETH to USD"
        submit_intent "USD" "ETH" "1400" "0.55" "0xCrossUser222222222222" "USD to ETH (should match)"
        submit_intent "DAI" "WETH" "2200" "1.0" "0xCrossUser333333333333" "DAI to WETH"
        
        echo "⏰ Waiting 15 seconds for cross-token matching..."
        sleep 15
        
        check_pool
        ;;
        
    *)
        echo "❌ Invalid choice. Please select 1-4 or 'a'"
        exit 1
        ;;
esac

echo ""
echo "🎉 Test Complete!"
echo "================"
echo "💡 Check the backend logs to see the optimization pipeline in action"
echo "🌐 Visit http://localhost:5173 to submit intents via the UI"
echo "📊 Monitor the pool: http://localhost:3001/api/intent-pool"

# Final pool status
echo ""
echo "📋 Final Intent Pool Status:"
check_pool
