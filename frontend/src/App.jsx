import { useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

const emptyInvoice = {
  invoice_meta: {},
  seller: {},
  buyer: {},
  line_items: [],
  totals: {},
  payment: {},
  notes: "",
  other: {}
};

export default function App() {
  const [file, setFile] = useState(null);
  const [invoice, setInvoice] = useState(emptyInvoice);
  const [rawJson, setRawJson] = useState("{}");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState("processor");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyItems, setHistoryItems] = useState([]);

  const hasInvoice = useMemo(
    () => !!invoice && Object.keys(invoice).length > 0 && rawJson !== "{}",
    [invoice, rawJson]
  );
  const tableRows = useMemo(() => buildSerialWiseRows(invoice), [invoice]);

  async function handleUpload(event) {
    event.preventDefault();

    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("invoice", file);

      const response = await fetch(`${API_BASE}/upload`, {
        method: "POST",
        body: formData
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Upload failed.");
      }

      setInvoice(payload.data || emptyInvoice);
      setRawJson(JSON.stringify(payload.data || {}, null, 2));
      await loadHistory();
    } catch (err) {
      setError(err.message || "Unexpected error.");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(`${API_BASE}/invoices`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Failed to fetch invoice history.");
      }

      setHistoryItems(Array.isArray(payload.invoices) ? payload.invoices : []);
    } catch (err) {
      setHistoryError(err.message || "Unable to load history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function openHistoryPage() {
    setActivePage("history");
    if (historyItems.length === 0 && !historyLoading) {
      loadHistory();
    }
  }

  function handleViewHistoryInvoice(entry) {
    setInvoice(entry.data || emptyInvoice);
    setRawJson(JSON.stringify(entry.data || {}, null, 2));
    setActivePage("processor");
  }

  return (
    <div className="container">
      <header className="topbar">
        <div>
          <h1>AI Invoice Processing</h1>
          <p className="subtitle">Upload invoice files and instantly extract structured data using Gemini Vision.</p>
        </div>
        <nav className="tab-nav">
          <button
            type="button"
            className={activePage === "processor" ? "tab-btn active" : "tab-btn"}
            onClick={() => setActivePage("processor")}
          >
            Process Invoice
          </button>
          <button
            type="button"
            className={activePage === "history" ? "tab-btn active" : "tab-btn"}
            onClick={openHistoryPage}
          >
            History
          </button>
        </nav>
      </header>

      {activePage === "processor" ? (
        <>
          <section className="card">
            <h2>Upload Invoice File</h2>
            <form onSubmit={handleUpload} className="upload-form">
              <input
                type="file"
                accept=".pdf,.docx,image/jpeg,image/png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button disabled={loading}>{loading ? "Extracting..." : "Extract Invoice Data"}</button>
            </form>
            {error && <p className="error">{error}</p>}
          </section>

          {hasInvoice && (
            <>
              <section className="card">
                <h2>Invoice Summary</h2>
                <div className="grid">
                  <InfoBlock title="Invoice Meta" data={invoice.invoice_meta} />
                  <InfoBlock title="Seller" data={invoice.seller} />
                  <InfoBlock title="Buyer" data={invoice.buyer} />
                  <InfoBlock title="Totals" data={invoice.totals} />
                  <InfoBlock title="Payment" data={invoice.payment} />
                </div>
                {invoice.notes ? (
                  <div>
                    <h3>Notes</h3>
                    <p>{invoice.notes}</p>
                  </div>
                ) : null}
              </section>

              <section className="card">
                <h2>Line Items</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Sr No</th>
                        <th>Item Code</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th>Unit Price</th>
                        <th>Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((item, index) => (
                        <tr key={`${item.item_code || "item"}-${index}`}>
                          <td>{item.sr_no}</td>
                          <td>{item.item_code || ""}</td>
                          <td>{item.description || ""}</td>
                          <td>{item.quantity || ""}</td>
                          <td>{item.unit_price || ""}</td>
                          <td>{item.tax_amount || item.tax || ""}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <th colSpan="3">Invoice Totals</th>
                        <th>{sumColumn(tableRows, "quantity") || ""}</th>
                        <th>{invoice.totals?.subtotal || ""}</th>
                        <th>{invoice.totals?.tax || ""}</th>
                      </tr>
                      <tr>
                        <th colSpan="5">Grand Total</th>
                        <th>{invoice.totals?.grand_total || ""}</th>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>

              <section className="card">
                <h2>Raw JSON Output</h2>
                <pre>{rawJson}</pre>
              </section>
            </>
          )}
        </>
      ) : (
        <section className="card">
          <div className="history-head">
            <h2>Invoice History</h2>
            <button type="button" onClick={loadHistory} disabled={historyLoading}>
              {historyLoading ? "Refreshing..." : "Refresh List"}
            </button>
          </div>
          {historyError ? <p className="error">{historyError}</p> : null}
          {historyItems.length === 0 && !historyLoading ? (
            <p className="muted">No saved invoices yet. Process one invoice to see history here.</p>
          ) : null}
          {historyItems.length > 0 ? (
            <div className="history-list">
              {historyItems.map((entry) => (
                <article key={entry.id} className="history-item">
                  <div>
                    <h3>Record #{entry.id}</h3>
                    <p className="muted">{formatDate(entry.created_at)}</p>
                    <p className="muted">
                      {entry.data?.seller?.name || "Unknown Seller"} → {entry.data?.buyer?.name || "Unknown Buyer"}
                    </p>
                    <p>
                      <strong>Invoice No:</strong> {entry.data?.invoice_meta?.invoice_number || "-"} |{" "}
                      <strong>Grand Total:</strong> {entry.data?.totals?.grand_total || "-"}
                    </p>
                  </div>
                  <button type="button" onClick={() => handleViewHistoryInvoice(entry)}>
                    Open Record
                  </button>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}

function sumColumn(items, key) {
  const sum = (items || []).reduce((acc, item) => {
    const value = Number.parseFloat(String(item?.[key] ?? "").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(value) ? acc + value : acc;
  }, 0);

  return sum > 0 ? String(sum) : "";
}

function buildSerialWiseRows(invoice) {
  const items = invoice?.line_items || [];
  const totalTax = toNumber(invoice?.totals?.tax);
  const totalQty = items.reduce((acc, item) => acc + Math.max(1, Math.trunc(toNumber(item.quantity)) || 1), 0);
  const defaultTaxPerUnit = totalTax > 0 && totalQty > 0 ? totalTax / totalQty : 0;

  const rows = [];
  let serial = 1;

  for (const item of items) {
    const qty = Math.max(1, Math.trunc(toNumber(item.quantity)) || 1);
    const serialCodes = extractSerialCodes(item, qty);
    const unitPrice = toNumber(item.unit_price);
    const itemTaxTotal = toNumber(item.tax_amount || item.tax);
    const perUnitTax = itemTaxTotal > 0 ? itemTaxTotal / qty : defaultTaxPerUnit;

    for (let i = 0; i < qty; i += 1) {
      rows.push({
        sr_no: serial,
        item_code: serialCodes[i] || item.item_code || "",
        description: extractBaseDescription(item.description),
        quantity: "1",
        unit_price: unitPrice > 0 ? formatAmount(unitPrice) : item.unit_price || "",
        tax_amount: perUnitTax > 0 ? formatAmount(perUnitTax) : ""
      });
      serial += 1;
    }
  }

  return rows;
}

function extractSerialCodes(item, qty) {
  const serialPattern = /\bT[0-9A-Z]{8,}\b/g;
  const fromDescription = (item?.description || "").match(serialPattern) || [];
  const unique = [];

  for (const code of fromDescription) {
    if (unique.length >= qty) break;
    unique.push(code);
  }

  return unique;
}

function extractBaseDescription(description) {
  if (!description) return "";
  const firstLine = String(description).split("\n")[0] || "";
  return firstLine.trim();
}

function toNumber(value) {
  if (value === null || value === undefined) return 0;
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAmount(value) {
  return Number(value).toFixed(3);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function InfoBlock({ title, data }) {
  return (
    <div className="info-block">
      <h3>{title}</h3>
      <ul>
        {Object.entries(data || {}).map(([key, value]) => (
          <li key={key}>
            <strong>{key.replace(/_/g, " ")}:</strong> {String(value ?? "")}
          </li>
        ))}
      </ul>
    </div>
  );
}
