const { GoogleGenerativeAI } = require("@google/generative-ai");
const { normalizeInvoiceJson, parseJsonSafely } = require("../utils/jsonUtils");
const { toVisionImage } = require("./documentConverter");

const MASTER_PROMPT = `You are an expert invoice data extraction engine.

You will receive an invoice as an image (or a page rendered from PDF/DOCX).
Your job is to extract EVERY piece of information from this invoice - no matter
the format, language, layout, or type of invoice.

Return ONLY a valid JSON object. No explanation, no markdown fences, no preamble.

GLOBAL RULES:
- Extract maximum possible structured data
- Do NOT hallucinate missing values
- Preserve original values exactly (amounts, dates, IDs)
- If a field is missing, return "" (empty string)
- If uncertain, include field with "_confidence": "low"
- Handle multilingual invoices
- Never omit useful information

STRUCTURE RULES:

{
  "invoice_meta": {
    "invoice_number": "",
    "invoice_date": "",
    "due_date": "",
    "po_number": ""
  },
  "seller": {
    "name": "",
    "address": "",
    "email": "",
    "phone": "",
    "tax_id": "",
    "bank_details": ""
  },
  "buyer": {
    "name": "",
    "address": "",
    "email": "",
    "phone": ""
  },
  "line_items": [
    {
      "item_code": "",
      "description": "",
      "hsn_sac": "",
      "uom": "",
      "quantity": "",
      "unit_price": "",
      "tax_rate": "",
      "tax_amount": "",
      "total_price": ""
    }
  ],
  "totals": {
    "subtotal": "",
    "tax": "",
    "discount": "",
    "shipping": "",
    "grand_total": "",
    "currency": ""
  },
  "payment": {
    "payment_terms": "",
    "payment_method": "",
    "bank_account": "",
    "iban": "",
    "swift": "",
    "upi": ""
  },
  "notes": "",
  "other": {}
}

EXTRACTION INSTRUCTIONS:
1. Extract ALL visible fields using lowercase_snake_case keys
2. Detect and structure tables into "line_items"
2a. If a single row contains many serial/object identifiers, split them into separate line_items when possible
2b. For each line item, extract item_code/hsn_sac/uom/tax_rate/tax_amount where visible
3. Group related data properly
4. If invoice language is not English, include:
   "original_language": "<detected_language>"
5. Anything not fitting schema -> put inside "other"
6. Maintain strict JSON formatting

Return ONLY JSON.`;

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Missing GEMINI_API_KEY in environment.");
  }
  return new GoogleGenerativeAI(key);
}

async function extractInvoiceFromFile(file) {
  const image = await toVisionImage(file);
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: MASTER_PROMPT },
          {
            inlineData: {
              data: image.buffer.toString("base64"),
              mimeType: image.mimeType
            }
          }
        ]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1
    }
  });

  const text = result.response.text();
  const parsed = parseJsonSafely(text);

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Gemini returned invalid invoice JSON.");
  }

  return normalizeInvoiceJson(parsed);
}

module.exports = {
  extractInvoiceFromFile
};
