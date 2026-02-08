import app from './app.js';
import { env, closeDatabase } from './config/index.js';

const PORT = env.PORT;

const server = app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`
  ╔═══════════════════════════════════════════════╗
  ║           SAN PABLO API                       ║
  ╠═══════════════════════════════════════════════╣
  ║  Server running on port ${PORT.toString().padEnd(20)}║
  ║  Environment: ${env.NODE_ENV.padEnd(27)}║
  ║  API Docs: ${env.API_URL}/api/docs             ║
  ╚═══════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  // eslint-disable-next-line no-console
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    // eslint-disable-next-line no-console
    console.log('HTTP server closed');

    try {
      await closeDatabase();
      // eslint-disable-next-line no-console
      console.log('Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
