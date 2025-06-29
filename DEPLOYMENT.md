# 🚀 Strategic Solver Deployment Guide

## Prerequisites

1. **Foundry Installed**
   ```bash
   curl -L https://foundry.paradigm.xyz | bash
   foundryup
   ```

2. **Sepolia ETH**
   - Get test ETH from: https://sepoliafaucet.com/
   - You'll need ~0.01 ETH for deployment gas fees

## 🔐 Secure Deployment Process

### Step 1: Setup Environment
```bash
# Copy the environment template
cp .env.template .env

# Edit .env and add your deployer private key
nano .env
```

Add your private key to the `.env` file:
```bash
DEPLOYER_PRIVATE_KEY=0xYourPrivateKeyHere
```

⚠️ **Security Notes:**
- Use a separate deployer account, not your main wallet
- Never commit private keys to version control
- Only use testnet funds

### Step 2: Deploy Contracts
```bash
# Make deployment script executable
chmod +x deploy-sepolia.sh

# Run deployment
./deploy-sepolia.sh
```

The script will:
1. ✅ Check prerequisites (Foundry, RPC connection, balance)
2. 🔨 Compile contracts
3. 🚀 Deploy all contracts to Sepolia
4. 📝 Automatically update `.env` with deployed addresses

### Step 3: Start Backend
```bash
cd backend
npm start
```

### Step 4: Start Frontend
```bash
cd frontend
npm run dev
```

## 📋 Deployed Contracts

After deployment, you'll have:
- **IntentsManager**: Core intent management
- **CoWMatcher**: Coincidence of Wants matching
- **CFMMAdapter**: CFMM/DEX integration
- **CrossChainIntentBridge**: Cross-chain functionality
- **SolverRouter**: Settlement routing

## 🔍 Verification

Check deployment status:
```bash
# Backend health check
curl http://localhost:3001/health

# Contract status
curl http://localhost:3001/api/contracts/status

# Frontend
open http://localhost:5173
```

## 🛠️ Troubleshooting

**Deployment fails with "insufficient funds":**
- Get more Sepolia ETH from the faucet
- Check your deployer account balance

**Backend can't connect to contracts:**
- Verify addresses in `.env` are correct
- Check RPC connection
- Restart backend after deployment

**Frontend can't submit transactions:**
- Connect MetaMask to Sepolia network
- Ensure MetaMask account has test ETH
- Check contract addresses in frontend config

## 🔄 Re-deployment

To redeploy (e.g., after contract changes):
```bash
# Redeploy contracts (will update .env automatically)
./deploy-sepolia.sh

# Restart backend to pick up new addresses
cd backend && npm restart
```

## 🌐 Network Configuration

- **Network**: Sepolia Testnet
- **Chain ID**: 11155111
- **RPC**: https://sepolia.drpc.org
- **Block Explorer**: https://sepolia.etherscan.io/

---

✅ **You're ready to test the Strategic Solver cross-chain intent matching system!**
