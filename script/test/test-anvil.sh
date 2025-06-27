#!/bin/bash
# test-anvil.sh: Launch Anvil, deploy contracts, run backend, and submit test intents

set -e

# 1. Start Anvil (local Ethereum testnet)
ANVIL_PID=""
echo "Starting Anvil..."
anvil --port 8545 --silent &
ANVIL_PID=$!
sleep 3

# 2. Deploy contracts (assume you have a script for this)
echo "Deploying contracts to Anvil..."
forge script script/deployment/Deploy.s.sol --fork-url http://127.0.0.1:8545 --broadcast --private-key $PRIVATE_KEY --legacy

# 3. Start backend (in background)
echo "Starting backend..."
cd backend
npm install
env ANVIL_RPC="http://127.0.0.1:8545" PRIVATE_KEY="$PRIVATE_KEY" npm start &
BACKEND_PID=$!
cd ..
sleep 5

# 4. Submit test intents (using curl or a Node script)
echo "Submitting test intents..."
node script/test/submitTestIntents.js

# 5. Wait and print results
echo "Waiting for batch execution..."
sleep 10
node script/test/checkBatchResults.js

# 6. Cleanup
kill $BACKEND_PID
kill $ANVIL_PID
