# MetaMask-Based Deployment Guide

This project now uses MetaMask for all deployments and transactions, ensuring no private keys are hardcoded in the codebase.

## 🔐 Security Features

- **No Hardcoded Private Keys**: All private keys have been removed from the codebase
- **MetaMask Integration**: All deployments and user transactions go through MetaMask
- **User-Controlled**: Users maintain full control over their private keys
- **Secure by Default**: No sensitive information stored in environment files

## 🚀 Deployment Process

### Frontend Deployment (Recommended)

1. **Start the Frontend**:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Connect MetaMask**:
   - Open http://localhost:5173
   - Click "Connect MetaMask"
   - Ensure you're on the correct network (Sepolia for testing)

3. **Deploy Contracts**:
   - Find the "Contract Deployment" section
   - Click "Deploy All Contracts"
   - Approve each transaction in MetaMask
   - Contract addresses will be automatically updated in the backend

### Backend Integration

The backend automatically receives the deployed contract addresses and updates its configuration. No manual configuration needed!

## 🔧 Environment Variables

The `.env` file now only contains:
- RPC URLs (public)
- Network configurations (public)
- Placeholder addresses (updated automatically after deployment)

**No private keys are stored anywhere in the codebase.**

## 🎯 User Transactions

All user transactions are handled through MetaMask:
- Intent submissions
- Token approvals
- Settlement transactions
- Cross-chain operations

## 🔄 Development Workflow

1. Deploy contracts via frontend MetaMask integration
2. Start backend server (automatically uses deployed addresses)
3. Submit intents through frontend
4. All transactions signed via MetaMask

## ⚠️ Important Notes

- Ensure you have test ETH on Sepolia for gas fees
- Keep your MetaMask secure and backed up
- The system works entirely through user-controlled wallets
- No server-side transaction signing
