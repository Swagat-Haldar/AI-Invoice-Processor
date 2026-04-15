const express = require("express");
const cors = require("cors");
const uploadRoutes = require("./routes/uploadRoutes");

function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "invoice-processor", time: new Date().toISOString() });
  });

  app.use("/api", uploadRoutes);

  app.use((err, _req, res, _next) => {
    console.error("Unhandled error:", err);

    const isClientUploadError =
      err?.name === "MulterError" ||
      /unsupported file type/i.test(err?.message || "") ||
      /file too large/i.test(err?.message || "");

    res.status(isClientUploadError ? 400 : err.status || 500).json({
      error: err.message || "Internal server error"
    });
  });

  return app;
}

module.exports = { createApp };
