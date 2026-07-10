const express = require('express');
const router = express.Router();
const multer = require('multer');
const Meeting = require('../models/Meeting');
const Archive = require('../models/Archive');
const Post = require('../models/Post'); 
const auth = require('../middleware/auth'); 

const upload = multer({ dest: 'uploads/archives/' });

function generateGoogleStyleId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz';
  const part = (len) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${part(3)}-${part(4)}-${part(3)}`;
}

// 1. SCHEDULE / CREATE MEETING (With automatic Global Feed Broadcast integration)
router.post('/schedule', auth, async (req, res) => {
  try {
    const { roomId, title, description, startTime, endTime, isInstant, category } = req.body;
    const currentUserId = req.user?._id || req.user?.id;
    
    let uniqueRoomId = roomId || generateGoogleStyleId();
    let existing = await Meeting.findOne({ roomId: uniqueRoomId });
    while (existing && !roomId) {
      uniqueRoomId = generateGoogleStyleId();
      existing = await Meeting.findOne({ roomId: uniqueRoomId });
    }

    const targetCategory = category || (isInstant ? 'global' : 'global');

    const scheduledMeeting = new Meeting({
      roomId: uniqueRoomId,
      title: title || (isInstant ? 'Instant Fellowship Session' : 'Sabbath Fellowship'),
      description,
      host: currentUserId, 
      status: 'active',
      startTime: startTime ? new Date(startTime) : new Date(),
      endTime: endTime ? new Date(endTime) : null,
      category: targetCategory
    });

    await scheduledMeeting.save();

    // AUTOMATIC INTEGRATION: If meeting is global, cross-post it to the main community feed immediately
    if (targetCategory === 'global') {
      try {
        const formattedTime = startTime ? new Date(startTime).toLocaleString() : new Date().toLocaleString();
        const feedContent = `🎥 **New Sanctuary Fellowship Broadcast**\n\nYou are invited to join **${scheduledMeeting.title}**!\n\nCross-communion fellowship room is open to everyone. \n\n🗓️ **Scheduled Time:** ${formattedTime}\n📝 **Focus:** ${description || 'Open scripture study and prayer.'}\n\n👉 Join directly using Room ID: **${uniqueRoomId}**`;

        const autoPost = new Post({
          author: currentUserId,
          content: feedContent,
          scope: 'global'
        });

        const savedPost = await autoPost.save();
        const io = req.app.get('io');
        if (io) {
          // Populate the post before broadcasting so it has user avatars on the timeline
          const populatedPost = await Post.findById(savedPost._id)
            .populate('author', 'name username avatar')
            .populate('comments.author', 'name username avatar');
          io.emit('new_post', populatedPost);
        }
      } catch (feedErr) {
        console.error("Silent catch: failed to auto-broadcast meeting card to feed:", feedErr.message);
      }
    }

    res.status(201).json({ success: true, meeting: scheduledMeeting });
  } catch (err) {
    res.status(500).json({ error: "Failed to schedule: " + err.message });
  }
});

// 2. VERIFY ROOM AUTHORITY ENDPOINT
router.get('/verify/:roomId', auth, async (req, res) => {
  try {
    const { roomId } = req.params;
    const currentUserId = req.user?._id || req.user?.id;

    const meeting = await Meeting.findOne({ roomId });
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    const isHost = meeting.host && meeting.host.toString() === currentUserId.toString();

    res.json({
      isHost,
      title: meeting.title,
      status: meeting.status
    });
  } catch (err) {
    res.status(500).json({ error: "Verification server crash." });
  }
});

// 3. ISOLATED CALENDAR QUERY
router.get('/calendar', auth, async (req, res) => {
  try {
    const currentUserId = req.user?._id || req.user?.id;

    // Pull meetings if they are global OR if the user is explicitly the host
    const filter = {
      status: { $in: ['scheduled', 'active'] },
      $or: [
        { category: 'global' }, 
        ...(currentUserId ? [{ host: currentUserId }] : []) 
      ]
    };

    const meetings = await Meeting.find(filter)
      .populate('host', 'username name email') 
      .sort({ startTime: 1 })
      .limit(50);

    res.json(meetings);
  } catch (err) {
    res.status(500).json({ error: "Could not retrieve isolated calendar schedules." });
  }
});

// 4. SECURE DELETE MEETING ENDPOINT
router.delete('/:id', auth, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found." });
    }

    const currentUserId = req.user?._id || req.user?.id;
    if (meeting.host.toString() !== currentUserId.toString()) {
      return res.status(401).json({ error: "Unauthorized to delete this meeting." });
    }

    await Meeting.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Meeting removed from calendar successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to remove meeting: " + err.message });
  }
});

router.post('/join', auth, async (req, res) => {
  const { roomId, userId } = req.body;
  const currentUserId = userId || req.user?._id || req.user?.id;
  try {
    let meeting = await Meeting.findOne({ roomId, status: { $in: ['active', 'scheduled'] } });
    if (!meeting) {
      meeting = new Meeting({ roomId, host: currentUserId, title: 'Instant Fellowship Session', status: 'active' });
    } else if (meeting.status === 'scheduled') {
      meeting.status = 'active';
    }

    if (currentUserId && !meeting.participants.includes(currentUserId)) {
      meeting.participants.push(currentUserId);
    }
    await meeting.save();
    res.json(meeting);
  } catch (err) {
    res.status(500).json({ error: "Could not join the sanctuary room." });
  }
});

router.post('/end', auth, async (req, res) => {
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

router.post('/share-feed', auth, async (req, res) => {
  try {
    const { content, scope } = req.body;
    const currentUserId = req.user?._id || req.user?.id;

    const newPost = new Post({
      author: currentUserId,
      content,
      scope: scope || 'global'
    });

    const savedPost = await newPost.save();
    const populatedPost = await Post.findById(savedPost._id)
      .populate('author', 'name avatar')
      .populate('comments.author', 'name avatar');

    const io = req.app.get('io');
    if (io) {
      io.emit('new_post', populatedPost);
    }

    res.status(201).json(populatedPost);
  } catch (err) {
    console.error('Gathering share route error:', err.message);
    res.status(500).json({ error: 'Server failed to handle gathering broadcast.' });
  }
});

module.exports = router;
