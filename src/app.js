import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import authRoutes from './routes/authRoutes.js';
import cookieParser from 'cookie-parser';
import eventRoutes from './routes/eventRoutes.js'

const app = express();

app.use(helmet());
app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

app.use(cors({
  origin: process.env.FRONTEND_URL , 
  credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/event',eventRoutes);
app.get('/', (req, res) => {
  res.send('SnapReserve Backend is running!');
});

export default app;
