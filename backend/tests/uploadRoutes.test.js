const request = require("supertest");
const express = require("express");

jest.mock("../src/controllers/uploadController", () => ({
  uploadInvoice: jest.fn((req, res) => res.status(201).json({ ok: true, name: req.file?.originalname || null })),
  getInvoices: jest.fn((_req, res) => res.json({ invoices: [] }))
}));

const router = require("../src/routes/uploadRoutes");

function makeApp() {
  const app = express();
  app.use("/api", router);
  app.use((err, _req, res, _next) => res.status(400).json({ error: err.message }));
  return app;
}

describe("uploadRoutes", () => {
  test("accepts supported image upload", async () => {
    const app = makeApp();

    const result = await request(app)
      .post("/api/upload")
      .attach("invoice", Buffer.from("fake image"), {
        filename: "invoice.png",
        contentType: "image/png"
      });

    expect(result.status).toBe(201);
    expect(result.body.ok).toBe(true);
  });

  test("rejects unsupported file type", async () => {
    const app = makeApp();

    const result = await request(app)
      .post("/api/upload")
      .attach("invoice", Buffer.from("plain"), {
        filename: "invoice.txt",
        contentType: "text/plain"
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/unsupported file type/i);
  });

  test("rejects too large file", async () => {
    const app = makeApp();
    const huge = Buffer.alloc(16 * 1024 * 1024, "a");

    const result = await request(app)
      .post("/api/upload")
      .attach("invoice", huge, {
        filename: "big.png",
        contentType: "image/png"
      });

    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/file too large/i);
  });
});
