import React, { useState } from 'react';
import { ethers } from 'ethers';

const erc20Abi = [
  "function approve(address spender, uint256 amount) public returns (bool)",
  "function allowance(address owner, address spender) public view returns (uint256)",
  "function balanceOf(address owner) public view returns (uint256)",
  "function mint(address to, uint256 amount) public"  
];

const IntentForm = () => {
  const [sellToken, setSellToken] = useState('');
  const [buyToken, setBuyToken] = useState('');
  const [sellAmount, setSellAmount] = useState('');
  const [minBuyAmount, setMinBuyAmount] = useState('');
  const [sourceChain, setSourceChain] = useState('');
  const [targetChain, setTargetChain] = useState('');
  const [orderType, setOrderType] = useState('Limit Buy');

  const tokenAddresses = {
    Sepolia: {
      USDC: "0x447dB80B9629A84aeFcad6c3fa6C0359d73BF796",
      WETH: "0x8a1FA303F13beb1b6bd34FDC8E42881966733927",
    }
  };

  const cowMatcherAddress = "0x9ac3750C1A8DeC29Ca9dE7F643583c12Ec33FD5D";

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

      // 🔍 Check balance and mint if insufficient
      const balance = await tokenContract.balanceOf(userAddress);
      if (balance < parsedAmount) {
        console.log(`Minting ${sellAmount} ${sellToken}...`);
        try {
          const mintTx = await tokenContract.mint(userAddress, parsedAmount);
          await mintTx.wait();
          console.log(`Minted ${sellAmount} ${sellToken}`);
        } catch (mintErr) {
          console.error("❌ Mint failed:", mintErr);
          alert("Mint failed: " + mintErr.message);
          return;
        }
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
          chainId: sourceChain === "Sepolia" ? 11155111 : 80001
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

  return (
   <form onSubmit={handleSubmit} style={formStyle}>
  <div style={gridContainerStyle}>
    <div style={gridItemStyle}>
      <Dropdown label="Sell Token" value={sellToken} setValue={setSellToken} options={["USDC", "WETH"]} />
    </div>
    <div style={gridItemStyle}>
      <Dropdown label="Buy Token" value={buyToken} setValue={setBuyToken} options={["USDC", "WETH"]} />
    </div>
    <div style={gridItemStyle}>
      <Input label="Sell Amount" value={sellAmount} setValue={setSellAmount} />
    </div>
    <div style={gridItemStyle}>
      <Input label="Min Buy Amount" value={minBuyAmount} setValue={setMinBuyAmount} />
    </div>
    <div style={gridItemStyle}>
      <Dropdown label="Source Chain" value={sourceChain} setValue={setSourceChain} options={["Sepolia"]} />
    </div>
    <div style={gridItemStyle}>
      <Dropdown label="Target Chain" value={targetChain} setValue={setTargetChain} options={["Sepolia"]} />
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
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
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