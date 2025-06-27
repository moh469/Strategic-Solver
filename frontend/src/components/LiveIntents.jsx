import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
const { BigNumber } = ethers;


const fallbackSymbols = {
  '0x447dB80B9629A84aeFcad6c3fa6C0359d73BF796': 'USDC',
  '0x8a1FA303F13beb1b6bd34FDC8E42881966733927': 'WETH',
};

const LiveIntents = ({ tokenMap = fallbackSymbols }) => {
  const [intents, setIntents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterToken, setFilterToken] = useState('');
  const [filterChain, setFilterChain] = useState('');
  const [filterId, setFilterId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchIntents();
  }, []);

  const fetchIntents = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/intents");
      const data = await res.json();
      setIntents(data);
    } catch (err) {
      console.error("Failed to fetch intents:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (value) => {
    try {
      const bn = BigNumber.from(value);
      return parseFloat(ethers.utils.formatUnits(bn, 18)).toFixed(6);
    } catch (e) {
      return '0.000000';
    }
  };

  const getSymbol = (address) => {
    return tokenMap[address] || `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const filtered = intents.filter((intent) => {
    return (
      (!filterToken ||
        getSymbol(intent.sellToken).toLowerCase().includes(filterToken.toLowerCase()) ||
        getSymbol(intent.buyToken).toLowerCase().includes(filterToken.toLowerCase())) &&
      (!filterChain || intent.chainId === parseInt(filterChain)) &&
      (!filterId || intent.intentId.toString() === filterId)
    );
  });

  const sorted = [...filtered].sort((a, b) => b.intentId - a.intentId);
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const pageIntents = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={containerStyle}>
      <h2 className='text-xl'>Live Intents</h2>

      <div style={filterContainer}>
        <input
          type="text"
          placeholder="🔍 Token (e.g. USDC)"
          value={filterToken}
          onChange={(e) => setFilterToken(e.target.value)}
          style={inputStyle}
          className='text-green-600'
        />
        <input
          type="text"
          placeholder="🌐 Chain ID"
          value={filterChain}
          onChange={(e) => setFilterChain(e.target.value)}
          style={inputStyle}
          className='text-green-600'
        />
        <input
          type="text"
          placeholder="🔎 Intent ID"
          value={filterId}
          onChange={(e) => setFilterId(e.target.value)}
          style={inputStyle}
          className='text-green-600'
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : filtered.length === 0 ? (
        <p>No matching intents found.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Sell</th>
                  <th>Buy</th>
                  <th>Sell Amount</th>
                  <th>Min Buy</th>
                  <th>Chain</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {pageIntents.map((intent) => {
                  const isMatched = intent.status !== 0;
                  return (
                    <tr
                      key={intent.intentId}
                      style={{
                        backgroundColor: isMatched ? '#003300' : '#2a1f00',
                        color: 'white',
                      }}
                    >
                      <td>{intent.intentId}</td>
                      <td>{getSymbol(intent.sellToken)}</td>
                      <td>{getSymbol(intent.buyToken)}</td>
                      <td>{formatAmount(intent.sellAmount)}</td>
                      <td>{formatAmount(intent.minBuyAmount)}</td>
                      <td>{intent.chainId}</td>
                      <td style={statusCell}>
                        {isMatched ? (
                          <span style={matchedBadge}>✅ Matched</span>
                        ) : (
                          <span style={pendingBadge}>🟡 Pending</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={{ marginRight: '10px' }}
            >
              ⬅ Prev
            </button>
            <span>Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={{ marginLeft: '10px' }}
            >
              Next ➡
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// 🎨 Styling
const containerStyle = {
  padding: '1.5rem',
  maxWidth: '1100px',
  margin: '0 auto',
  fontFamily: 'monospace',
};

const filterContainer = {
  display: 'flex',
  gap: '1rem',
  marginBottom: '1rem',
};

const inputStyle = {
  padding: '0.6rem',
  borderRadius: '6px',
  border: '2px solid #00ff00',
  width: '100%',
  maxWidth: '250px',
  backgroundColor: 'black',
  boxShadow: '0 0 6px #00ff00', 
  fontSize: '0.95rem',
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  backgroundColor: '#111',
  border: '1px solid #444',
};

const statusCell = {
  textAlign: 'center',
};

const matchedBadge = {
  backgroundColor: '#28a745',
  padding: '4px 8px',
  borderRadius: '4px',
  color: 'white',
};

const pendingBadge = {
  backgroundColor: '#ffc107',
  padding: '4px 8px',
  borderRadius: '4px',
  color: '#222',
};

export default LiveIntents;
