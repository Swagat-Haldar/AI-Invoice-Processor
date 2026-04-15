import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../App";

describe("App", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("renders upload section", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /ai invoice processing app/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /upload & extract/i })).toBeInTheDocument();
  });

  test("shows validation when no file selected", async () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /upload & extract/i }));
    expect(await screen.findByText(/please select a file first/i)).toBeInTheDocument();
  });

  test("renders invoice views after successful upload", async () => {
    const payload = {
      data: {
        invoice_meta: { invoice_number: "INV-22" },
        seller: { name: "ACME Seller" },
        buyer: { name: "Globex Buyer" },
        line_items: [
          { description: "Service Fee", quantity: "1", unit_price: "100", total_price: "100" }
        ],
        totals: { grand_total: "100", currency: "USD" },
        payment: { payment_method: "bank_transfer" },
        notes: "thanks",
        other: {}
      }
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => payload
    });

    render(<App />);

    const input = document.querySelector("input[type='file']");
    const file = new File(["content"], "invoice.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /upload & extract/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: /formatted invoice view/i })).toBeInTheDocument();
    });

    expect(screen.getAllByText(/service fee/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /raw json/i })).toBeInTheDocument();
  });

  test("shows backend error message", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Gemini timeout" })
    });

    render(<App />);

    const input = document.querySelector("input[type='file']");
    const file = new File(["content"], "invoice.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /upload & extract/i }));

    expect(await screen.findByText(/gemini timeout/i)).toBeInTheDocument();
  });
});
