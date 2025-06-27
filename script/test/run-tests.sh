#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting test environment...${NC}"

# Start Anvil
echo -e "${GREEN}Starting Anvil...${NC}"
anvil \
  --host 0.0.0.0 \
  --port 8545 \
  --chain-id 31337 \
  --block-time 2 \
  &

ANVIL_PID=$!

# Wait for Anvil to start
sleep 3

# Deploy contracts and get addresses
echo -e "${GREEN}Deploying contracts...${NC}"
cd ../deployment
DEPLOY_OUTPUT=$(forge script Deploy.s.sol --rpc-url http://localhost:8545 --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80)

# Extract deployed addresses
ETH_TOKEN=$(echo "$DEPLOY_OUTPUT" | grep "ETH Token deployed at:" | awk '{print $NF}')
USDC_TOKEN=$(echo "$DEPLOY_OUTPUT" | grep "USDC Token deployed at:" | awk '{print $NF}')
DAI_TOKEN=$(echo "$DEPLOY_OUTPUT" | grep "DAI Token deployed at:" | awk '{print $NF}')

# Update test script with actual addresses
sed -i "s/ETH: '0x...'/ETH: '$ETH_TOKEN'/" ../test/test-intents.js
sed -i "s/USDC: '0x...'/USDC: '$USDC_TOKEN'/" ../test/test-intents.js
sed -i "s/DAI: '0x...'/DAI: '$DAI_TOKEN'/" ../test/test-intents.js

# Start backend
echo -e "${GREEN}Starting backend...${NC}"
cd ../../backend
npm run start &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Run test intents
echo -e "${GREEN}Submitting test intents...${NC}"
cd ../script/test
node -e "require('./test-intents.js').submitTestIntents()"

# Monitor results
echo -e "${GREEN}Checking balances...${NC}"
node -e "require('./test-intents.js').checkBalances()"

# Cleanup function
cleanup() {
    echo -e "${BLUE}Cleaning up...${NC}"
    kill $ANVIL_PID 2>/dev/null
    kill $BACKEND_PID 2>/dev/null
}

# Set up cleanup on script exit
trap cleanup EXIT

# Keep running to see results
echo -e "${GREEN}Test environment is running. Press Ctrl+C to stop.${NC}"
wait
