import React, { useEffect, useState } from "react";

// Chain and token config for UI
const chains = {
  11155111: { name: "Sepolia Testnet", explorer: (tx) => `https://sepolia.etherscan.io/tx/${tx}` },
  43113: { name: "Avalanche Fuji Testnet", explorer: (tx) => `https://testnet.snowtrace.io/tx/${tx}` },
};

const tokenSymbols = {
  // Add testnet token addresses as needed
  // Example: "0x...": "USDC",
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
