require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const http = require('http');
const axios = require('axios');
const { Server } = require('socket.io');
const { ExpressPeerServer } = require('peer'); // Imported PeerJS server framework
const connectDB = require('./config/db'); // Smart environment DB entrypoint
const Meeting = require('./models/Meeting');
const User = require('./models/User'); // Required for directory collection and analytics

const app = express();
const PORT = process.env.PORT || 4000;
const PEER_PORT = process.env.PEER_PORT || 9000; // Dedicated, isolated port for WebRTC signaling

// Dynamic list of allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

const server = http.createServer(app);

// 1. Configure Socket.io on the main HTTP server
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

app.set('io', io);

// 2. 🔥 ISOLATED PEERJS ENGINE: Spawn a separate HTTP Server to prevent 'upgrade' event clashing
const peerApp = express();
const peerServer = http.createServer(peerApp);
const expressPeerServer = ExpressPeerServer(peerServer, {
  debug: false,
  path: '/'
});

peerApp.use(cors({ origin: allowedOrigins, credentials: true }));
peerApp.use('/', expressPeerServer);

// Tracking map to bind active socket connections to workspace profile identities
const activeConnections = new Map();

// Authentication middleware wrapper definition for internal directory mappings
const auth = require('./middleware/auth'); 

// ─── INTEGRATED PROFESSIONAL SOCKET ENGINE ───
io.on('connection', (socket) => {

  // --- Real-time Host Gate Knocking & Room Approval Engine ---
  socket.on('knock_room', async ({ roomId, user }) => {
    try {
      if (!user) return;
      const extractedUserId = user.id || user._id;
      if (!extractedUserId) return;
      
      activeConnections.set(socket.id, { id: extractedUserId, username: user.username, roomId });

      const meeting = await Meeting.findOne({ roomId });
      if (!meeting) {
        socket.emit('knock_status', { status: 'rejected', message: 'Gathering room not found.' });
        return;
      }

      const isTrueHost = meeting.host && meeting.host.toString() === extractedUserId.toString();

      if (isTrueHost) {
        socket.emit('knock_status', { status: 'approved' });
        return;
      }

      const knocker = { socketId: socket.id, userId: extractedUserId, username: user.username };
      
      await Meeting.findOneAndUpdate(
        { roomId },
        { $pull: { pendingApprovals: { userId: extractedUserId } } }
      );
      
      await Meeting.findOneAndUpdate(
        { roomId },
        { $push: { pendingApprovals: knocker } }
      );

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

  socket.on('register', (userId) => { socket.join(userId); });
  socket.on('join-user-room', (userId) => { socket.join(userId); });
  
  socket.on('send_message', (msgData) => {
    const targetRoom = msgData.receiverId || msgData.recipient;
    if (targetRoom) {
      io.to(targetRoom).emit('receive_message', msgData);
    }
  });
  
  socket.on('message_reaction', (reactionData) => {
    if (reactionData.receiverId) {
      io.to(reactionData.receiverId).emit('receive_reaction', reactionData);
    }
  });
});

// GLOBAL CORS SECURITY DEFINITION SETUPS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'x-user-verified', 'x-user-location']
}));

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

app.use('/uploads', (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Middleware for measuring and outputting API endpoint response durations
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

// Directory routes
app.get('/api/users/chat-directory', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const friends = await User.find({ _id: { $ne: currentUserId } }, 'username profilePic localChurch');
    const suggestions = await User.find({ _id: { $ne: currentUserId } }).limit(5);
    res.json({ friends: friends || [], suggestions: suggestions || [] });
  } catch (err) {
    console.error("Error loading chat directory database entries:", err);
    res.status(500).json({ error: "Directory compile failed." });
  }
});

// 🔥 INTEGRATED ROUTE: Get logged-in user's accepted friends list safely (Resolves the 404!)
app.get('/api/users/friends', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    const userInstance = await User.findById(currentUserId).populate('friends', 'username avatar localChurch currentCity');
    
    if (!userInstance) {
      return res.status(404).json({ error: "User registry profile not found." });
    }
    
    res.json(userInstance.friends || []);
  } catch (err) {
    console.error("❌ Error fetching friends list:", err);
    res.status(500).json({ error: "Failed to retrieve connected friends list." });
  }
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

// --- GEOLOCATION BACKGROUND SYNC MIDDLEWARE ---
// (Moved below routes and cleanly async-chained to prevent execution blocking)
app.use(async (req, res, next) => {
  next();
  try {
    if (!req.user || !(req.user.id || req.user._id)) return;
    const currentUserId = req.user.id || req.user._id;

    let clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (clientIp === '::1' || clientIp === '127.0.0.1' || clientIp.includes('::ffff:127.0.0.1')) {
      clientIp = '102.134.149.0'; 
    }
    
    const geoResponse = await axios.get(`http://ip-api.com/json/${clientIp}`, { timeout: 3000 }).catch(() => null);
    if (geoResponse && geoResponse.data && geoResponse.data.status === 'success') {
      const { country, regionName, city, lat, lon } = geoResponse.data;
      const formattedCity = `${city}, ${regionName}, ${country}`;
      await User.findByIdAndUpdate(currentUserId, {
        currentCity: formattedCity,
        locationCoordinates: { type: 'Point', coordinates: [parseFloat(lon), parseFloat(lat)] }
      });
    }
  } catch (silentErr) {
    console.log("⚙️ ISO Background Analytics Sync bypassed cleanly.");
  }
});

// Boot both servers in parallel
const startServer = async () => {
  await connectDB();
  
  // Start Main Socket.IO Server
  server.listen(PORT, () => {
    console.log('\n  🚀 ADVENTCONNECT BACKEND ACTIVE');
    console.log('  ------------------------------');
    console.log(`  Main App Port: ${PORT} (Express + Socket.IO)`);
    console.log('  ------------------------------\n');
  });

  // Start Independent PeerJS Server
  peerServer.listen(PEER_PORT, () => {
    console.log(`  📞 PeerJS signaling server active on port: ${PEER_PORT}`);
    console.log('  ------------------------------\n');
  });
};

startServer();