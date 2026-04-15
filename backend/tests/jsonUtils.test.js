const { parseJsonSafely, normalizeInvoiceJson } = require("../src/utils/jsonUtils");

describe("parseJsonSafely", () => {
  test("parses valid json", () => {
    expect(parseJsonSafely('{"a":1}')).toEqual({ a: 1 });
  });

  test("extracts embedded json from noisy text", () => {
    const raw = "prefix text {\"invoice_meta\":{\"invoice_number\":\"INV-1\"}} suffix";
    expect(parseJsonSafely(raw)).toEqual({ invoice_meta: { invoice_number: "INV-1" } });
  });

  test("returns null on invalid payload", () => {
    expect(parseJsonSafely("not-json")).toBeNull();
    expect(parseJsonSafely(null)).toBeNull();
  });
});

describe("normalizeInvoiceJson", () => {
  test("fills missing schema fields", () => {
    const normalized = normalizeInvoiceJson({ seller: { name: "Acme" } });
    expect(normalized.seller.name).toBe("Acme");
    expect(normalized.buyer.address).toBe("");
    expect(normalized.totals.grand_total).toBe("");
    expect(Array.isArray(normalized.line_items)).toBe(true);
  });

  test("keeps custom fields and normalizes line_items shape", () => {
    const normalized = normalizeInvoiceJson({
      invoice_meta: { invoice_number: "INV-101", custom_meta: "extra" },
      line_items: [{ description: "Item A", quantity: "2" }],
      original_language: "de",
      other: { vendor_code: "A1" }
    });

    expect(normalized.invoice_meta.custom_meta).toBe("extra");
    expect(normalized.line_items[0]).toMatchObject({
      description: "Item A",
      quantity: "2",
      unit_price: "",
      total_price: ""
    });
    expect(normalized.original_language).toBe("de");
    expect(normalized.other.vendor_code).toBe("A1");
  });

  test("recovers from invalid line_items and other", () => {
    const normalized = normalizeInvoiceJson({
      line_items: "bad",
      other: "bad"
    });

    expect(normalized.line_items.length).toBe(1);
    expect(normalized.line_items[0].description).toBe("");
    expect(normalized.other).toEqual({});
  });
});
