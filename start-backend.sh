#!/bin/bash

echo "🚀 Starting Strategic Solver Backend..."
echo "=================================="

# Navigate to backend directory
cd /home/mg/Strategic-Solver/backend

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found in backend directory"
    echo "Please ensure .env is properly configured with:"
    echo "  - RPC URLs for Sepolia and Fuji testnets"
    echo "  - Contract addresses"
    exit 1
fi

echo "✅ Environment file found"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

echo "🔧 Configuration:"
echo "  - Chain: Sepolia Testnet (11155111)"
echo "  - Port: 3001"
echo "  - CORS: Enabled for frontend"

echo ""
echo "🎯 Backend Features:"
echo "  ✅ Intent submission with MetaMask signature verification"
echo "  ✅ Multi-stage optimization (CoW → CFMM → ElizaOS AI)"
echo "  ✅ Automatic settlement every 10 seconds"
echo "  ✅ Real-time intent pool management"
echo "  ✅ Cross-chain bridge support (Sepolia ↔ Fuji)"

echo ""
echo "📡 Starting server..."
npm start
