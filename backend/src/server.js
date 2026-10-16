import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { config } from './config/index.js';
import { connectDB } from './config/db.js';
import { initSocket } from './socket.js';
import { startContainerPool, stopContainerPool } from './execution/containerPool.js';
import { startWorker } from './workers/evaluationWorker.js';
import { generalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import apiRouter from './routes/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '../uploads');
const profilesDir = path.join(uploadsDir, 'profiles');
if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true });
}

export const app = express();
const server = http.createServer(app);

// Security Middleware (allowing cross-origin for local uploads)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
const allowedOrigins = [
  config.clientUrl,
  'https://skillcodex.tech',
  'https://api.skillcodex.tech',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https?:\/\/([a-zA-Z0-9-]+\.)*skillcodex\.tech(:\d+)?$/.test(origin) ||
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Serve static profile uploads with CORS/CORP headers
const staticUploadsOptions = {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
  },
};
app.use('/uploads', express.static(uploadsDir, staticUploadsOptions));
app.use('/api/uploads', express.static(uploadsDir, staticUploadsOptions));

// Body Parsing with safe size limits
app.use(express.json({ limit: '512kb' }));
app.use(express.urlencoded({ extended: true, limit: '512kb' }));

// Compression and Logging
app.use(compression());
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Global rate limiting
app.use('/api', generalLimiter);

// Mount API routes
app.use('/api', apiRouter);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Socket.io initialization
export const io = initSocket(server);

// Boot function
export async function startServer() {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // 2. Start the warm sandbox containers (java / python / js). Non-fatal without Docker.
    await startContainerPool();

    // 3. Start evaluation worker
    startWorker();

    // 4. Start listening
    const port = config.port;
    server.listen(port, () => {
      logger.info(`=======================================================`);
      logger.info(` CodeAssess API Server running on port ${port}`);
      logger.info(` Environment: ${config.env}`);
      logger.info(` Client URL: ${config.clientUrl}`);
      logger.info(`=======================================================`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`, err);
    process.exit(1);
  }
}

// Remove sandbox containers when the server stops
let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${signal} received - shutting down`);
  await stopContainerPool().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at Promise', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception thrown', err);
});

// Run directly if not imported by test runner
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { server };
