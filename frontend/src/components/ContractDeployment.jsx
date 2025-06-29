import React, { useState } from 'react';
import { ethers } from 'ethers';

// Import contract ABIs and bytecode
import IntentsManagerABI from '../../../out/IntentsManager.sol/IntentsManager.json';
import CoWMatcherABI from '../../../out/CoWMatcher.sol/CoWMatcher.json';
import CFMMAdapterABI from '../../../out/CFMMAdapter.sol/CFMMAdapter.json';
import CrossChainIntentBridgeABI from '../../../out/CrossChainIntentBridge.sol/CrossChainIntentBridge.json';
import SolverRouterABI from '../../../out/SolverRouter.sol/SolverRouter.json';

const ContractDeployment = () => {
  const [deployedAddresses, setDeployedAddresses] = useState({});
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentLog, setDeploymentLog] = useState([]);

  const addLog = (message) => {
    setDeploymentLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const deployContracts = async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask to deploy contracts");
      return;
    }

    try {
      setIsDeploying(true);
      setDeploymentLog([]);
      addLog("Starting contract deployment via MetaMask...");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      
      addLog(`Deploying with address: ${userAddress}`);

      // Required addresses for deployment
      const UNISWAP_ROUTER_ADDRESS = "0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008"; // Sepolia
      const CCIP_ROUTER_ADDRESS = "0x0BF3dE8c5D3e8A2B34D2BEeB17ABfCeBaf363A59"; // Sepolia

      // Deploy IntentsManager
      addLog("Deploying IntentsManager...");
      const IntentsManagerFactory = new ethers.ContractFactory(
        IntentsManagerABI.abi,
        IntentsManagerABI.bytecode,
        signer
      );
      const intentsManager = await IntentsManagerFactory.deploy();
      await intentsManager.waitForDeployment();
      const intentsManagerAddress = await intentsManager.getAddress();
      addLog(`✅ IntentsManager deployed at: ${intentsManagerAddress}`);

      // Deploy CoWMatcher
      addLog("Deploying CoWMatcher...");
      const CoWMatcherFactory = new ethers.ContractFactory(
        CoWMatcherABI.abi,
        CoWMatcherABI.bytecode,
        signer
      );
      const cowMatcher = await CoWMatcherFactory.deploy(intentsManagerAddress);
      await cowMatcher.waitForDeployment();
      const cowMatcherAddress = await cowMatcher.getAddress();
      addLog(`✅ CoWMatcher deployed at: ${cowMatcherAddress}`);

      // Deploy CFMMAdapter
      addLog("Deploying CFMMAdapter...");
      const CFMMAdapterFactory = new ethers.ContractFactory(
        CFMMAdapterABI.abi,
        CFMMAdapterABI.bytecode,
        signer
      );
      const cfmmAdapter = await CFMMAdapterFactory.deploy(UNISWAP_ROUTER_ADDRESS);
      await cfmmAdapter.waitForDeployment();
      const cfmmAdapterAddress = await cfmmAdapter.getAddress();
      addLog(`✅ CFMMAdapter deployed at: ${cfmmAdapterAddress}`);

      // Deploy CrossChainIntentBridge
      addLog("Deploying CrossChainIntentBridge...");
      const CrossChainBridgeFactory = new ethers.ContractFactory(
        CrossChainIntentBridgeABI.abi,
        CrossChainIntentBridgeABI.bytecode,
        signer
      );
      const crossChainBridge = await CrossChainBridgeFactory.deploy(
        intentsManagerAddress,
        CCIP_ROUTER_ADDRESS
      );
      await crossChainBridge.waitForDeployment();
      const crossChainBridgeAddress = await crossChainBridge.getAddress();
      addLog(`✅ CrossChainIntentBridge deployed at: ${crossChainBridgeAddress}`);

      // Deploy SolverRouter
      addLog("Deploying SolverRouter...");
      const SolverRouterFactory = new ethers.ContractFactory(
        SolverRouterABI.abi,
        SolverRouterABI.bytecode,
        signer
      );
      const solverRouter = await SolverRouterFactory.deploy();
      await solverRouter.waitForDeployment();
      const solverRouterAddress = await solverRouter.getAddress();
      addLog(`✅ SolverRouter deployed at: ${solverRouterAddress}`);

      const addresses = {
        IntentsManager: intentsManagerAddress,
        CoWMatcher: cowMatcherAddress,
        CFMMAdapter: cfmmAdapterAddress,
        CrossChainIntentBridge: crossChainBridgeAddress,
        SolverRouter: solverRouterAddress
      };

      setDeployedAddresses(addresses);
      addLog("🎉 All contracts deployed successfully!");
      
      // Send addresses to backend to update configuration
      try {
        await fetch('http://localhost:3001/api/update-contract-addresses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addresses })
        });
        addLog("✅ Backend configuration updated with new addresses");
      } catch (err) {
        addLog("⚠️ Failed to update backend configuration - please update manually");
      }

    } catch (error) {
      console.error("Deployment failed:", error);
      addLog(`❌ Deployment failed: ${error.message}`);
    } finally {
      setIsDeploying(false);
    }
  };

  const copyAddresses = () => {
    const addressText = Object.entries(deployedAddresses)
      .map(([name, address]) => `${name}: ${address}`)
      .join('\n');
    navigator.clipboard.writeText(addressText);
    alert("Addresses copied to clipboard!");
  };

  return (
    <div className="bg-black text-white p-6 border-2 border-green-500 rounded-lg max-w-4xl mx-auto mt-8">
      <h2 className="text-2xl font-bold text-green-400 mb-4">Contract Deployment via MetaMask</h2>
      
      <div className="mb-6">
        <button
          onClick={deployContracts}
          disabled={isDeploying}
          className={`px-6 py-3 rounded font-semibold ${
            isDeploying 
              ? 'bg-gray-600 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {isDeploying ? 'Deploying...' : 'Deploy All Contracts'}
        </button>
      </div>

      {/* Deployment Log */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-green-400 mb-2">Deployment Log:</h3>
        <div className="bg-gray-900 p-4 rounded max-h-60 overflow-y-auto">
          {deploymentLog.map((log, index) => (
            <div key={index} className="text-sm font-mono mb-1">{log}</div>
          ))}
          {deploymentLog.length === 0 && (
            <div className="text-gray-500">Click "Deploy All Contracts" to start...</div>
          )}
        </div>
      </div>

      {/* Deployed Addresses */}
      {Object.keys(deployedAddresses).length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold text-green-400">Deployed Addresses:</h3>
            <button
              onClick={copyAddresses}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
            >
              Copy All
            </button>
          </div>
          <div className="bg-gray-900 p-4 rounded">
            {Object.entries(deployedAddresses).map(([name, address]) => (
              <div key={name} className="flex justify-between items-center mb-2">
                <span className="font-semibold">{name}:</span>
                <span className="font-mono text-sm break-all">{address}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractDeployment;
