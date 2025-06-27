#!/bin/bash
set -e

echo "🚀 Starting complete system test..."

# 1. Start Anvil
echo "Starting Anvil..."
anvil --port 8545 --block-time 2 &
ANVIL_PID=$!

# Wait for Anvil to start
sleep 3

# 2. Deploy contracts
echo "Deploying contracts..."
cd /home/mg/Strategic-Solver
forge script script/deployment/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 3. Start backend
echo "Starting backend services..."
cd ../../backend
npm install
npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# 4. Start frontend
echo "Starting frontend..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 5

# 5. Submit test batch
echo "Submitting test batch..."
cd ../script/test
node submitTestIntents.js

# 6. Monitor results
echo "Monitoring batch execution..."
node checkBatchResults.js

# Keep running for 30 seconds to see results
sleep 30

# Cleanup
echo "Cleaning up..."
kill $ANVIL_PID
kill $BACKEND_PID
kill $FRONTEND_PID

echo "Test complete! Check the output above for results."
