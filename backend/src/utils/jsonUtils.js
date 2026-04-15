function parseJsonSafely(raw) {
  if (!raw || typeof raw !== "string") return null;

  try {
    return JSON.parse(raw);
  } catch (_error) {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      return null;
    }

    const slice = raw.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch (_secondError) {
      return null;
    }
  }
}

function normalizeInvoiceJson(input) {
  const base = {
    invoice_meta: {
      invoice_number: "",
      invoice_date: "",
      due_date: "",
      po_number: ""
    },
    seller: {
      name: "",
      address: "",
      email: "",
      phone: "",
      tax_id: "",
      bank_details: ""
    },
    buyer: {
      name: "",
      address: "",
      email: "",
      phone: ""
    },
    line_items: [
      {
        description: "",
        quantity: "",
        unit_price: "",
        total_price: ""
      }
    ],
    totals: {
      subtotal: "",
      tax: "",
      discount: "",
      shipping: "",
      grand_total: "",
      currency: ""
    },
    payment: {
      payment_terms: "",
      payment_method: "",
      bank_account: "",
      iban: "",
      swift: "",
      upi: ""
    },
    notes: "",
    other: {}
  };

  const merged = deepMerge(base, input);

  if (!Array.isArray(merged.line_items)) {
    merged.line_items = [];
  }

  if (merged.line_items.length === 0) {
    merged.line_items = [
      {
        description: "",
        quantity: "",
        unit_price: "",
        total_price: ""
      }
    ];
  }

  merged.line_items = merged.line_items.map((item) => ({
    description: item?.description || "",
    item_code: item?.item_code || "",
    quantity: item?.quantity || "",
    unit_price: item?.unit_price || "",
    tax_rate: item?.tax_rate || "",
    tax_amount: item?.tax_amount || item?.tax || "",
    total_price: item?.total_price || "",
    ...item
  }));

  merged.line_items = expandPackedLineItems(merged.line_items);

  if (typeof merged.other !== "object" || Array.isArray(merged.other) || merged.other === null) {
    merged.other = {};
  }

  return merged;
}

function expandPackedLineItems(lineItems) {
  const expanded = [];

  for (const item of lineItems) {
    const quantity = toNumber(item.quantity);
    const unitPrice = toNumber(item.unit_price);
    const inlineCodes = extractInlineCodes(item.description || "");

    const canExpand =
      inlineCodes.length >= 2 &&
      quantity > 1 &&
      inlineCodes.length === quantity &&
      unitPrice > 0 &&
      !item.item_code;

    if (!canExpand) {
      expanded.push(item);
      continue;
    }

    const totalTax = toNumber(item.tax_amount);
    const perItemTax = totalTax > 0 ? totalTax / inlineCodes.length : 0;
    const perItemTotal = unitPrice + perItemTax;

    for (const code of inlineCodes) {
      expanded.push({
        ...item,
        item_code: code,
        description: code,
        quantity: "1",
        tax_amount: perItemTax > 0 ? formatAmount(perItemTax) : item.tax_amount || "",
        total_price: formatAmount(perItemTotal)
      });
    }
  }

  return expanded;
}

function extractInlineCodes(description) {
  const matches = description.match(/[A-Za-z]{0,6}\d[A-Za-z0-9/-]{4,}/g) || [];
  const unique = [];
  for (const token of matches) {
    if (!unique.includes(token)) unique.push(token);
  }
  return unique;
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value) {
  return Number(value).toFixed(3);
}

function deepMerge(base, incoming) {
  if (Array.isArray(base)) {
    return Array.isArray(incoming) ? incoming : base;
  }

  if (typeof base === "object" && base !== null) {
    const output = { ...base };
    if (typeof incoming === "object" && incoming !== null && !Array.isArray(incoming)) {
      for (const [key, value] of Object.entries(incoming)) {
        if (key in output) {
          output[key] = deepMerge(output[key], value);
        } else {
          output[key] = value;
        }
      }
    }
    return output;
  }

  return incoming ?? base;
}

module.exports = {
  parseJsonSafely,
  normalizeInvoiceJson
};
