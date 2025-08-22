
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDB } from './database/db';
import contactRoutes from './routes/contactRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Bitespeed Identity Service is running' });
});

app.use('/', contactRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

const startServer = async () => {
  try {
    await initializeDB();
    app.listen(PORT, () => {
      console.log(` Server is running on port ${PORT}`);
      console.log(` Health check: http://localhost:${PORT}/health`);
      console.log(` Identify endpoint: http://localhost:${PORT}/identify`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();