# 🚀 Strategic Solver - Execution Scripts

## Quick Start

### 1. Start Everything
```bash
# Start both frontend and backend
./start-all.sh
```

### 2. Start Individual Services
```bash
# Backend only
./start-backend.sh

# Frontend only  
./start-frontend.sh
```

### 3. Test with Sample Intents
```bash
# Run comprehensive intent tests
./test-intents.sh

# Quick CoW matching test
./quick-test.sh
```

### 4. Health Check
```bash
# Check system status
./health-check.sh
```

## 📋 Script Details

### `start-all.sh`
- Starts both backend and frontend servers
- Runs health checks
- Shows all available endpoints
- Handles graceful shutdown with Ctrl+C

### `start-backend.sh` 
- Starts the backend server on port 3001
- Displays configuration and features
- Handles dependency installation

### `start-frontend.sh`
- Starts the React frontend on port 5173
- Vite development server with hot reload
- Shows MetaMask integration details

### `test-intents.sh`
- Comprehensive intent testing suite
- 4 different test scenarios:
  1. Individual intent submission
  2. CoW matching pairs
  3. Batch optimization
  4. Cross-token swaps
- Real-time pool monitoring

### `quick-test.sh`
- Fast CoW matching test
- Submits 2 matching intents
- Shows results in 10 seconds

### `health-check.sh`
- System status overview
- Process monitoring
- Endpoint availability
- Intent pool statistics

## 🌐 URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend UI | http://localhost:5173 | React application |
| Backend Health | http://localhost:3001/health | Health check |
| Intent Pool | http://localhost:3001/api/intent-pool | Pool status |
| Submit Intent | http://localhost:3001/api/submit-intent | API endpoint |

## 🎯 Testing Flow

1. **Start Services**: `./start-all.sh`
2. **Check Health**: `./health-check.sh` 
3. **Test via API**: `./test-intents.sh`
4. **Test via UI**: Open http://localhost:5173
5. **Monitor**: Watch backend logs and pool status

## 💡 Frontend UI Testing

1. Open http://localhost:5173
2. Connect MetaMask to Sepolia Testnet
3. Fill intent form:
   - Sell Token: USDC
   - Buy Token: WETH
   - Sell Amount: 100
   - Min Buy Amount: 0.05
4. Click "Submit Intent"
5. MetaMask will prompt for:
   - Token approval (if needed)
   - Intent signature
6. Watch optimization in backend logs

## 🔧 Configuration

- **Backend Port**: 3001
- **Frontend Port**: 5173
- **Chain**: Sepolia Testnet (11155111)
- **Tokens**: USDC, WETH, DAI, ETH, USD
- **MetaMask**: Required for UI testing

## 📊 Features Tested

✅ **Intent Submission**: API and UI  
✅ **MetaMask Integration**: Signatures and approvals  
✅ **CoW Matching**: Real-time user-to-user matching  
✅ **Pool Routing**: CFMM/AMM optimization  
✅ **AI Enhancement**: ElizaOS parameter tuning  
✅ **Cross-Chain**: Sepolia ↔ Fuji bridge support  
✅ **Real-Time**: Automatic settlement every 10s  

## 🚨 Troubleshooting

**Backend won't start**:
- Check .env file exists in backend/
- Verify RPC URLs are working
- Run `npm install` in backend/

**Frontend won't load**:
- Check if port 5173 is available
- Run `npm install` in frontend/
- Clear browser cache

**MetaMask issues**:
- Switch to Sepolia testnet
- Get test tokens from faucets
- Reset account if needed

**CoW matching not working**:
- Ensure intents have compatible amounts
- Check backend logs for optimization details
- Wait for settlement cycle (10s)
