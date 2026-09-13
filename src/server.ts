import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import { testConnection } from './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

async function start(): Promise<void> {
  try {
    await testConnection();
    console.log('✅ Connected to MySQL database.');
  } catch (err) {
    console.error('❌ Could not connect to MySQL. Check your .env settings.', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

start();
