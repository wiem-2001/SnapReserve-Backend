import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import eventRoutes from './routes/eventRoutes.js'
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONTEND_URL , 
  credentials: true
}));
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);

app.use('/api/event',eventRoutes);
app.get('/', (req, res) => {
  res.send('SnapReserve Backend is running!');
});

export default app;
