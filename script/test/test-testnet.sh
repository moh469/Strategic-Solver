#!/bin/bash
# test-testnet.sh: Run backend and submit/test intents on a real testnet (e.g., Sepolia or Avalanche Fuji)

set -e

# 1. Start backend (assume .env is set for testnet)
echo "Starting backend for testnet..."
cd backend
npm install
npm start &
BACKEND_PID=$!
cd ..
sleep 5

# 2. Submit test intents (using curl or a Node script)
echo "Submitting test intents to testnet..."
node script/test/submitTestIntents.js

# 3. Wait and print results
echo "Waiting for batch execution..."
sleep 20
node script/test/checkBatchResults.js

# 4. Cleanup
kill $BACKEND_PID
