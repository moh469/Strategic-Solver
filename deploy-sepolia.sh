#!/bin/bash

# Secure Deployment Script for Sepolia Testnet
# This script deploys contracts to Sepolia using a private key you provide

echo "🚀 Strategic Solver Contract Deployment Script"
echo "=============================================="

# Check if user has provided a private key
if [ -z "$DEPLOYER_PRIVATE_KEY" ]; then
    echo "❌ Error: DEPLOYER_PRIVATE_KEY environment variable not set"
    echo ""
    echo "Please set your deployer private key:"
    echo "export DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere"
    echo ""
    echo "⚠️  Make sure this account has Sepolia ETH for gas fees"
    echo "💰 Get Sepolia ETH from: https://sepoliafaucet.com/"
    exit 1
fi

# Check if forge is available
if ! command -v forge &> /dev/null; then
    echo "❌ Error: Forge not found. Please install Foundry:"
    echo "curl -L https://foundry.paradigm.xyz | bash"
    echo "foundryup"
    exit 1
fi

echo "🔍 Checking prerequisites..."

# Check RPC connection
RPC_URL="https://1rpc.io/sepolia"
echo "📡 Testing RPC connection to $RPC_URL..."

# Test RPC connection
if ! curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    $RPC_URL > /dev/null; then
    echo "❌ Error: Cannot connect to Sepolia RPC"
    exit 1
fi

echo "✅ RPC connection successful"

# Check if contracts are compiled
echo "🔨 Compiling contracts..."
forge build

if [ $? -ne 0 ]; then
    echo "❌ Error: Contract compilation failed"
    exit 1
fi

echo "✅ Contracts compiled successfully"

# Deploy contracts
echo ""
echo "🚀 Deploying contracts to Sepolia testnet..."
echo "RPC: $RPC_URL"
echo "Deployer: $(cast wallet address $DEPLOYER_PRIVATE_KEY)"

# Check deployer balance
BALANCE=$(cast balance $(cast wallet address $DEPLOYER_PRIVATE_KEY) --rpc-url $RPC_URL)
echo "Balance: $BALANCE ETH"

if [ "$BALANCE" = "0" ]; then
    echo "❌ Error: Deployer account has no ETH"
    echo "💰 Get Sepolia ETH from: https://sepoliafaucet.com/"
    exit 1
fi

echo ""
echo "⏳ Starting deployment..."

# Deploy using forge script and capture output
DEPLOY_OUTPUT=$(forge script script/deployment/Deploy.s.sol:DeployAll \
    --rpc-url $RPC_URL \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --broadcast 2>&1)

if [ $? -ne 0 ]; then
    echo "❌ Deployment failed"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo "$DEPLOY_OUTPUT"

# Extract contract addresses and update .env file
echo ""
echo "📝 Updating .env file with deployed addresses..."

# Parse addresses from deployment output
INTENTS_MANAGER=$(echo "$DEPLOY_OUTPUT" | grep "IntentsManager:" | head -1 | awk '{print $2}')
COW_MATCHER=$(echo "$DEPLOY_OUTPUT" | grep "CoWMatcher:" | head -1 | awk '{print $2}')
CFMM_ADAPTER=$(echo "$DEPLOY_OUTPUT" | grep "CFMMAdapter:" | head -1 | awk '{print $2}')
CROSS_CHAIN_BRIDGE=$(echo "$DEPLOY_OUTPUT" | grep "CrossChainIntentBridge:" | head -1 | awk '{print $2}')
SOLVER_ROUTER=$(echo "$DEPLOY_OUTPUT" | grep "SolverRouter:" | head -1 | awk '{print $2}')

# Update .env file
if [ -f .env ]; then
    # Update existing .env file
    sed -i "s/INTENTS_MANAGER_11155111=.*/INTENTS_MANAGER_11155111=$INTENTS_MANAGER/" .env
    sed -i "s/COW_MATCHER_11155111=.*/COW_MATCHER_11155111=$COW_MATCHER/" .env
    sed -i "s/CFMM_ADAPTER_11155111=.*/CFMM_ADAPTER_11155111=$CFMM_ADAPTER/" .env
    sed -i "s/CROSS_CHAIN_BRIDGE_11155111=.*/CROSS_CHAIN_BRIDGE_11155111=$CROSS_CHAIN_BRIDGE/" .env
    sed -i "s/SOLVER_ROUTER_11155111=.*/SOLVER_ROUTER_11155111=$SOLVER_ROUTER/" .env
else
    # Create .env from template
    if [ -f .env.template ]; then
        cp .env.template .env
        sed -i "s/INTENTS_MANAGER_11155111=.*/INTENTS_MANAGER_11155111=$INTENTS_MANAGER/" .env
        sed -i "s/COW_MATCHER_11155111=.*/COW_MATCHER_11155111=$COW_MATCHER/" .env
        sed -i "s/CFMM_ADAPTER_11155111=.*/CFMM_ADAPTER_11155111=$CFMM_ADAPTER/" .env
        sed -i "s/CROSS_CHAIN_BRIDGE_11155111=.*/CROSS_CHAIN_BRIDGE_11155111=$CROSS_CHAIN_BRIDGE/" .env
        sed -i "s/SOLVER_ROUTER_11155111=.*/SOLVER_ROUTER_11155111=$SOLVER_ROUTER/" .env
    fi
fi

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Check the deployment logs above for contract addresses"
echo "2. Update your .env file with the deployed addresses"
echo "3. Start the backend server"
echo ""
echo "🎉 Ready to run your Strategic Solver dApp!"
