import { ExamService } from '../services/examService.js';

export class ExamController {
  static async getAvailableExams(req, res, next) {
    try {
      const exams = await ExamService.getAvailableExams(req.user._id, req.query);
      res.status(200).json({
        success: true,
        data: { exams },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getExamDetails(req, res, next) {
    try {
      const { id } = req.params;
      const isAdmin = req.user?.role === 'ADMIN';
      const result = await ExamService.getExamDetails(id, req.user?._id, isAdmin, req.user);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async startExam(req, res, next) {
    try {
      const { id } = req.params;
      const clientIp = req.ip || req.connection.remoteAddress;
      const userAgent = req.headers['user-agent'] || '';

      const result = await ExamService.startExam(id, req.user._id, clientIp, userAgent, req.body?.deviceInfo);
      res.status(200).json({
        success: true,
        message: 'Exam started successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async recordEvent(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ExamService.recordExamEvent(id, req.user._id, req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async submitExam(req, res, next) {
    try {
      const { attemptId, answers } = req.body;
      const result = await ExamService.submitExam(attemptId, req.user._id, answers);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async runCustomCode(req, res, next) {
    try {
      const { id } = req.params;
      const { questionId, language, sourceCode, customInput } = req.body;
      const result = await ExamService.runCustomCode({
        examId: id,
        userId: req.user?._id,
        currentUser: req.user,
        questionId,
        language,
        sourceCode,
        customInput,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }
}

