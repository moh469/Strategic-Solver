#!/bin/bash

# Load environment variables
source .env.test

# Start Anvil with deterministic accounts
echo "Starting Anvil..."
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --block-time 12 \
  --chain-id 31337 \
  &

# Wait for Anvil to start
sleep 5

# Deploy contracts
echo "Deploying contracts..."
cd script/deployment
forge script Deploy.s.sol --rpc-url http://localhost:8545 --broadcast --private-key $PRIVATE_KEY

# Copy deployed addresses to frontend
echo "Updating frontend configuration..."
cp networks.json ../../frontend/src/config/
