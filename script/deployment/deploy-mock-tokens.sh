#!/bin/bash
# Deploys MockErc20 tokens (USDC, WETH, DAI) to all 4 local Anvil chains and prints addresses for frontend mapping.
# Requires: forge, PRIVATE_KEY, and correct RPC URLs in environment variables or replace inline.

set -e

# Set these or export in your shell
PRIVATE_KEY=${PRIVATE_KEY:-<YOUR_PRIVATE_KEY>}

# RPC URLs for each chain (update if needed)
RPC_31337=http://localhost:8545
RPC_421614=http://localhost:8546
RPC_11155111=http://localhost:8547
RPC_80002=http://localhost:8548

# Deploy function
deploy_token() {
  local name=$1
  local symbol=$2
  local decimals=$3
  local rpc=$4
  local chain=$5
  local out=$(forge create src/MockErc20.sol:MockErc20 --constructor-args "$name" $symbol $decimals --rpc-url $rpc --private-key $PRIVATE_KEY 2>&1)
  local addr=$(echo "$out" | grep "Deployed to:" | awk '{print $3}')
  echo "$chain $symbol $addr"
}

echo "Deploying tokens..."

for chain in 31337 421614 11155111 80002; do
  case $chain in
    31337) rpc=$RPC_31337;;
    421614) rpc=$RPC_421614;;
    11155111) rpc=$RPC_11155111;;
    80002) rpc=$RPC_80002;;
  esac
  usdc=$(deploy_token "USD Coin" USDC 6 $rpc $chain)
  weth=$(deploy_token "Wrapped Ether" WETH 18 $rpc $chain)
  dai=$(deploy_token "Dai Stablecoin" DAI 18 $rpc $chain)
  echo "[$chain] USDC: $(echo $usdc | awk '{print $3}')"
  echo "[$chain] WETH: $(echo $weth | awk '{print $3}')"
  echo "[$chain] DAI:  $(echo $dai | awk '{print $3}')"
  echo ""
done

echo "Copy the above addresses into your frontend token mapping."
