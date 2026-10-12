import { QuestionService } from '../services/questionService.js';

export class QuestionController {
  static async getAllQuestions(req, res, next) {
    try {
      const questions = await QuestionService.getAllQuestions(req.query, req.user);
      res.status(200).json({
        success: true,
        data: { questions },
      });
    } catch (err) {
      next(err);
    }
  }

  static async getQuestionById(req, res, next) {
    try {
      const { id } = req.params;
      const isAdmin = req.user?.role === 'ADMIN';
      const question = await QuestionService.getQuestionById(id, isAdmin, req.user);
      res.status(200).json({
        success: true,
        data: { question },
      });
    } catch (err) {
      next(err);
    }
  }

  static async createQuestion(req, res, next) {
    try {
      const question = await QuestionService.createQuestion(req.body, req.user._id);
      res.status(201).json({
        success: true,
        message: 'Question created successfully',
        data: { question },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const question = await QuestionService.updateQuestion(id, req.body, req.user);
      res.status(200).json({
        success: true,
        message: 'Question updated successfully',
        data: { question },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const result = await QuestionService.deleteQuestion(id, req.user);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async bulkDeleteQuestions(req, res, next) {
    try {
      const { ids } = req.body;
      const result = await QuestionService.bulkDeleteQuestions(ids, req.user);
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async duplicateQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const question = await QuestionService.duplicateQuestion(id, req.user._id, req.user);
      res.status(201).json({
        success: true,
        message: 'Question duplicated successfully',
        data: { question },
      });
    } catch (err) {
      next(err);
    }
  }

  static async uploadQuestionsExcel(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'Please upload an Excel (.xlsx or .xls) file.' });
      }

      const { QuestionExcelService } = await import('../services/questionExcelService.js');
      const result = await QuestionExcelService.importQuestions(req.file.buffer, req.user._id);

      res.status(200).json({
        success: true,
        message: `Successfully imported ${result.importedCount} questions.`,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  static async downloadQuestionTemplate(req, res, next) {
    try {
      const { QuestionExcelService } = await import('../services/questionExcelService.js');
      const buffer = QuestionExcelService.generateTemplate();

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="question_import_template.xlsx"');
      res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}
