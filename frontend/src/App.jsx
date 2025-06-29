import React from "react";
import IntentForm from "./components/IntentForm";
import WalletConnect from "./components/WalletConnect";
import LiveIntents from "./components/LiveIntents";

import "./App.css"
const App = () => {
  return (
    <div style={{ padding: '20px', backgroundColor: '#000', minHeight: '100vh' }}>
      <h1 style={{ color: '#00ff00', textAlign: 'center', marginBottom: '20px' }}>
        🚀 Strategic Solver - Intent Processing
      </h1>
      <div style={{ color: '#fff', textAlign: 'center', marginBottom: '20px' }}>
        <p>Submit intents on Sepolia • Solver finds optimal execution (local or cross-chain)</p>
      </div>
      <WalletConnect />
      <IntentForm />
      <LiveIntents />
    </div>
  );
};

export default App;
