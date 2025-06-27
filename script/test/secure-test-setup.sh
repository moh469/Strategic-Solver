#!/bin/bash

# Ensure we're in a testing environment
if [[ "$NODE_ENV" != "test" ]]; then
  echo "Error: This script should only run in test environment"
  exit 1
fi

# Start Anvil with deterministic accounts but no real private keys
echo "Starting Anvil with test accounts..."
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --chain-id 31337 \
  --block-time 12 \
  &

ANVIL_PID=$!

# Cleanup on script exit
trap "kill $ANVIL_PID" EXIT

echo "
🔒 SECURITY REMINDER 🔒
------------------------
1. You are using a local test network
2. Use only test accounts for development
3. Never input your real private keys
4. Test accounts are public and only for development
------------------------
"

# Wait for Anvil to start
sleep 3

# Deploy contracts using a test account
echo "Deploying contracts with test account..."
cd ../deployment
forge script Deploy.s.sol --rpc-url http://localhost:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

echo "
✅ Setup Complete
-----------------
Network: http://localhost:8545
Chain ID: 31337
Test Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

Remember: These are TEST accounts only. Never use real private keys.
"
