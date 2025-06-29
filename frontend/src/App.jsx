import React from "react";
import IntentForm from "./components/IntentForm";
// import WalletConnect from "./components/WalletConnect";
// import LiveIntents from "./components/LiveIntents";
import IntentPool from "./components/IntentPool";

import "./App.css"

const App = () => {
  console.log("App component rendering...");
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#000', minHeight: '100vh', color: '#fff' }}>
      <h1 style={{ color: '#00ff00', textAlign: 'center', marginBottom: '20px' }}>
        🚀 Strategic Solver - Multi-Stage AI/ML Optimization
      </h1>
      <div style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>
        <p>Submit intents on Sepolia • CoW → CFMM/Linear Programming → ElizaOS Optimization</p>
        <p style={{ fontSize: '14px', color: '#aaa' }}>
          🎯 Three-stage optimization: Direct matching → Pool routing → AI parameter tuning
        </p>
      </div>
      
      <div style={{ border: '1px solid #333', padding: '20px', marginBottom: '20px', backgroundColor: '#111' }}>
        <h3 style={{ color: '#ffaa00' }}>Multi-Stage Optimization Pipeline:</h3>
        <div style={{ marginTop: '10px' }}>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ color: '#00ff00' }}>🎯 Stage 1 - CoW Matching:</p>
            <p style={{ color: '#aaa', fontSize: '14px' }}>Direct user-to-user intent matching</p>
            <p style={{ color: '#aaa', fontSize: '12px' }}>Highest priority • Zero slippage • Minimal gas</p>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <p style={{ color: '#00ff00' }}>📈 Stage 2 - CFMM/LP Optimization:</p>
            <p style={{ color: '#aaa', fontSize: '14px' }}>Linear programming for pool routing</p>
            <p style={{ color: '#aaa', fontSize: '12px' }}>Multi-chain • Liquidity optimization • Cost minimization</p>
          </div>
          <div>
            <p style={{ color: '#00ff00' }}>🧠 Stage 3 - ElizaOS Enhancement:</p>
            <p style={{ color: '#aaa', fontSize: '14px' }}>AI parameter optimization & learning</p>
            <p style={{ color: '#aaa', fontSize: '12px' }}>Market adaptation • Risk scoring • Continuous improvement</p>
          </div>
        </div>
      </div>

      <IntentForm />
      <IntentPool />
      
    </div>
  );
};

export default App;
