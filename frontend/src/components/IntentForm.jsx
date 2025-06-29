import React, { useState } from 'react';
import { ethers } from 'ethers';
import { requestSignature } from "../utils/metamask";

const erc20Abi = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address owner) public view returns (uint256)"
];

// Supported chains for dropdowns - Intent submission happens on Sepolia, 
// but solver can execute across multiple chains based on optimal routing
const chainOptions = [
  { label: "Sepolia Testnet (Intent Submission)", value: "11155111" },
  // { label: "Avalanche Fuji Testnet", value: "43113" }, // Future cross-chain support
];

// Token addresses per chain (TESTNET FAUCET TOKENS ONLY)
const tokenAddresses = {
  11155111: { // Sepolia Testnet - Real faucet tokens
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Sepolia USDC (faucet available)
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", // Sepolia WETH (faucet available)
    DAI:  "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", // Sepolia DAI (faucet available)
  },
  43113: { // Avalanche Fuji Testnet - Real faucet tokens
    USDC: "0x5425890298aed601595a70AB815c96711a31Bc65", // Fuji USDC (faucet available)
    WETH: "0x1D308089a2D1Ced3f1Ce36B1FcaF815b07217be3", // Fuji WETH (faucet available) 
    DAI:  "0x51BC2DfB9D12d9dB50C855A5330fBA0faF761D15", // Fuji DAI (faucet available)
  },
};

const cowMatcherAddress = "0x9D40c36453eda0a5d565739318356416e2bfaFEe"; // Deployed CoWMatcher address

const IntentForm = () => {
  const [sellToken, setSellToken] = useState('');
  const [buyToken, setBuyToken] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [minBuyAmount, setMinBuyAmount] = useState('');
  const [sourceChain, setSourceChain] = useState('11155111'); // Default to Sepolia where intents are submitted
  const [orderType, setOrderType] = useState('Limit Buy');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (!window.ethereum) {
        alert("Please install MetaMask.");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const sellTokenAddress = tokenAddresses[sourceChain]?.[sellToken];
      const parsedAmount = ethers.parseUnits(sellAmount.toString(), 18);

      if (!sellTokenAddress) {
        alert("❌ Invalid token or chain");
        return;
      }

      const tokenContract = new ethers.Contract(sellTokenAddress, erc20Abi, signer);

      // 🔍 Check balance - user must get tokens from faucets
      const balance = await tokenContract.balanceOf(userAddress);
      if (balance < parsedAmount) {
        const faucetLinks = {
          11155111: {
            USDC: "https://faucet.circle.com/",
            WETH: "https://sepoliafaucet.com/",
            DAI: "https://faucet.paradigm.xyz/"
          },
          43113: {
            USDC: "https://faucet.avax.network/",
            WETH: "https://faucet.avax.network/", 
            DAI: "https://faucet.avax.network/"
          }
        };
        
        const faucetUrl = faucetLinks[sourceChain]?.[sellToken];
        alert(`❌ Insufficient ${sellToken} balance. Please get testnet tokens from: ${faucetUrl || 'testnet faucet'}`);
        return;
      }

      // 🔐 Approve tokens if needed
      const allowance = await tokenContract.allowance(userAddress, cowMatcherAddress);
      if (allowance < parsedAmount) {
        console.log("🔐 Not enough allowance. Requesting approval...");
        const approvalTx = await tokenContract.approve(cowMatcherAddress, ethers.MaxUint256);
        await approvalTx.wait();
        console.log("✅ Approved with MetaMask:", approvalTx.hash);
      } else {
        console.log("✅ Sufficient allowance already granted");
      }

      // 🚀 Submit intent to backend
      const response = await fetch("http://localhost:3001/api/submit-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellToken,
          buyToken,
          sellAmount,
          minBuyAmount,
          chainId: Number(sourceChain),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        alert("✅ Intent submitted! Tx: " + result.txHash);
      } else {
        alert("❌ Failed: " + result.error);
      }
    } catch (err) {
      console.error("🔥 Error:", err);
      alert("Something went wrong: " + err.message);
    }
  };

  // New function to sign and submit intent
  async function handleIntentSubmission(intent) {
    try {
        const message = JSON.stringify(intent);
        const { signature, address } = await requestSignature(message);

        // Send the signed intent to the backend
        const response = await fetch("/verify-signature", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message, signature, address })
        });

        const result = await response.json();
        console.log("Backend response:", result);
    } catch (error) {
        console.error("Error handling intent submission:", error);
    }
}

  return (
   <form onSubmit={handleSubmit} style={formStyle}>
   <div style={{ marginBottom: '1rem', padding: '10px', backgroundColor: '#111', border: '1px solid #00ff00', borderRadius: '4px' }}>
     <p style={{ margin: '0', color: '#00ff00', fontSize: '14px' }}>
       💡 <strong>How it works:</strong> Submit intent on Sepolia → Solver finds optimal execution plan → 
       Settlement happens locally or cross-chain based on best available liquidity
     </p>
   </div>
  <div style={gridContainerStyle}>
    <div style={gridItemStyle}>
      <Dropdown label="Sell Token" value={sellToken} setValue={setSellToken} options={["USDC", "WETH", "DAI"]} />
    </div>
    <div style={gridItemStyle}>
      <Dropdown label="Buy Token" value={buyToken} setValue={setBuyToken} options={["USDC", "WETH", "DAI"]} />
    </div>
    <div style={gridItemStyle}>
      <Input label="Sell Amount" value={sellAmount} setValue={setSellAmount} />
    </div>
    <div style={gridItemStyle}>
      <Input label="Min Buy Amount" value={minBuyAmount} setValue={setMinBuyAmount} />
    </div>
    <div style={gridItemStyle}>
      <Dropdown label="Intent Submission Chain" value={sourceChain} setValue={setSourceChain} options={chainOptions.map(opt => ({ label: opt.label, value: opt.value }))} />
    </div>
  </div>

  {/* Full-width row for Order Type */}
  <div style={{ marginBottom: '1rem' }}>
    <Dropdown label="Order Type" value={orderType} setValue={setOrderType} options={["Limit Buy", "Limit Sell"]} />
  </div>



  <button type="submit" style={buttonStyle}>Submit Intent</button>
</form>

  );
};

