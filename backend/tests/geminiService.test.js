const mockGenerateContent = jest.fn();
const mockModel = { generateContent: mockGenerateContent };
const mockGetGenerativeModel = jest.fn(() => mockModel);

jest.mock("@google/generative-ai", () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel
  }))
}));

jest.mock("../src/services/documentConverter", () => ({
  toVisionImage: jest.fn()
}));

const { toVisionImage } = require("../src/services/documentConverter");
const { extractInvoiceFromFile } = require("../src/services/geminiService");

describe("geminiService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  test("returns normalized extraction json", async () => {
    toVisionImage.mockResolvedValue({
      buffer: Buffer.from("abc"),
      mimeType: "image/png"
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({ seller: { name: "Vendor" }, line_items: [] })
      }
    });

    const result = await extractInvoiceFromFile({ mimetype: "image/png" });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: expect.any(String) });
    expect(result.seller.name).toBe("Vendor");
    expect(Array.isArray(result.line_items)).toBe(true);
    expect(result.line_items.length).toBe(1);
  });

  test("throws on invalid json response", async () => {
    toVisionImage.mockResolvedValue({
      buffer: Buffer.from("abc"),
      mimeType: "image/png"
    });

    mockGenerateContent.mockResolvedValue({
      response: { text: () => "not-json" }
    });

    await expect(extractInvoiceFromFile({ mimetype: "image/png" })).rejects.toThrow(
      /invalid invoice json/i
    );
  });

  test("throws when api key missing", async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(extractInvoiceFromFile({})).rejects.toThrow(/missing gemini_api_key/i);
  });
});
