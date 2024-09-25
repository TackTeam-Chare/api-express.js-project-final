import express from 'express'; 
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import userRoutes from './routes/user/userRoutes.js';
import adminRoutes from './routes/auth/adminRoutes.js';
import authRoutes from './routes/auth/authRoutes.js';
import authenticateJWT from './middleware/authMiddleware.js';
import processChatbotQuestion from './services/chatbotService.js';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration for HTTP requests
app.use(cors({
  origin: [
    'https://nakhon-phanom-travel-recommendation-thesis-final.vercel.app',  // อนุญาตโดเมนของ Vercel
    'http://localhost:3000'  // อนุญาต localhost สำหรับการพัฒนา
  ],
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,  // อนุญาตการส่ง cookies และ credential
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS Configuration for WebSocket (Socket.IO)
const io = new Server(server, {
  cors: {
    origin: [
      'https://nakhon-phanom-travel-recommendation-thesis-final.vercel.app',  // อนุญาตโดเมนของ Vercel
      'http://localhost:3000'  // อนุญาต localhost สำหรับการพัฒนา
    ],
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected');

  socket.on('userMessage', async (message) => {
    try {
      await processChatbotQuestion(message, socket);
    } catch (error) {
      console.error('Error processing chatbot request:', error);
      socket.emit('botMessage', 'เกิดข้อผิดพลาดในการประมวลผลคำตอบจาก Bot');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// User Routes
app.use('/', userRoutes);

// Auth Routes
app.use('/auth', authRoutes);

// Admin Routes (with JWT authentication)
app.use('/admin', authenticateJWT, adminRoutes);

// Start the server
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
