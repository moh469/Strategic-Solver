# Secure Testing Guide

## Test Account Setup

1. **Never use your main MetaMask account for testing**
2. **Create a dedicated test account in MetaMask**
3. **Use Anvil's built-in test accounts for local development**

## Anvil Test Accounts
These accounts are safe to use as they only exist on your local network:

Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d

These are publicly known test accounts with no real value.

## Security Best Practices

1. Keep your real MetaMask private key secure:
   - Never share or expose your real private key
   - Never add it to any configuration files
   - Never commit it to version control

2. For local testing:
   - Use Anvil's test accounts
   - Network: http://localhost:8545
   - Chain ID: 31337

3. For testnet testing:
   - Create a separate MetaMask account
   - Only keep small amounts of test tokens
   - Use testnet faucets for test tokens

## Safe Testing Process

1. Start Anvil local network
2. Import a test account to MetaMask using Anvil's test private key
3. Switch MetaMask to Localhost 8545 network
4. Test your transactions
5. Never use these test accounts on mainnet
