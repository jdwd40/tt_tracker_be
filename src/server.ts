import app from './app';
import { env } from './config/env';
import { testConnection, closePool } from './db';

const PORT = process.env['PORT'] || 3000;

async function startServer(): Promise<void> {
  try {
    // Test database connection
    await testConnection();

    // Start server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/healthz`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

      server.close(() => {
        console.log('✅ HTTP server closed');
      });

      await closePool();
      console.log('✅ Database pool closed');

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();
