import app from './app.js';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import {setupSocket} from './sockets/index.js';

dotenv.config();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setupSocket(io); 

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
