// SQLite utility for backend
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../elizaos.db');
const db = new sqlite3.Database(dbPath);

// Initialize tables if not exist
function initDB() {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_json TEXT,
      status TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      match_json TEXT,
      type TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS routing_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER,
      action TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS learning_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chain TEXT,
      amm TEXT,
      cow_attempts INTEGER DEFAULT 0,
      cow_successes INTEGER DEFAULT 0,
      amm_attempts INTEGER DEFAULT 0,
      amm_successes INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
}

module.exports = { db, initDB };
