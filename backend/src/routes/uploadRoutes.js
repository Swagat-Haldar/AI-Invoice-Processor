const express = require("express");
const multer = require("multer");
const { uploadInvoice, getInvoices } = require("../controllers/uploadController");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png"
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type. Use PDF, DOCX, JPG, or PNG."));
    }

    cb(null, true);
  }
});

router.post("/upload", upload.single("invoice"), uploadInvoice);
router.get("/invoices", getInvoices);

module.exports = router;
