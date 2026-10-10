import { ResultService } from '../services/resultService.js';

export class ResultController {
  static async getMyResults(req, res, next) {
    try {
      const results = await ResultService.getUserResults(req.user._id);
      res.status(200).json({
        success: true,
        data: { results },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getResultDetails(req, res, next) {
    try {
      const { id } = req.params;
      const isAdmin = req.user?.role === 'ADMIN';
      const result = await ResultService.getResultDetails(id, req.user._id, isAdmin, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}
