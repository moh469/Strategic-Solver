const submitMatch = require('../services/submitMatch.js'); // adjust path if needed

const match = {
  a: { intentId: 46 },
  b: { intentId: 47 }
};

submitMatch(match);
