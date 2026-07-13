require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db'); // Smart environment DB entrypoint
const Meeting = require('./models/Meeting');

const app = express();
const PORT = process.env.PORT || 4000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
  }
});

app.set('io', io);

// Tracking map to bind active socket connections to workspace profile identities
const activeConnections = new Map();

// ─── INTEGRATED PROFESSIONAL SOCKET ENGINE ───
io.on('connection', (socket) => {

  // --- Real-time Host Gate Knocking & Room Approval Engine ---
  socket.on('knock_room', async ({ roomId, user }) => {
    try {
      if (!user) return;
      const extractedUserId = user.id || user._id;
      if (!extractedUserId) return;
      
      // Save identity map state reference securely
      activeConnections.set(socket.id, { id: extractedUserId, username: user.username, roomId });

      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        socket.emit('knock_status', { status: 'rejected', message: 'Gathering room not found.' });
        return;
      }

      // Handle dual key structures matching both MongoDB object architectures
      const isTrueHost = meeting.host && meeting.host.toString() === extractedUserId.toString();

      if (isTrueHost) {
        socket.emit('knock_status', { status: 'approved' });
        return;
      }

      // Add user to the live backend pending database list if they aren't the creator
      const knocker = { socketId: socket.id, userId: extractedUserId, username: user.username };
      
      // Prevent duplicates in queue arrays
      await Meeting.findOneAndUpdate(
        { roomId },
        { $pull: { pendingApprovals: { userId: extractedUserId } } }
      );
      
      await Meeting.findOneAndUpdate(
        { roomId },
        { $push: { pendingApprovals: knocker } }
      );

      // Dispatch real-time notification loop directly to the room room channel space
      io.to(roomId).emit('user_knocking', knocker);
      socket.emit('knock_status', { status: 'pending' });
    } catch (err) {
      console.error("Knock processing failure:", err);
      socket.emit('knock_status', { status: 'rejected', message: 'Server security gate error.' });
    }
  });

  socket.on('accept_knock', async ({ roomId, targetSocketId, targetUserId }) => {
    try {
      await Meeting.findOneAndUpdate(
        { roomId },
        { $pull: { pendingApprovals: { userId: targetUserId } } }
      );
      io.to(targetSocketId).emit('knock_status', { status: 'approved' });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('reject_knock', async ({ roomId, targetSocketId, targetUserId }) => {
    try {
      await Meeting.findOneAndUpdate(
        { roomId },
        { $pull: { pendingApprovals: { userId: targetUserId } } }
      );
      io.to(targetSocketId).emit('knock_status', { status: 'rejected', message: 'Entry request declined by host.' });
    } catch (err) {
      console.error(err);
    }
  });

  socket.on('join_meeting', async (roomId) => {
    socket.join(roomId);
    
    try {
      const meeting = await Meeting.findOne({ roomId });
      if (meeting) {
        socket.emit('load_chat_history', meeting.chatHistory || []);
        
        // Dynamically compile active directory roster lists based on mapping references
        const roster = [];
        const clients = io.sockets.adapter.rooms.get(roomId);
        if (clients) {
          for (const clientId of clients) {
            const meta = activeConnections.get(clientId);
            if (meta) {
              roster.push({ userId: meta.id, username: meta.username });
            }
          }
        }
        
        // If roster map composition returns blank, fallback cleanly to identity metadata
        if (roster.length === 0 && activeConnections.has(socket.id)) {
          const current = activeConnections.get(socket.id);
          roster.push({ userId: current.id, username: current.username });
        }

        io.to(roomId).emit('update_room_roster', roster);
      }
    } catch (err) {
      console.error(err);
    }
  });

  // --- Layout Chat Synchronization ---
  socket.on('send_meeting_chat', async ({ roomId, text, sender, time }) => {
    const chatMsg = { sender, text, time: time || new Date() };
    io.to(roomId).emit('receive_meeting_chat', chatMsg);

    try {
      await Meeting.findOneAndUpdate(
        { roomId },
        { $push: { chatHistory: chatMsg } }
      );
    } catch (err) {
      console.error("Failed saving meeting chat log:", err);
    }
  });

  // --- Dynamic Live Reaction Sync Dispatcher ---
  socket.on('send_reaction', ({ roomId, emoji, id }) => {
    io.to(roomId).emit('receive_reaction', { emoji, id });
  });

  // --- Disconnection Housekeeping Pipeline Engine ---
  socket.on('disconnect', async () => {
    const meta = activeConnections.get(socket.id);
    if (meta) {
      const { roomId } = meta;
      activeConnections.delete(socket.id);
      
      try {
        await Meeting.findOneAndUpdate(
          { roomId },
          { $pull: { pendingApprovals: { socketId: socket.id } } }
        );
        
        // Re-compile roster array list configuration mapping metrics for remaining connections
        const roster = [];
        const clients = io.sockets.adapter.rooms.get(roomId);
        if (clients) {
          for (const clientId of clients) {
            const innerMeta = activeConnections.get(clientId);
            if (innerMeta) roster.push({ userId: innerMeta.id, username: innerMeta.username });
          }
        }
        io.to(roomId).emit('update_room_roster', roster);
      } catch (err) {
        console.error(err);
      }
    }
  });

  // --- Fallback & Legacy Messaging Hub Connections ---
  socket.on('register', (userId) => { socket.join(userId); });
  socket.on('join-user-room', (userId) => { socket.join(userId); });
  
  socket.on('send_message', (msgData) => {
    io.to(msgData.receiverId || msgData.recipient).emit('receive_message', msgData);
  });
  
  socket.on('message_reaction', (reactionData) => {
    io.to(reactionData.receiverId).emit('receive_reaction', reactionData);
  });
});

// GLOBAL CORS SECURITY DEFINITION SETUPS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-user-verified', 'x-user-location']
}));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// 🔥 FIXED: Injected Explicit CORS policy filters inside file stream headers for audio extraction pipelines
app.use('/uploads', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.use((req, res, next) => {
  if (req.originalUrl.includes('socket.io')) return next();
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 200 && res.statusCode < 400 ? '\x1b[32m' : '\x1b[31m';
    console.log(`${req.method} ${req.originalUrl} ${statusColor}${res.statusCode}\x1b[0m - ${duration}ms`);
  });
  next();
});

