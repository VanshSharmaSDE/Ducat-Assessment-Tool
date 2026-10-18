import jwt from 'jsonwebtoken';
import { AuthService } from '../src/services/authService.js';
import { config } from '../src/config/index.js';

describe('Auth Service & Role Protection Unit Tests', () => {
  test('generates valid JWT with user id and role payload', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'test@assessment.com',
      role: 'USER',
      name: 'Test Candidate',
    };

    const token = AuthService.generateAccessToken(mockUser);
    expect(typeof token).toBe('string');

    const decoded = jwt.verify(token, config.jwt.secret);
    expect(decoded.userId).toBe(mockUser._id);
    expect(decoded.role).toBe('USER');
    expect(decoded.email).toBe(mockUser.email);
  });

  test('generates distinct token with ADMIN role', () => {
    const mockAdmin = {
      _id: '507f1f77bcf86cd799439022',
      email: 'admin@assessment.com',
      role: 'ADMIN',
      name: 'Admin User',
    };

    const token = AuthService.generateAccessToken(mockAdmin);
    const decoded = jwt.verify(token, config.jwt.secret);
    expect(decoded.role).toBe('ADMIN');
  });

  test('rejects tampering with secret signature', () => {
    const mockUser = {
      _id: '507f1f77bcf86cd799439011',
      email: 'test@assessment.com',
      role: 'USER',
    };

    const token = AuthService.generateAccessToken(mockUser);
    expect(() => {
      jwt.verify(token, 'wrong_tampered_secret_key');
    }).toThrow();
  });

  test('User schema initializes restrictStudentLaptopOnly to false by default', async () => {
    const { User } = await import('../src/models/User.js');
    const user = new User({
      name: 'Faculty User',
      email: 'faculty@assessment.com',
      passwordHash: 'dummyhash123',
      role: 'FACULTY',
    });
    expect(user.restrictStudentLaptopOnly).toBe(false);

    user.restrictStudentLaptopOnly = true;
    expect(user.restrictStudentLaptopOnly).toBe(true);
  });
});
