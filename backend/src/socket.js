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
    const headerToken = socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
    const token = socket.handshake.auth?.token || socket.handshake.query?.token || headerToken;
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      return next();
    } catch (err) {
      logger.debug(`Socket handshake token verification failed: ${err.message}`);
      return next();
    }
  });

  function joinUserRooms(socket, user) {
    if (!user) return;
    const uid = (user.userId || user._id || user.id)?.toString();
    if (uid) {
      socket.join(`user:${uid}`);
      logger.debug(`Socket ${socket.id} joined user:${uid}`);
    }
    if (user.role === 'ADMIN') {
      socket.join('admin-room');
      logger.debug(`Socket ${socket.id} joined admin-room`);
    } else if (user.role === 'FACULTY') {
      socket.join('faculty-room');
      logger.debug(`Socket ${socket.id} joined faculty-room`);
    }
  }

  ioInstance.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user: ${socket.user?.userId || 'anonymous'})`);

    // Auto-join rooms if authenticated during handshake
    if (socket.user) {
      joinUserRooms(socket, socket.user);
    }

    // Dynamic authentication (on login, token refresh, or reconnect)
    socket.on('authenticate', (data) => {
      const token = typeof data === 'string' ? data : data?.token;
      if (!token) return;
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        socket.user = decoded;
        joinUserRooms(socket, decoded);
        socket.emit('authenticated', {
          userId: (decoded.userId || decoded._id || decoded.id)?.toString(),
          role: decoded.role,
        });
      } catch (err) {
        logger.debug(`Socket auth error: ${err.message}`);
        socket.emit('unauthorized', { message: 'Invalid or expired token' });
      }
    });

    socket.on('logout', () => {
      if (socket.user) {
        const uid = (socket.user.userId || socket.user._id || socket.user.id)?.toString();
        if (uid) socket.leave(`user:${uid}`);
        socket.leave('admin-room');
        socket.leave('faculty-room');
        socket.user = null;
      }
    });

    socket.on('join-attempt', (attemptId) => {
      if (attemptId) {
        socket.join(`attempt:${attemptId}`);
      }
    });

    socket.on('leave-attempt', (attemptId) => {
      if (attemptId) {
        socket.leave(`attempt:${attemptId}`);
      }
    });

    // Real-time Support Chat Rooms
    socket.on('query:join', (queryId) => {
      if (queryId) {
        socket.join(`query:${queryId}`);
      }
    });

    socket.on('query:leave', (queryId) => {
      if (queryId) {
        socket.leave(`query:${queryId}`);
      }
    });

    socket.on('query:typing', ({ queryId, isTyping }) => {
      if (queryId) {
        socket.to(`query:${queryId}`).emit('query:typing', {
          queryId,
          userName: socket.user?.name || 'Someone',
          isTyping,
        });
      }
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
  if (ioInstance && attemptId) {
    ioInstance.to(`attempt:${attemptId}`).emit(event, data);
  }
}

export function emitToUser(userId, event, data) {
  if (ioInstance && userId) {
    ioInstance.to(`user:${String(userId)}`).emit(event, data);
  }
}

export function emitToAdmin(event, data) {
  if (ioInstance) {
    ioInstance.to('admin-room').emit(event, data);
  }
}

export function emitToFaculty(event, data) {
  if (ioInstance) {
    ioInstance.to('faculty-room').emit(event, data);
  }
}

export function emitToQuery(queryId, event, data) {
  if (ioInstance && queryId) {
    ioInstance.to(`query:${String(queryId)}`).emit(event, data);
  }
}
