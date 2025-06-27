#!/bin/bash
set -e

echo "🚀 Setting up test environment..."

# Kill any existing Anvil instances
pkill -f anvil || true
sleep 2

# Export environment variables
export DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export ANVIL_RPC=http://localhost:8545
export CHAIN_ID=31337
export UNISWAP_ROUTER_ADDRESS=0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
export CCIP_ROUTER_ADDRESS=0x70E63E1D4a18980aFc761F8c5456010aa569cA6E

# 1. Start Anvil with deterministic accounts
echo "Starting Anvil..."
anvil \
  --port 8545 \
  --block-time 2 \
  --chain-id 31337 \
  &

ANVIL_PID=$!

# Wait for Anvil to start
sleep 3

# 2. Deploy contracts
echo "Deploying contracts..."
cd /home/mg/Strategic-Solver

# Deploy and capture output
DEPLOY_OUTPUT=$(forge script script/deployment/Deploy.s.sol --rpc-url $ANVIL_RPC --broadcast --private-key $DEPLOYER_PRIVATE_KEY)

# Extract contract addresses
INTENTS_MANAGER=$(echo "$DEPLOY_OUTPUT" | grep "IntentsManager:" | awk '{print $2}')
COW_MATCHER=$(echo "$DEPLOY_OUTPUT" | grep "CoWMatcher:" | awk '{print $2}')
CFMM_ADAPTER=$(echo "$DEPLOY_OUTPUT" | grep "CFMMAdapter:" | awk '{print $2}')
CROSS_CHAIN_BRIDGE=$(echo "$DEPLOY_OUTPUT" | grep "CrossChainIntentBridge:" | awk '{print $2}')
SOLVER_ROUTER=$(echo "$DEPLOY_OUTPUT" | grep "SolverRouter:" | awk '{print $2}')

# Update backend .env file
cat > backend/.env << EOF
ANVIL_RPC=$ANVIL_RPC
CHAIN_ID=$CHAIN_ID
DEPLOYER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY
MATCHER_PRIVATE_KEY=$DEPLOYER_PRIVATE_KEY
INTENTS_MANAGER=$INTENTS_MANAGER
COW_MATCHER=$COW_MATCHER
CFMM_ADAPTER=$CFMM_ADAPTER
CROSS_CHAIN_BRIDGE=$CROSS_CHAIN_BRIDGE
SOLVER_ROUTER=$SOLVER_ROUTER
UNISWAP_ROUTER_ADDRESS=$UNISWAP_ROUTER_ADDRESS
CCIP_ROUTER_ADDRESS=$CCIP_ROUTER_ADDRESS
EOF

echo "Updated backend/.env with deployed contract addresses:"
echo "INTENTS_MANAGER=$INTENTS_MANAGER"
echo "COW_MATCHER=$COW_MATCHER"
echo "CFMM_ADAPTER=$CFMM_ADAPTER"
echo "CROSS_CHAIN_BRIDGE=$CROSS_CHAIN_BRIDGE"
echo "SOLVER_ROUTER=$SOLVER_ROUTER"

# 3. Start backend
echo "Starting backend services..."
cd backend
npm install
PORT=3001 npm start &
BACKEND_PID=$!

# Wait for backend to start
echo "Waiting for backend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3001/health > /dev/null; then
        echo "Backend is ready!"
        break
    fi
    sleep 1
done

# 4. Start frontend
echo "Starting frontend..."
cd ../frontend
npm install
PORT=3000 npm run dev &
FRONTEND_PID=$!

# Wait for frontend to start
echo "Waiting for frontend to start..."
for i in {1..30}; do
    if curl -s http://localhost:3000 > /dev/null; then
        echo "Frontend is ready!"
        break
    fi
    sleep 1
done

# Function to cleanup background processes
cleanup() {
    echo "Cleaning up..."
    kill $ANVIL_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    pkill -f anvil || true
}

# Set up trap to call cleanup on script exit
trap cleanup EXIT

# Wait for frontend to start
sleep 5

echo "🚀 System is ready! Running tests..."

# 5. Run test intents
echo "Submitting test intents..."
cd ../script/test
node submitTestIntents.js

# 6. Check results
echo "Checking batch results..."
node checkBatchResults.js

echo "✅ Tests completed successfully!"

# Wait for frontend to start
sleep 5

# 5. Submit test batch
echo "Submitting test batch..."
cd ../script/test
node submitTestIntents.js

# Monitor results for 30 seconds
echo "Monitoring batch execution..."
for i in {1..6}; do
    sleep 5
    node checkBatchResults.js
done

# Cleanup
echo "Cleaning up..."
kill $ANVIL_PID
kill $BACKEND_PID
kill $FRONTEND_PID

echo "Test complete! Check the output above for results."