// Reusable components
const Dropdown = ({ label, value, setValue, options }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label>{label}:</label>
    <select value={value} onChange={(e) => setValue(e.target.value)} style={selectStyle}>
      <option value="">Select {label}</option>
      {options.map(opt => typeof opt === 'string' ? (
        <option key={opt} value={opt}>{opt}</option>
      ) : (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

const Input = ({ label, value, setValue }) => (
  <div style={{ marginBottom: '1rem' }}>
    <label>{label}:</label>
    <input type="number" value={value} onChange={(e) => setValue(e.target.value)} style={inputStyle} />
  </div>
);

// Styles
const formStyle = {
  backgroundColor: '#000',
  color: '#fff',
  maxWidth: '600px',
  marginTop: '80px',
  margin: '60px auto',
  border: '2px solid #00ff00',
  padding: '0.8rem',
  borderRadius: '8px',
  boxShadow: '0 0 15px #00ff00' 
};
const selectStyle = {
  width: '100%',
  padding: '0.4rem',
  borderRadius: '4px',
  border: '1px solid #00ff00',
  backgroundColor: '#000',
  color: 'green'
};

const inputStyle = {
  width: '100%',
  padding: '0.4rem',
  borderRadius: '4px',
  border: '1px solid #00ff00',
  backgroundColor: 'black',
  color: 'green'
};
const gridContainerStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
  marginBottom: '1rem',
};

const gridItemStyle = {
  width: '100%',
};


const buttonStyle = {
  width: '100%',
  height: '40px',
  borderRadius: '4px',
  backgroundColor: 'green',
  color: '#fff',
  fontWeight: 'bold',
  border: 'none',
  cursor: 'pointer'
};

export default IntentForm;