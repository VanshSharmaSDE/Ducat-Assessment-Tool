import { User } from '../models/User.js';
import { ExamAttempt } from '../models/ExamAttempt.js';

export class UserService {
  static async getProfile(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.errorCode = 'USER_NOT_FOUND';
      throw error;
    }

    // Compute user dashboard statistics
    const attempts = await ExamAttempt.find({ userId });
    const completedAttempts = attempts.filter((a) => a.status === 'EVALUATED');

    const totalAttempted = attempts.length;
    const totalCompleted = completedAttempts.length;

    let totalScoreSum = 0;
    let highestScore = 0;

    completedAttempts.forEach((a) => {
      totalScoreSum += a.percentage || 0;
      if ((a.percentage || 0) > highestScore) {
        highestScore = a.percentage;
      }
    });

    const averageScore = totalCompleted > 0 ? +(totalScoreSum / totalCompleted).toFixed(1) : 0;

    return {
      user: user.toJSON(),
      stats: {
        totalAttempted,
        totalCompleted,
        averageScore,
        highestScore,
      },
    };
  }

  static async updateProfile(userId, { name, email, phone, batch, gender, age, rollNumber, password }) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.errorCode = 'USER_NOT_FOUND';
      throw error;
    }

    if (email && email.toLowerCase().trim() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: userId } });
      if (existing) {
        const error = new Error('Email is already registered by another account');
        error.statusCode = 400;
        error.errorCode = 'EMAIL_IN_USE';
        throw error;
      }
      user.email = email.toLowerCase().trim();
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (gender !== undefined) user.gender = gender.trim();
    if (age !== undefined) user.age = age === '' || age === null ? null : Number(age);

    // Only Admin can change assigned batch or rollNumber via self-profile update
    if (user.role === 'ADMIN') {
      if (rollNumber !== undefined) user.rollNumber = rollNumber.trim();
      if (batch !== undefined) user.batch = batch.trim();
    }

    if (password && password.trim().length >= 6) {
      const bcrypt = (await import('bcryptjs')).default;
      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(password.trim(), salt);
    }

    await user.save();
    return user.toJSON();
  }
}
