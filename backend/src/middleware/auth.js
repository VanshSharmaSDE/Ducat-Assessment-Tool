import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { User } from '../models/User.js';

export async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token required',
        errorCode: 'UNAUTHORIZED',
      });
    }

    const token = authHeader.split(' ')[1];
    let decoded;

    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Access token expired',
          errorCode: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid access token',
        errorCode: 'INVALID_TOKEN',
      });
    }

    // Always fetch fresh user from database to verify active status & current role
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists',
        errorCode: 'USER_NOT_FOUND',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'User account has been deactivated',
        errorCode: 'ACCOUNT_DEACTIVATED',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrative privileges required.',
      errorCode: 'FORBIDDEN',
    });
  }
  next();
}

export function requireAdminOrFaculty(req, res, next) {
  if (!req.user || !['ADMIN', 'FACULTY'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Administrative or Faculty privileges required.',
      errorCode: 'FORBIDDEN',
    });
  }
  next();
}

export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      errorCode: 'UNAUTHORIZED',
    });
  }
  next();
}
