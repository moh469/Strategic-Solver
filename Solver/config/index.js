require('dotenv').config(); // ✅ This loads .env into process.env
module.exports = {
  RPC_URL: process.env.RPC_URL,
  PRIVATE_KEY: process.env.PRIVATE_KEY,
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  // add other things if needed
};
