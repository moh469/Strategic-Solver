#!/bin/bash

echo "🔍 Strategic Solver - Health Check"
echo "=================================="

# Check backend
echo "🔧 Backend Status:"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "   ✅ Backend running on http://localhost:3001"
    
    # Get pool status
    pool_response=$(curl -s http://localhost:3001/api/intent-pool)
    if echo "$pool_response" | jq -e '.status' > /dev/null 2>&1; then
        total=$(echo "$pool_response" | jq -r '.pool.totalIntents')
        pending=$(echo "$pool_response" | jq -r '.pool.pendingIntents') 
        matched=$(echo "$pool_response" | jq -r '.pool.matchedIntents')
        echo "   📊 Intent Pool: $total total, $pending pending, $matched matched"
    fi
else
    echo "   ❌ Backend not running"
fi

echo ""

# Check frontend
echo "🎨 Frontend Status:"
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "   ✅ Frontend running on http://localhost:5173"
elif curl -s http://localhost:5174 > /dev/null 2>&1; then
    echo "   ✅ Frontend running on http://localhost:5174"
elif curl -s http://localhost:5175 > /dev/null 2>&1; then
    echo "   ✅ Frontend running on http://localhost:5175"
else
    echo "   ❌ Frontend not running"
fi

echo ""

# Check processes
echo "🔄 Running Processes:"
if pgrep -f "node.*server.js" > /dev/null; then
    echo "   ✅ Backend process active"
else
    echo "   ❌ Backend process not found"
fi

if pgrep -f "vite" > /dev/null; then
    echo "   ✅ Frontend process active"
else
    echo "   ❌ Frontend process not found"
fi

echo ""

# Show available endpoints
echo "📡 Available Endpoints:"
echo "   🌐 Frontend UI:      http://localhost:5173"
echo "   ⚙️  Backend Health:   http://localhost:3001/health"
echo "   📊 Intent Pool:      http://localhost:3001/api/intent-pool"
echo "   📝 Submit Intent:    http://localhost:3001/api/submit-intent"
echo "   🔧 Optimization:     http://localhost:3001/api/optimization-info"
