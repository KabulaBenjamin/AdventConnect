const { Server } = require('socket.io');
const Meeting = require('./models/Meeting');

const initSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('AdventConnect Engine: User connected ->', socket.id);

    // --- 1. PRIVATE MESSAGING / IDENTITY ---
    socket.on('join', (userId) => {
      socket.join(userId);
      socket.join(`user_${userId}`);
      console.log(`User registered in private room: ${userId}`);
    });

    // --- 2. GROUP CHAT LOGIC ---
    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`);
      console.log(`User joined group room: group_${groupId}`);
    });

    socket.on('send_group_message', (data) => {
      io.to(`group_${data.groupId}`).emit('receive_group_message', {
        ...data,
        timestamp: new Date()
      });
    });

    // --- 3. SABBATH MEETING LOBBY & WAITING ROOM LOGIC ---
    socket.on('knock_room', async ({ roomId, user }) => {
      try {
        let meeting = await Meeting.findOne({ roomId });
        
        // INSTANT MEETING ENGINE: If room doesn't exist, create it dynamically on the fly!
        if (!meeting) {
          console.log(`Instant Meeting Room detected: Creating ${roomId} for Host ${user?.username}`);
          meeting = new Meeting({
            roomId,
            title: 'Instant Fellowship Session',
            host: user?._id,
            status: 'active',
            startTime: new Date()
          });
          await meeting.save();
        }

        // If user is the host, let them pass directly without knocking
        if (meeting.host && meeting.host.toString() === user?._id) {
          socket.emit('knock_status', { status: 'approved' });
          return;
        }

        // Add user to the pending approvals list in DB if not already there
        await Meeting.updateOne(
          { roomId, 'pendingApprovals.userId': { $ne: user?._id } },
          { $push: { pendingApprovals: { socketId: socket.id, userId: user?._id, username: user?.username } } }
        );

        // Notify the host room layer that someone is knocking
        io.to(`meeting_${roomId}`).emit('user_knocking', {
          socketId: socket.id,
          userId: user?._id,
          username: user?.username
        });

        socket.emit('knock_status', { status: 'pending' });
      } catch (err) {
        console.error("Knocking database error:", err);
        socket.emit('knock_status', { status: 'rejected', message: 'Server processing error.' });
      }
    });

    // Host Accepts Knock
    socket.on('accept_knock', async ({ roomId, targetSocketId, targetUserId }) => {
      await Meeting.updateOne({ roomId }, { $pull: { pendingApprovals: { userId: targetUserId } } });
      io.to(targetSocketId).emit('knock_status', { status: 'approved' });
    });

    // Host Rejects Knock
    socket.on('reject_knock', async ({ roomId, targetSocketId, targetUserId }) => {
      await Meeting.updateOne({ roomId }, { $pull: { pendingApprovals: { userId: targetUserId } } });
      io.to(targetSocketId).emit('knock_status', { status: 'rejected', message: 'The host has declined access.' });
    });

    // Validated entry into the real-time stream room
    socket.on('join_meeting', async (roomId) => {
      socket.join(`meeting_${roomId}`);
      console.log(`User joined Live Meeting: ${roomId}`);

      try {
        const meeting = await Meeting.findOne({ roomId });
        if (meeting && meeting.chatHistory.length > 0) {
          socket.emit('load_chat_history', meeting.chatHistory);
        }
      } catch (err) {
        console.error("Error reading room history strings:", err);
      }
    });

    // Persistent Chat Updates mapped to database
    socket.on('send_meeting_chat', async (data) => {
      io.to(`meeting_${data.roomId}`).emit('receive_meeting_chat', data);

      try {
        await Meeting.updateOne(
          { roomId: data.roomId },
          { 
            $push: { 
              chatHistory: { 
                sender: data.sender, 
                text: data.text, 
                time: data.time || new Date() 
              } 
            } 
          }
        );
      } catch (err) {
        console.error("Failed persisting chat log array message:", err);
      }
    });

    // Broadcast "Amen" and other reactions to the whole room
    socket.on('send_reaction', ({ roomId, emoji }) => {
      io.to(`meeting_${roomId}`).emit('receive_reaction', {
        emoji,
        id: Date.now(),
        senderId: socket.id
      });
    });

    // Handle "Raise Hand" for Sabbath School questions
    socket.on('raise_hand', ({ roomId, userId, username }) => {
      io.to(`meeting_${roomId}`).emit('hand_raised', { userId, username });
    });

    // Handle "Lower Hand"
    socket.on('lower_hand', ({ roomId, userId }) => {
      io.to(`meeting_${roomId}`).emit('hand_lowered', { userId });
    });

    // --- 4. CLEANUP ---
    socket.on('disconnect', async () => {
      await Meeting.updateMany({}, { $pull: { pendingApprovals: { socketId: socket.id } } });
      console.log('AdventConnect Engine: User disconnected');
    });
  });

  return io;
};

module.exports = initSocket;
