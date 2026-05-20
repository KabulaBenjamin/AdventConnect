const express = require('express');
const router = express.Router();
const multer = require('multer');
const Meeting = require('../models/Meeting');
const Archive = require('../models/Archive');

const upload = multer({ dest: 'uploads/archives/' });

function generateGoogleStyleId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
}

// 1. SCHEDULE / CREATE MEETING
router.post('/schedule', async (req, res) => {
  try {
    const { title, description, startTime, endTime, hostId, isInstant } = req.body;
    let uniqueRoomId = generateGoogleStyleId();
    let existing = await Meeting.findOne({ roomId: uniqueRoomId });
    while (existing) {
      uniqueRoomId = generateGoogleStyleId();
      existing = await Meeting.findOne({ roomId: uniqueRoomId });
    }

    const scheduledMeeting = new Meeting({
      roomId: uniqueRoomId,
      title: title || (isInstant ? 'Instant Fellowship Session' : 'Sabbath Fellowship'),
      description,
      host: hostId || req.user?._id, // Fallback to authenticated user context
      status: isInstant ? 'active' : 'scheduled',
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : null
    });

    await scheduledMeeting.save();
    res.status(201).json(scheduledMeeting);
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule: " + err.message });
  }
});

// 2. ISOLATED CALENDAR QUERY (Scale Fix)
// Only returns meetings relevant to the requesting user to avoid dashboard clutter
router.get('/calendar', async (req, res) => {
  try {
    const currentUserId = req.user?._id; 
    
    // Build an isolation filter:
    // Show if user is host OR if the meeting is explicitly a public/scheduled global event
    // Do NOT return hidden instant rooms created by strangers
    const filter = {
      status: { $in: ['scheduled', 'active'] },
      $or: [
        { title: { $ne: 'Instant Fellowship Session' } }, // Keep scheduled services visible
        ...(currentUserId ? [{ host: currentUserId }] : []) // Show instant sessions only if they own it
      ]
    };

    // Apply pagination boundary limit (max 50 per pull) to keep performance fast
    const meetings = await Meeting.find(filter)
      .populate('host', 'name email')
      .sort({ startTime: 1 })
      .limit(50);
      
    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve isolated calendar schedules." });
  }
});

router.post('/join', async (req, res) => {
  const { roomId, userId } = req.body;
  try {
    let meeting = await Meeting.findOne({ roomId, status: { $in: ['active', 'scheduled'] } });
    if (!meeting) {
      meeting = new Meeting({ roomId, host: userId, title: 'Instant Fellowship Session', status: 'active' });
    } else if (meeting.status === 'scheduled') {
      meeting.status = 'active';
    }
    
    if (userId && !meeting.participants.includes(userId)) {
      meeting.participants.push(userId);
    }
    await meeting.save();
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: "Could not join the sanctuary room." });
  }
});

router.post('/end', async (req, res) => {
  const { roomId } = req.body;
  try {
    await Meeting.findOneAndUpdate({ roomId }, { status: 'ended', endTime: new Date() });
    res.json({ message: "Service ended successfully." });
  } catch (err) {
    res.status(500).json({ error: "Error ending the service." });
  }
});

router.post('/upload-archive', upload.single('pdf'), async (req, res) => {
  try {
    const { roomId, title, archivedBy } = req.body;
    const newArchive = new Archive({
      roomId, title, archivedBy,
      fileUrl: `/uploads/archives/${req.file.filename}`
    });
    await newArchive.save();
    res.json({ message: "Archived successfully!", archive: newArchive });
  } catch (err) {
    res.status(500).json({ error: "Cloud storage failed." });
  }
});

router.get('/archives', async (req, res) => {
  try {
    const archives = await Archive.find().sort({ date: -1 });
    res.json(archives);
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve history records." });
  }
});

module.exports = router;
