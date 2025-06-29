#!/bin/bash

echo "🚀 Starting Strategic Solver Full Stack..."
echo "=========================================="

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    jobs -p | xargs -r kill
    exit 0
}

# Set trap for cleanup on Ctrl+C
trap cleanup SIGINT

# Start backend in background
echo "🔧 Starting backend server..."
cd /home/mg/Strategic-Solver/backend
npm start &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Check if backend is running
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:3001"
else
    echo "❌ Failed to start backend"
    exit 1
fi

# Start frontend in background
echo "🎨 Starting frontend server..."
cd /home/mg/Strategic-Solver/frontend
npm run dev &
FRONTEND_PID=$!

# Wait a moment for frontend to start
sleep 5

# Check if frontend is running
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ Frontend is running on http://localhost:5173"
else
    echo "⚠️ Frontend may still be starting..."
fi

echo ""
echo "🎉 Strategic Solver is now running!"
echo "================================="
echo "📱 Frontend: http://localhost:5173"
echo "⚙️  Backend:  http://localhost:3001"
echo "📊 Health:   http://localhost:3001/health"
echo "🎯 Pool:     http://localhost:3001/api/intent-pool"
echo ""
echo "💡 Next steps:"
echo "  1. Open http://localhost:5173 in your browser"
echo "  2. Connect MetaMask to Sepolia Testnet"
echo "  3. Get test tokens from faucets"
echo "  4. Submit intents and watch CoW matching!"
echo ""
echo "Press Ctrl+C to stop all servers"

# Wait for both processes
wait
