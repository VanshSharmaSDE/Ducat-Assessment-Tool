import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';

let ioInstance = null;

export function initSocket(server) {
  const allowedOrigins = [
    config.clientUrl,
    'https://skillcodex.tech',
    'https://api.skillcodex.tech',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5000',
    'http://127.0.0.1:5000',
  ].filter(Boolean);

  ioInstance = new Server(server, {
    cors: {
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
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  ioInstance.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      // allow unauthenticated socket if needed, but associate rooms when token is present
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      socket.join(`user:${decoded.userId}`);
      if (decoded.role === 'ADMIN') {
        socket.join('admin-room');
      }
      return next();
    } catch (err) {
      return next();
    }
  });

  ioInstance.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.user?.userId || 'anonymous'})`);

    socket.on('join-attempt', (attemptId) => {
      socket.join(`attempt:${attemptId}`);
    });

    socket.on('leave-attempt', (attemptId) => {
      socket.leave(`attempt:${attemptId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return ioInstance;
}

export function getIO() {
  return ioInstance;
}

export function emitToAttempt(attemptId, event, data) {
  if (ioInstance) {
    ioInstance.to(`attempt:${attemptId}`).emit(event, data);
  }
}

export function emitToUser(userId, event, data) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, data);
  }
}

export function emitToAdmin(event, data) {
  if (ioInstance) {
    ioInstance.to('admin-room').emit(event, data);
  }
}
