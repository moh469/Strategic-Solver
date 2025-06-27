#!/bin/bash

echo "🚀 Starting Anvil with test accounts..."
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --chain-id 31337 \
  --block-time 12 \
  --accounts 10 \
  --balance 100 \
  &

ANVIL_PID=$!

# Wait for Anvil to start
sleep 3

echo "
📝 Test Account Details (DO NOT USE ON MAINNET):
------------------------------------------------
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
Balance: 100 ETH

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
Balance: 100 ETH
------------------------------------------------
"

# Deploy contracts using test account #0
echo "📄 Deploying contracts..."
cd ../deployment
forge script Deploy.s.sol --rpc-url http://localhost:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Start the backend server
echo "🔧 Starting backend services..."
cd ../../backend
npm run start &

BACKEND_PID=$!

# Start the frontend
echo "🎨 Starting frontend..."
cd ../frontend
npm run dev &

FRONTEND_PID=$!

# Cleanup function
cleanup() {
    echo "🧹 Cleaning up..."
    kill $ANVIL_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
}

# Set up cleanup on script exit
trap cleanup EXIT

echo "
✅ Test environment ready!
---------------------------
Local Network: http://localhost:8545
Frontend: http://localhost:5173
Backend: http://localhost:3000

Use Account #0 for testing. These are Anvil test accounts only.
DO NOT use these accounts on any real network!

Press Ctrl+C to stop all services.
"

# Keep script running
wait
