import { TestCaseService } from '../services/testCaseService.js';

export class TestCaseController {
  static async addTestCase(req, res, next) {
    try {
      const { questionId } = req.params;
      const testCase = await TestCaseService.addTestCase(questionId, req.body);
      res.status(201).json({
        success: true,
        message: 'Test case added successfully',
        data: { testCase },
      });
    } catch (err) {
      next(err);
    }
  }

  static async updateTestCase(req, res, next) {
    try {
      const { id } = req.params;
      const testCase = await TestCaseService.updateTestCase(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Test case updated successfully',
        data: { testCase },
      });
    } catch (err) {
      next(err);
    }
  }

  static async deleteTestCase(req, res, next) {
    try {
      const { id } = req.params;
      const result = await TestCaseService.deleteTestCase(id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getTestCasesByQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const testCases = await TestCaseService.getTestCasesByQuestion(questionId);
      res.status(200).json({
        success: true,
        data: { testCases },
      });
    } catch (err) {
      next(err);
    }
  }
}
