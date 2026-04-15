jest.mock("../src/services/geminiService", () => ({
  extractInvoiceFromFile: jest.fn()
}));

jest.mock("../src/db/invoiceRepository", () => ({
  insertInvoice: jest.fn(),
  listInvoices: jest.fn()
}));

const { uploadInvoice, getInvoices } = require("../src/controllers/uploadController");
const { extractInvoiceFromFile } = require("../src/services/geminiService");
const { insertInvoice, listInvoices } = require("../src/db/invoiceRepository");

describe("uploadController", () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns 400 when file missing", async () => {
    const req = {};
    const res = mockRes();
    const next = jest.fn();

    await uploadInvoice(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "No invoice file uploaded." });
    expect(next).not.toHaveBeenCalled();
  });

  test("stores extracted invoice and returns 201", async () => {
    const extracted = { invoice_meta: { invoice_number: "INV-1" } };
    extractInvoiceFromFile.mockResolvedValue(extracted);
    insertInvoice.mockReturnValue({ id: 1, created_at: "2026-04-15" });

    const req = { file: { originalname: "invoice.png" } };
    const res = mockRes();
    const next = jest.fn();

    await uploadInvoice(req, res, next);

    expect(extractInvoiceFromFile).toHaveBeenCalledWith(req.file);
    expect(insertInvoice).toHaveBeenCalledWith(extracted);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      id: 1,
      created_at: "2026-04-15",
      data: extracted
    });
  });

  test("passes extraction failures to error middleware", async () => {
    const err = new Error("Gemini unavailable");
    extractInvoiceFromFile.mockRejectedValue(err);

    const req = { file: { originalname: "invoice.pdf" } };
    const res = mockRes();
    const next = jest.fn();

    await uploadInvoice(req, res, next);

    expect(next).toHaveBeenCalledWith(err);
  });

  test("returns invoices list", () => {
    listInvoices.mockReturnValue([{ id: 9, data: { invoice_meta: {} } }]);

    const res = mockRes();
    const next = jest.fn();

    getInvoices({}, res, next);

    expect(res.json).toHaveBeenCalledWith({ invoices: [{ id: 9, data: { invoice_meta: {} } }] });
    expect(next).not.toHaveBeenCalled();
  });
});
