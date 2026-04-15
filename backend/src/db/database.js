const path = require("path");
const Database = require("better-sqlite3");

const dbPath = path.join(__dirname, "invoices.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    json_data TEXT NOT NULL
  )
`);

module.exports = db;
