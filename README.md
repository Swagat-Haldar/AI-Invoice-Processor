# AI Invoice Processing Web Application

Production-ready full-stack app for invoice understanding using **Gemini Vision** (no OCR pipeline).

## Folder Structure

```text
AssetCues/
  backend/
    src/
      controllers/
      db/
      routes/
      services/
      utils/
      server.js
    .env.example
    package.json
  frontend/
    src/
      App.jsx
      main.jsx
      styles.css
    .env.example
    index.html
    package.json
    vite.config.js
```

## Features

- Upload invoice files (`PDF`, `DOCX`, `JPG`, `PNG`)
- DOCX is rendered into an image representation before VLM ingestion
- PDF is sent directly to Gemini Vision as a document input
- Sends rendered invoice directly to Gemini Vision
- Extracts maximum structured invoice data using a strict master prompt
- Safe JSON parsing + schema normalization
- Stores extracted JSON in local SQLite (`better-sqlite3`)
- Displays:
  - Raw JSON
  - Clean invoice sections (meta/seller/buyer/totals/payment)
  - Line items table

## Backend Setup

```bash
cd backend
npm install
copy .env.example .env
# add real GEMINI_API_KEY in .env
npm start
```

Backend runs on `http://localhost:4000`.

### API

- `POST /api/upload`
  - multipart form-data
  - field name: `invoice`
  - returns extracted JSON and DB id

- `GET /api/invoices`
  - returns all stored invoices

## Frontend Setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend runs on `http://localhost:5173` (default Vite).

## .env Example

Backend (`backend/.env`):

```env
PORT=4000
GEMINI_API_KEY=your_key_here
```

Frontend (`frontend/.env`):

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

## Notes

- No OCR libraries are used.
- Gemini Vision receives the invoice image directly.
- Designed to handle dynamic invoice layouts, multilingual text, and partially missing fields.
- SQLite database file is auto-created at `backend/src/db/invoices.db`.
