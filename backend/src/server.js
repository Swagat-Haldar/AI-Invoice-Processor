const path = require("path");
require("dotenv").config();

const { createApp } = require("./app");

const PORT = process.env.PORT || 4000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  console.log(`DB path: ${path.resolve(__dirname, "db", "invoices.db")}`);
});
