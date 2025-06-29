#!/bin/bash

echo "🎨 Starting Strategic Solver Frontend..."
echo "======================================"

# Navigate to frontend directory
cd /home/mg/Strategic-Solver/frontend

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

echo "🔧 Configuration:"
echo "  - Framework: React + Vite"
echo "  - MetaMask: Integrated with ethers.js v6"
echo "  - Backend API: http://localhost:3001"

echo ""
echo "🎯 Frontend Features:"
echo "  ✅ MetaMask wallet connection"
echo "  ✅ Balance checking and token approvals"
echo "  ✅ Intent signing with MetaMask"
echo "  ✅ Real-time intent submission"
echo "  ✅ Multi-token support (USDC, WETH, DAI, ETH, USD)"
echo "  ✅ Sepolia testnet integration"

echo ""
echo "🌐 Starting development server..."
echo "💡 Frontend will be available at: http://localhost:5173 (or next available port)"
echo "🔗 Make sure MetaMask is connected to Sepolia Testnet"

npm run dev
