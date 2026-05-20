const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Mock data for today's question (Later we can move this to MongoDB)
const dailyTrivia = {
  question: "Who was the oldest man mentioned in the Bible?",
  options: ["Adam", "Enoch", "Methuselah", "Noah"],
  correctAnswer: 2,
  explanation: "Methuselah lived for 969 years (Genesis 5:27)."
};

router.get('/today', auth, (req, res) => res.json(dailyTrivia));

router.get('/leaderboard', auth, async (req, res) => {
  try {
    const topUsers = await User.find().sort({ points: -1 }).limit(5);
    res.json(topUsers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

router.post('/answer', auth, async (req, res) => {
  if (req.body.isCorrect) {
    await User.findByIdAndUpdate(req.user.id, { $inc: { points: 10 } });
    return res.json({ message: "Correct! +10 points" });
  }
  res.json({ message: "Better luck tomorrow!" });
});

module.exports = router;
