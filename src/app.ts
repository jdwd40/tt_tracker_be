import express from 'express';
import cors from 'cors';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './modules/auth';
import { timeEntriesRouter } from './modules/time-entries';
import { subjectsRouter } from './modules/subjects';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/healthz', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/auth', authRouter);
app.use('/time-entries', timeEntriesRouter);
app.use('/subjects', subjectsRouter);
// app.use('/reports', reportsRouter);

// 404 handler (must be before error handler)
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
