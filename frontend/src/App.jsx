import React from "react";
import IntentForm from "./components/IntentForm";
import WalletConnect from "./components/WalletConnect";
import LiveIntents from './components/LiveIntents';
import MatchedIntents from "./components/MatchedIntents"; 

import "./App.css"
const App = () => {
  return (
    <div>
      <WalletConnect />
      <IntentForm />
      
      <MatchedIntents />
      <LiveIntents />
      
    </div>
  );
};

export default App;
