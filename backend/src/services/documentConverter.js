const mammoth = require("mammoth");
const sharp = require("sharp");

const IMAGE_TYPES = ["image/jpeg", "image/png"];

async function toVisionImage(file) {
  if (IMAGE_TYPES.includes(file.mimetype)) {
    const pngBuffer = await sharp(file.buffer).png().toBuffer();
    return { buffer: pngBuffer, mimeType: "image/png" };
  }

  if (file.mimetype === "application/pdf") {
    return { buffer: file.buffer, mimeType: "application/pdf" };
  }

  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return convertDocxToImage(file.buffer);
  }

  throw new Error(`Unsupported file format: ${file.mimetype}`);
}

async function convertDocxToImage(docxBuffer) {
  const result = await mammoth.extractRawText({ buffer: docxBuffer });
  const text = (result.value || "").trim() || "(Document appears empty)";

  const lines = wrapText(text, 90).slice(0, 80);
  const lineHeight = 26;
  const width = 1700;
  const height = Math.max(1200, 120 + lines.length * lineHeight);

  const content = lines
    .map((line, idx) => `<text x="50" y="${90 + idx * lineHeight}">${escapeXml(line)}</text>`)
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="100%" height="100%" fill="#ffffff"/>
    <text x="50" y="45" font-size="30" font-family="Arial" font-weight="700" fill="#111827">DOCX Render (text layer)</text>
    <g font-size="22" font-family="Arial" fill="#1f2937">${content}</g>
  </svg>`;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return { buffer, mimeType: "image/png" };
}

function wrapText(text, maxCharsPerLine) {
  const words = text.replace(/\r/g, "").split(/\s+/).filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxCharsPerLine) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

module.exports = {
  toVisionImage
};
