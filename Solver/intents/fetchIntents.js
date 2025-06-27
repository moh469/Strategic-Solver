const axios = require("axios");

async function fetchIntents() {
  const res = await axios.get("http://localhost:3001/api/intents");
  const allIntents = res.data;

  // Only return intents that are still pending
  return allIntents.filter((intent) => intent.status === 0);
}

module.exports = fetchIntents;
