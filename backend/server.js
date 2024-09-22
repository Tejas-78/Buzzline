import '../env.js';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';
import userRouter from './users/user.routes.js';
import Message from '../backend/chats/chat.schema.js'
import { ApplicationError } from '../error/applicationError.js';

const app = express();

const corsOptions = {
  origin: '*', 
  credentials: true, 
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static('frontend'));
// User routes
app.use('/api/users', userRouter); 
// app.use('/api/users', messageRouter); 



// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof ApplicationError) {
    return res.status(err.code).send(err.message);
  }
  console.log(err);
  res.status(500).send('Oops! Something went wrong, please try again later');
});

const users = {}; 

// Create an HTTP server and configure Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', 
    methods: ['GET', 'POST'],
    credentials: true, 
  },
});

// Handle Socket.io connections

io.on('connection', (socket) => {
  console.log('A user connected');

  // Listen for 'joinRoom' event to allow users to join their unique room
  socket.on('joinRoom', (userId, userName) => {
    socket.join(userId);
    io.emit('updateUserStatus', { userId, status: 'online' });
    console.log(`User ${userName} joined room ${userId}`);

  });

  // listen for privious chat users
  socket.on('loadChatUsers', async (currentUserId) => {
    try {
      // Find all messages where the current user is either the sender or receiver
      const messages = await Message.find({
        $or: [
          { sender: currentUserId },
          { receiver: currentUserId }
        ]
      })
      .populate('sender receiver', 'name avatar') 
      .sort({ timestamp: -1 }); 

      const chatUsersMap = new Map();

      messages.forEach((message) => {
        const chatPartner = message.sender._id.toString() === currentUserId ? message.receiver : message.sender;
        const chatPartnerId = chatPartner._id.toString();

        if (!chatUsersMap.has(chatPartnerId)) {
          chatUsersMap.set(chatPartnerId, {
            user: chatPartner,
            lastMessage: message.message,
            lastTimestamp: message.timestamp
          });
        }
      });
      const chatUsers = Array.from(chatUsersMap.values()).sort((a, b) => b.lastTimestamp - a.lastTimestamp);
      socket.emit('chatUsersLoaded', chatUsers);
    } catch (error) {
      console.error('Error loading chat users:', error);
    }
  });

  // Listen for 'sendMessage' event from clients
  socket.on('sendMessage', async ({ senderId, receiverId, message,timestamp}) => {
    try {
      // Save message to the database
      const newMessage = new Message({
        sender: senderId,
        receiver: receiverId,
        message: message,
        timestamp:timestamp
      });
      await newMessage.save();

      // Emit the message to the receiver
      io.to(receiverId).emit('receiveMessage', {
        senderId,
        message,
        timestamp
      });

      // Emit the message notification
      io.to(receiverId).emit('newMessageNotification', {
        senderId,
        message,
      });  
    } catch (error) {
      console.error('Error saving message:', error);
    }
  });

  // Listen for 'loadMessages' event to fetch previous messages
  socket.on('loadMessages', async ({ currentUserId, selectedUserId }) => {
    try {
      // Find messages between currentUserId and selectedUserId
      const messages = await Message.find({
        $or: [
          { sender: currentUserId, receiver: selectedUserId },
          { sender: selectedUserId, receiver: currentUserId },
        ],
      }).sort({ timestamp: -1 }); // Sort by timestamp in ascending order

      // Send the message history back to the client
      socket.emit('loadMessages', messages);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  });
  // mark message as read
  socket.on('markMessagesAsRead', async ({ senderId, receiverId }) => {
    try {
      await Message.updateMany({
        sender: senderId,
        receiver: receiverId,
        isRead: false,
      }, { isRead: true });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  });
  let usersInCall = {};

  // Handle call initiation
  socket.on('call-user', (selectedUserId, currentUserName) => {
    if (usersInCall[selectedUserId]) {
      io.to(socket.id).emit('user-busy');  // Notify the caller that the user is busy
    } else {
      console.log(`${currentUserName} is calling ${selectedUserId}`);
      io.to(selectedUserId).emit('incoming-call', { from: currentUserName });
    }
  });

  // Handle call acceptance
  socket.on('accept-call', (currentUserId, selectedUserId) => {
    usersInCall[currentUserId] = true;
    usersInCall[selectedUserId] = true;
    io.to(selectedUserId).emit('call-accepted');
  });

  // Handle call rejection
  socket.on('reject-call', (targetUserId) => {
    io.to(targetUserId).emit('call-rejected');
  });

  // Handle call timeout
  socket.on('call-timeout', (targetUserId) => {
    io.to(targetUserId).emit('call-timeout');
  });

  // Handle WebRTC offer
  socket.on('offer', ({ offer, target }) => {
    io.to(target).emit('offer', { offer, from: socket.id });
  });

  // Handle WebRTC answer
  socket.on('answer', ({ answer, from }) => {
    io.to(from).emit('answer', answer);
  });

  // Handle ICE candidates
  socket.on('ice-candidate', ({ candidate, target }) => {
    io.to(target).emit('ice-candidate', candidate);
  });

  // Handle hangup
  socket.on('hangup', (targetUserId) => {
    io.to(targetUserId).emit('hangup');
    delete usersInCall[socket.id];  // Remove from the call tracking object
    delete usersInCall[targetUserId];
  });

  socket.on('disconnect', () => {
    const userId = socket.userId; 
    io.emit('updateUserStatus', { userId, status: 'offline' });
    console.log('User disconnected');
  });
});


export default server;
