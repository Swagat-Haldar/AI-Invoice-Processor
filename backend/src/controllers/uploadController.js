const { extractInvoiceFromFile } = require("../services/geminiService");
const { insertInvoice, listInvoices } = require("../db/invoiceRepository");

async function uploadInvoice(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No invoice file uploaded." });
    }

    const extracted = await extractInvoiceFromFile(req.file);
    const saved = insertInvoice(extracted);

    return res.status(201).json({
      id: saved.id,
      created_at: saved.created_at,
      data: extracted
    });
  } catch (error) {
    return next(error);
  }
}

function getInvoices(_req, res, next) {
  try {
    return res.json({ invoices: listInvoices() });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  uploadInvoice,
  getInvoices
};
