// checkBatchResults.js: Query backend for batch execution results
const fetch = require('node-fetch');

async function checkResults() {
  const res = await fetch('http://localhost:3001/api/batch-status');
  const data = await res.json();
  console.log('Batch execution results:', JSON.stringify(data, null, 2));
}

checkResults();
