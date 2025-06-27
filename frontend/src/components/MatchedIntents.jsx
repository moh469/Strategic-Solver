import React, { useEffect, useState } from "react";

// Chain and token config for UI
const chains = {
  31337: { name: "Anvil Local 1 (31337)", explorer: (tx) => `http://localhost:8545/tx/${tx}` },
  421614: { name: "Anvil Local 2 (421614)", explorer: (tx) => `http://localhost:8546/tx/${tx}` },
  11155111: { name: "Anvil Local 3 (11155111)", explorer: (tx) => `http://localhost:8547/tx/${tx}` },
  80002: { name: "Anvil Local 4 (80002)", explorer: (tx) => `http://localhost:8548/tx/${tx}` },
  // Testnets (if needed)
  // 11155111: { name: "Sepolia", explorer: (tx) => `https://sepolia.etherscan.io/tx/${tx}` },
  // 421614: { name: "Arbitrum Sepolia", explorer: (tx) => `https://sepolia.arbiscan.io/tx/${tx}` },
  // 80002: { name: "Polygon Amoy", explorer: (tx) => `https://amoy.polygonscan.com/tx/${tx}` },
};

const tokenSymbols = {
  // Add mock token addresses for each chain as needed:
  // 31337
  "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0": "WETH", // CFMM_ADAPTER
  "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9": "DAI",  // CROSS_CHAIN_BRIDGE
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512": "USDC", // COW_MATCHER
  // If mock token addresses differ on other chains, add them here:
  // "0x...": "WETH", // 421614
  // "0x...": "DAI",  // 11155111
  // "0x...": "USDC", // 80002
  // Existing testnet tokens
  "0x447dB80B9629A84aeFcad6c3fa6C0359d73BF796": "USDC",
  "0x8a1FA303F13beb1b6bd34FDC8E42881966733927": "WETH",
  "0x8a78192AE2D6a59DdDA2237f9123fB7213FfEe82": "LINK",
};

const getExplorerLink = (chainId, txHash) => {
  if (chains[chainId]) return chains[chainId].explorer(txHash);
  return `#`;
};

const getChainName = (chainId) => chains[chainId]?.name || `Chain ${chainId}`;

const getSymbol = (addr) => tokenSymbols[addr] || `${addr.slice(0, 6)}...${addr.slice(-4)}`;

const MatchedIntents = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMatches = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/logged-matches");
      const data = await res.json();
      setMatches(data.slice(0, 10));
    } catch (err) {
      console.error("❌ Failed to fetch matches:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatAmount = (amount) => {
    const num = Number(amount);
    return isNaN(num) ? "0.0000" : (num / 1e18).toFixed(4);
  };

  return (
    <div style={containerStyle}>
      <h2>🔁 Recent Matched Intents</h2>
      {loading ? (
        <p>Loading matches...</p>
      ) : matches.length === 0 ? (
        <p>No matches yet.</p>
      ) : (
        <div style={matchList}>
          {matches.map((match, i) => (
            <div key={i} style={matchCard}>
              <h3>
                ✅ #{match.a.intentId} ↔ #{match.b.intentId}
                <span style={badgeStyle}>Matched</span>
              </h3>
              <p>
                <strong>{getSymbol(match.a.tokenIn)}</strong> ➝{" "}
                <strong>{getSymbol(match.a.tokenOut)}</strong> |{" "}
                {formatAmount(match.a.amountIn)}
              </p>
              <p>
                <strong>{getSymbol(match.b.tokenIn)}</strong> ➝{" "}
                <strong>{getSymbol(match.b.tokenOut)}</strong> |{" "}
                {formatAmount(match.b.amountIn)}
              </p>
              <p style={{ fontSize: "0.9rem", color: "#ccc" }}>
                Chain: {getChainName(match.a.chainId)}
              </p>
              {match.txHash && (
                <p style={{ fontSize: "0.85rem", color: "#aaa" }}>
                  Tx:{" "}
                  <a
                    href={getExplorerLink(match.a.chainId, match.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#4FC3F7" }}
                  >
                    {match.txHash.slice(0, 10)}...{match.txHash.slice(-6)}
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// 💅 Styles
const containerStyle = {
  padding: "1.5rem",
  maxWidth: "1000px",
  margin: "0 auto",
  fontFamily: "monospace",
  color: "#fff",
};

const matchList = {
  display: "grid",
  gap: "1rem",
};

const matchCard = {
  backgroundColor: "#1a1a1a",
  padding: "1rem",
  borderRadius: "8px",
  border: "2px solid #00ff00",
};

const badgeStyle = {
  marginLeft: "1rem",
  background: "#28a745",
  color: "white",
  padding: "2px 8px",
  borderRadius: "4px",
  fontSize: "0.8rem",
};

export default MatchedIntents;
