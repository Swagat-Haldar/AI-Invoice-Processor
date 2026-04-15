const db = require("./database");

const insertStmt = db.prepare(`
  INSERT INTO invoices (json_data)
  VALUES (@json_data)
`);

const selectByIdStmt = db.prepare(`
  SELECT id, created_at, json_data
  FROM invoices
  WHERE id = ?
`);

const listStmt = db.prepare(`
  SELECT id, created_at, json_data
  FROM invoices
  ORDER BY id DESC
`);

function insertInvoice(payload) {
  const result = insertStmt.run({
    json_data: JSON.stringify(payload)
  });

  const row = selectByIdStmt.get(result.lastInsertRowid);
  return {
    id: row.id,
    created_at: row.created_at,
    data: JSON.parse(row.json_data)
  };
}

function listInvoices() {
  return listStmt.all().map((row) => ({
    id: row.id,
    created_at: row.created_at,
    data: JSON.parse(row.json_data)
  }));
}

module.exports = {
  insertInvoice,
  listInvoices
};
