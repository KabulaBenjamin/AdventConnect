require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');

// Database and Socket Config
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const initSocket = require('./socket');

// Route Imports
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require("./routes/users");
const liveRoutes = require('./routes/live');
const notificationRoutes = require('./routes/notifications');
const messageRoutes = require('./routes/messages');
const triviaRoutes = require('./routes/trivia');
const groupRoutes = require('./routes/groups');
const pageRoutes = require('./routes/pages');
const meetingRoutes = require('./routes/meetingRoutes');
const libraryRoutes = require('./routes/library');

const app = express();
const server = http.createServer(app);

// Initialize DB and Real-time Engine
connectDB();
initSocket(server);

// Security & Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Static Folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes Mapping
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/trivia', triviaRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/library', libraryRoutes);

// Health Check
app.get('/api/health', (req, res) => res.json({
  status: 'AdventConnect Engine Online ✅',
  time: new Date()
}));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`
  🚀 ADVENTCONNECT BACKEND ACTIVE
  ------------------------------
  Port: ${PORT}
  Database: Connected
  ------------------------------
  `);
});
