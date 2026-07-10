const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const PDFParser = require('pdf2json');

const repoBookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  formatType: { type: String, required: true },
  extractedText: { type: String, required: true }, // Houses the pure book text
  isPremium: { type: Boolean, default: false }
}, { timestamps: true });

const RepoBook = mongoose.models.RepoBook || mongoose.model('RepoBook', repoBookSchema);

// Fetch all books
router.get('/', async (req, res) => {
  try {
    const books = await RepoBook.find({}, '_id title author category formatType').sort({ createdAt: -1 });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve catalog." });
  }
});

// Fetch full book text content for reading
router.get('/:id/read', async (req, res) => {
  try {
    const book = await RepoBook.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });
    res.json({ title: book.title, text: book.extractedText });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Intake Engine with Auto-Extraction
router.post('/upload', async (req, res) => {
  const { title, author, category, formatType, inputMethod, pastedData, fileBuffer } = req.body;

  try {
    let textToSave = "";

    if (inputMethod === 'upload' && fileBuffer) {
      // Decode Base64 string to binary buffer
      const base64Data = fileBuffer.replace(/^data:.*;base64,/, "");
      const fileBinBuffer = Buffer.from(base64Data, 'base64');

      if (formatType === 'pdf') {
        // Wrap the asynchronous parser event stream into a clean promise sequence
        textToSave = await new Promise((resolve, reject) => {
          const pdfParser = new PDFParser(this, 1); // setting second param to 1 suppresses text styling data to optimize raw extraction

          pdfParser.on("pdfParser_dataError", errData => reject(new Error(errData.parserError)));
          pdfParser.on("pdfParser_dataReady", pdfData => {
            // Raw text extraction and URI conversion
            const rawText = pdfParser.getRawTextContent();
            resolve(rawText || "Empty PDF document content.");
          });

          pdfParser.parseBuffer(fileBinBuffer);
        });
      } else {
        // Fallback for plain text files
        textToSave = fileBinBuffer.toString('utf8');
      }
    } else {
      // Pasted Text / Markdown
      textToSave = pastedData;
    }

    const newBook = new RepoBook({
      title,
      author,
      category,
      formatType,
      extractedText: textToSave,
      isPremium: true
    });

    await newBook.save();
    res.status(201).json({ success: true });
  } catch (err) {
    console.error("Extraction Failure:", err);
    res.status(500).json({ error: "Failed to extract text content from file: " + err.message });
  }
});

module.exports = router;
