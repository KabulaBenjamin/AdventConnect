const { Server } = require('socket.io');
const Notification = require('../models/Notification');
const Message = require('../models/Message');

const onlineUsers = new Map();

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    socket.on('register', (userId) => {
      onlineUsers.set(userId, socket.id);
      console.log(`🟢 User ${userId} connected`);
    });

    socket.on('notify', async (data) => {
      try {
        const notif = await Notification.create(data);
        const populated = await notif.populate('sender', 'username profilePic');
        const targetSocket = onlineUsers.get(data.recipient);
        if (targetSocket) io.to(targetSocket).emit('new_notification', populated);
      } catch (err) {
        console.error('Socket Notification Error:', err.message);
      }
    });

    socket.on('send_message', async (data) => {
      try {
        const message = await Message.create({
          sender: data.sender,
          recipient: data.recipient,
          text: data.text
        });
        const targetSocket = onlineUsers.get(data.recipient);
        if (targetSocket) io.to(targetSocket).emit('receive_message', message);
      } catch (err) {
        console.error('Socket Message Error:', err.message);
      }
    });

    socket.on('typing', (data) => {
      const targetSocket = onlineUsers.get(data.recipient);
      if (targetSocket) io.to(targetSocket).emit('user_typing', { sender: data.sender });
    });

    socket.on('disconnect', () => {
      for (const [userId, socketId] of onlineUsers) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          console.log(`🔴 User ${userId} disconnected`);
          break;
        }
      }
    });
  });

  return io;
};

module.exports = initSocket;
