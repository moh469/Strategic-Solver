// submitTestIntents.js: Submit a batch of test intents to the backend
const fetch = require('node-fetch');

async function submitIntents() {
  const intents = [
    {
      sellToken: "0x...", // fill with deployed token address
      buyToken: "0x...", // fill with deployed token address
      sellAmount: "1000000000000000000", // 1 token (18 decimals)
      minBuyAmount: "900000000000000000", // 0.9 token
      chain: "anvil",
      user: "0x...", // fill with test user address
      recipient: "0x..."
    },
    // Add more test intents for edge cases
  ];

  for (const intent of intents) {
    const res = await fetch('http://localhost:3001/api/submit-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(intent)
    });
    const data = await res.json();
    console.log('Intent submitted:', data);
  }
}

submitIntents();
