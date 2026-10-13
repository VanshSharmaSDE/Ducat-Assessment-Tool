import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { User } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { config } from '../config/index.js';
import { getIO } from '../socket.js';

export class AuthService {
  static generateAccessToken(user, sessionId = null) {
    return jwt.sign(
      {
        userId: user._id,
        email: user.email || '',
        studentId: user.studentId || user.rollNumber || '',
        facultyId: user.facultyId || '',
        adminId: user.adminId || '',
        role: user.role,
        name: user.name,
        sessionId: sessionId || user.currentSessionId || null,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );
  }

  static async generateRefreshToken(userId) {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await RefreshToken.create({
      userId,
      token,
      expiresAt,
    });

    return token;
  }

  static async register({ name, email, studentId, password, phone, role = 'USER' }) {
    const cleanEmail = email ? email.toLowerCase().trim() : undefined;
    const cleanStudentId = studentId ? String(studentId).trim() : undefined;

    if (cleanEmail) {
      const existing = await User.findOne({ email: cleanEmail });
      if (existing) {
        const error = new Error('Email already registered');
        error.statusCode = 409;
        error.errorCode = 'EMAIL_ALREADY_EXISTS';
        throw error;
      }
    }

    if (cleanStudentId) {
      const existingId = await User.findOne({
        $or: [
          { studentId: { $regex: new RegExp(`^${cleanStudentId}$`, 'i') } },
          { rollNumber: { $regex: new RegExp(`^${cleanStudentId}$`, 'i') } },
        ],
      });
      if (existingId) {
        const error = new Error('Student ID already registered');
        error.statusCode = 409;
        error.errorCode = 'STUDENT_ID_EXISTS';
        throw error;
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const sessionId = uuidv4();

    const user = await User.create({
      name,
      email: cleanEmail,
      studentId: cleanStudentId,
      rollNumber: cleanStudentId || '',
      passwordHash,
      phone: phone || '',
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      currentSessionId: sessionId,
      isActive: true,
      isVerified: true,
    });

    const accessToken = AuthService.generateAccessToken(user, sessionId);
    const refreshToken = await AuthService.generateRefreshToken(user._id);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  static async login({ email, identifier, loginId, studentId, facultyId, password }) {
    const rawId = (identifier || email || loginId || studentId || facultyId || '').trim();
    if (!rawId) {
      const error = new Error('Student ID, Faculty ID, Admin ID, or Email is required');
      error.statusCode = 400;
      error.errorCode = 'IDENTIFIER_REQUIRED';
      throw error;
    }

    const lowerId = rawId.toLowerCase();
    const escaped = rawId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Build search queries: Student ID, Faculty ID, Admin ID, Roll Number, Email, or 'admin' shortcut
    const searchConditions = [
      { email: lowerId },
      { studentId: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      { facultyId: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      { adminId: { $regex: new RegExp(`^${escaped}$`, 'i') } },
      { rollNumber: { $regex: new RegExp(`^${escaped}$`, 'i') } },
    ];

    if (lowerId === 'admin') {
      searchConditions.push({ role: 'ADMIN' });
    }

    const user = await User.findOne({ $or: searchConditions });
    if (!user) {
      const error = new Error('Invalid ID/Email or password');
      error.statusCode = 401;
      error.errorCode = 'INVALID_CREDENTIALS';
      throw error;
    }

    if (!user.isActive) {
      const error = new Error('Account has been deactivated. Please contact support.');
      error.statusCode = 403;
      error.errorCode = 'ACCOUNT_DEACTIVATED';
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid ID/Email or password');
      error.statusCode = 401;
      error.errorCode = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Invalidate previous device/session by emitting socket event to existing connections
    try {
      const io = getIO();
      if (io) {
        io.to(`user:${user._id}`).emit('session:terminated', {
          message: 'Your account was logged in from another device. You have been logged out.',
        });
      }
    } catch (e) {
      // Non-critical socket broadcast error
    }

    const sessionId = uuidv4();
    user.currentSessionId = sessionId;
    await user.save();

    const accessToken = AuthService.generateAccessToken(user, sessionId);
    const refreshToken = await AuthService.generateRefreshToken(user._id);

    return {
      user: user.toJSON(),
      accessToken,
      refreshToken,
    };
  }

  static async refreshAccessToken(token) {
    if (!token) {
      const error = new Error('Refresh token is required');
      error.statusCode = 400;
      error.errorCode = 'REFRESH_TOKEN_REQUIRED';
      throw error;
    }

    const doc = await RefreshToken.findOne({ token, revoked: false });
    if (!doc || doc.expiresAt < new Date()) {
      const error = new Error('Refresh token expired or invalid');
      error.statusCode = 401;
      error.errorCode = 'INVALID_REFRESH_TOKEN';
      throw error;
    }

    const user = await User.findById(doc.userId);
    if (!user || !user.isActive) {
      const error = new Error('User not found or inactive');
      error.statusCode = 401;
      error.errorCode = 'USER_INACTIVE';
      throw error;
    }

    const accessToken = AuthService.generateAccessToken(user, user.currentSessionId);
    return { accessToken };
  }

  static async logout(token, userId = null) {
    if (token) {
      await RefreshToken.findOneAndUpdate({ token }, { revoked: true });
    }
    if (userId) {
      await User.findByIdAndUpdate(userId, { currentSessionId: null });
    }
    return { success: true };
  }

  static async forgotPassword(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return success anyway to avoid user enumeration
      return { message: 'If this email exists, password reset instructions have been sent.' };
    }

    const resetToken = uuidv4();
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();

    // In local dev/testing, we return token for ease of testing
    return {
      message: 'Password reset token generated.',
      devToken: config.env === 'development' ? resetToken : undefined,
    };
  }

  static async resetPassword({ token, newPassword }) {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      const error = new Error('Invalid or expired password reset token');
      error.statusCode = 400;
      error.errorCode = 'INVALID_RESET_TOKEN';
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return { message: 'Password has been reset successfully.' };
  }

  static async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.errorCode = 'USER_NOT_FOUND';
      throw error;
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      const error = new Error('Current password is incorrect');
      error.statusCode = 400;
      error.errorCode = 'INCORRECT_PASSWORD';
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    return { message: 'Password updated successfully' };
  }
}
