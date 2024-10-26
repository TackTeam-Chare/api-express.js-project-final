import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/user/userRoutes.js';
import adminRoutes from './routes/auth/adminRoutes.js';
import generalRoutes from './routes/auth/general/generalRoutes.js';
import authRoutes from './routes/auth/authRoutes.js';
import authenticateJWT from './middleware/authMiddleware.js';
import processChatbotQuestion from './services/chatbotService.js';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;



const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
// Log the server start
console.log('Initializing server...');

// Error handling middleware for Express
app.use((err, req, res, next) => {
  console.error('Error caught in middleware:', err);
  res.status(500).json({ message: 'Internal server error', error: err.message });
});

// CORS configuration for HTTP requests
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,POST,PUT,DELETE',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

console.log(
  'CORS configuration applied for: https://nakhon-phanom-travel-production.up.railway.app/ and localhost:3000'
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('__filename:', __filename);
console.log('__dirname:', __dirname);

// CORS configuration for WebSocket (Socket.IO)
export const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// WebSocket error handler
io.on('error', (error) => {
  console.error('WebSocket error:', error);
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('userMessage', async (message) => {
    console.log('Received message from user:', message);
    try {
      await processChatbotQuestion(message, socket);
    } catch (error) {
      console.error('Error processing chatbot request:', error);
      socket.emit('botMessage', 'An error occurred while processing the bot response.');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Console log for static file path
console.log('Serving static files from /uploads');

// User Routes
app.use('/', userRoutes);

// Auth Routes
app.use('/auth', authRoutes);

// Admin Routes (with JWT authentication)
app.use('/admin', authenticateJWT, adminRoutes);

app.use('/admin/general', authenticateJWT, generalRoutes);

// Catch all route errors
app.use((err, req, res, next) => {
  console.error('Route Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Log when the server is running
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Catch uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});
