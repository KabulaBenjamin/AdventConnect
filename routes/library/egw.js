const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const egwBookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  code: { type: String, required: true, unique: true }, // e.g., 'SC', 'GC', 'STEPS'
  author: { type: String, default: "Ellen G. White" },
  category: { type: String, default: "Prophetic Writings" },
  fullContent: { type: String, required: true } // Complete text mass
}, { timestamps: true });

const EgwBook = mongoose.models.EgwBook || mongoose.model('EgwBook', egwBookSchema);

// 1. Fetch catalog checklist of all EGW books available
router.get('/', async (req, res) => {
  try {
    const works = await EgwBook.find({}, '_id title code author category').sort({ title: 1 });
    res.json(works);
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve EGW index catalogue." });
  }
});

// 2. Fetch specific book body for immersive reading
router.get('/:id/read', async (req, res) => {
  try {
    const work = await EgwBook.findById(req.params.id);
    if (!work) return res.status(404).json({ error: "EGW Document not found" });
    res.json({ title: work.title, text: work.fullContent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Administrative seeding endpoint to insert or paste EGW books quickly
router.post('/seed', async (req, res) => {
  const { title, code, fullContent } = req.body;
  try {
    const book = new EgwBook({ title, code, fullContent });
    await book.save();
    res.status(201).json({ success: true, message: `${title} indexed successfully.` });
  } catch (err) {
    res.status(500).json({ error: "Failed to compile EGW source entry: " + err.message });
  }
});

module.exports = router;
