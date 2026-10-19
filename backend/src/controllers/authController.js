import { AuthService } from '../services/authService.js';

export class AuthController {
  static async login(req, res, next) {
    try {
      const result = await AuthService.login({
        ...req.body,
        userAgent: req.headers['user-agent'] || '',
      });
      res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshAccessToken(refreshToken);
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async logout(req, res, next) {
    try {
      const { refreshToken } = req.body;
      await AuthService.logout(refreshToken, req.user?._id);
      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      res.status(200).json({
        success: true,
        data: {
          user: req.user.toJSON(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
