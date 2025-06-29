import React, { useState, useEffect } from 'react';

const IntentPool = () => {
  const [poolData, setPoolData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPoolData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching pool data from:', 'http://localhost:3001/api/intent-pool');
      
      const response = await fetch('http://localhost:3001/api/intent-pool');
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Pool data received:', data);
      
      if (data.status === 'success') {
        setPoolData(data.pool);
        setError(null);
      } else {
        setError('Failed to fetch pool data: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error fetching pool data:', err);
      setError('Error connecting to backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoolData();
    // Refresh pool data every 10 seconds
    const interval = setInterval(fetchPoolData, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatTimeRemaining = (ms) => {
    if (ms <= 0) return 'Expired';
    
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) return (
    <div style={{ color: '#fff', textAlign: 'center', padding: '20px', backgroundColor: '#111' }}>
      Loading intent pool...
    </div>
  );

  if (error) return (
    <div style={{ color: '#ff4444', textAlign: 'center', padding: '20px', backgroundColor: '#111' }}>
      Error: {error}
      <br />
      <button 
        onClick={fetchPoolData}
        style={{
          backgroundColor: '#333',
          color: '#fff',
          border: '1px solid #555',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        🔄 Retry
      </button>
    </div>
  );

  if (!poolData) return (
    <div style={{ color: '#fff', textAlign: 'center', padding: '20px', backgroundColor: '#111' }}>
      No pool data available
    </div>
  );

  return (
    <div style={{ 
      backgroundColor: '#111', 
      border: '1px solid #333', 
      borderRadius: '8px', 
      padding: '20px', 
      margin: '20px 0',
      color: '#fff'
    }}>
      <h3 style={{ color: '#00ff00', marginBottom: '15px' }}>
        🏊 Intent Pool Status
      </h3>
      
      <div style={{ marginBottom: '15px' }}>
        <p>Total Intents: <span style={{ color: '#00ff00' }}>{poolData.totalIntents}</span></p>
        <p>Pending: <span style={{ color: '#ffaa00' }}>{poolData.pendingIntents}</span></p>
        <p>Matched: <span style={{ color: '#00ff00' }}>{poolData.matchedIntents}</span></p>
      </div>

      {poolData.pendingIntents > 0 && (
        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ color: '#ffaa00', marginBottom: '10px' }}>Pending Intents:</h4>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {poolData.pending.map((intent, index) => (
              <div key={intent.id} style={{ 
                backgroundColor: '#222', 
                padding: '10px', 
                margin: '5px 0', 
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{intent.sellToken} → {intent.buyToken}</strong>
                    <br />
                    Sell: {intent.sellAmount} | Min Buy: {intent.minBuyAmount}
                    <br />
                    User: <code>{intent.userAddress}</code>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '12px', color: '#aaa' }}>
                    Chain: {intent.chainId === 11155111 ? 'Sepolia' : 'Fuji'}
                    <br />
                    Expires: {formatTimeRemaining(intent.timeRemaining)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {poolData.recentMatches.length > 0 && (
        <div>
          <h4 style={{ color: '#00ff00', marginBottom: '10px' }}>Recent Matches:</h4>
          <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
            {poolData.recentMatches.map((match, index) => (
              <div key={match.id} style={{ 
                backgroundColor: '#002200', 
                padding: '8px', 
                margin: '5px 0', 
                borderRadius: '4px',
                fontSize: '14px'
              }}>
                <strong>{match.sellToken} → {match.buyToken}</strong>
                <br />
                {match.userAddress} ↔ {match.counterparty}
                <br />
                <span style={{ fontSize: '12px', color: '#aaa' }}>
                  Matched: {new Date(match.matchedAt).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button 
        onClick={fetchPoolData}
        style={{
          backgroundColor: '#333',
          color: '#fff',
          border: '1px solid #555',
          padding: '8px 16px',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '10px'
        }}
      >
        🔄 Refresh
      </button>
    </div>
  );
};

export default IntentPool;
