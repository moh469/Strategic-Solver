require('dotenv').config(); // ✅ This loads .env into process.env
module.exports = {
  RPC_URL: process.env.RPC_URL,
  // PRIVATE_KEY removed - all user transactions handled via MetaMask
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
  // add other things if needed
};