// App Routes Bindings
app.use('/api/auth', require('./routes/auth'));
app.use('/api/library', require('./routes/library'));
app.use('/api/library/books', require('./routes/library/books'));
app.use('/api/library/egw', require('./routes/library/egw'));
app.use('/api/challenges', require('./routes/challenges'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/users', require('./routes/users'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/live', require('./routes/live'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/pages', require('./routes/pages'));
app.use('/api/trivia', require('./routes/trivia'));
app.use('/api/meetings', require('./routes/meetingRoutes'));
app.use('/api/search', require('./routes/search'));

app.get('/', (req, res) => {
  res.json({ status: "online", system: "AdventConnect Ecosystem API" });
});

// Clean initialization workflow routing through centralized smart DB switcher
const startServer = async () => {
  await connectDB();
  
  server.listen(PORT, () => {
    console.log('\n  🚀 ADVENTCONNECT BACKEND ACTIVE');
    console.log('  ------------------------------');
    console.log(`  Port: ${PORT}`);
    console.log('  Database: Initialization Check Active');
    console.log('  ------------------------------\n');
  });
};

startServer();

// ─── SILENT GEOLOCATION ANALYTICS MIDDLEWARE ───
const axios = require('axios');
const User = require('./models/User');

app.use(async (req, res, next) => {
  next();

  try {
    if (!req.user || !req.user.id) return;

    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('::ffff:127.0.0.1')) {
      clientIp = '102.134.149.0'; 
    }

    const geoResponse = await axios.get(`http://ip-api.com/json/${clientIp}`, { timeout: 3000 }).catch(() => null);

    if (geoResponse && geoResponse.data && geoResponse.data.status === 'success') {
      const { country, regionName, city, lat, lon } = geoResponse.data;
      const formattedCity = `${city}, ${regionName}, ${country}`;

      await User.findByIdAndUpdate(req.user.id, {
        currentCity: formattedCity,
        locationCoordinates: {
          type: 'Point',
          coordinates: [parseFloat(lon), parseFloat(lat)] 
        }
      });
    }
  } catch (silentErr) {
    console.log("⚙ISO Background Analytics Sync bypassed cleanly.");
  }
});