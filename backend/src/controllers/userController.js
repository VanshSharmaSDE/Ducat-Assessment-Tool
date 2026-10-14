import { UserService } from '../services/userService.js';
import { AuthService } from '../services/authService.js';

export class UserController {
  static async getProfile(req, res, next) {
    try {
      const result = await UserService.getProfile(req.user._id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req, res, next) {
    try {
      const user = await UserService.updateProfile(req.user._id, req.body);
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: { user },
      });
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const result = await AuthService.changePassword(req.user._id, req.body);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTheme(req, res, next) {
    try {
      const { theme } = req.body;
      if (!theme || !['light', 'dark'].includes(theme)) {
        return res.status(400).json({ success: false, message: 'Invalid theme. Must be "light" or "dark".' });
      }
      const user = await UserService.updateTheme(req.user._id, theme);
      res.status(200).json({
        success: true,
        message: 'Theme preference saved successfully',
        data: { theme: user.theme, user },
      });
    } catch (err) {
      next(err);
    }
  }
}
