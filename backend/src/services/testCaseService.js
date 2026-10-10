import { TestCase } from '../models/TestCase.js';
import { Question } from '../models/Question.js';

export class TestCaseService {
  static async addTestCase(questionId, data) {
    const question = await Question.findById(questionId);
    if (!question) {
      const error = new Error('Question not found');
      error.statusCode = 404;
      error.errorCode = 'QUESTION_NOT_FOUND';
      throw error;
    }

    const count = await TestCase.countDocuments({ questionId });
    const testCase = await TestCase.create({
      ...data,
      questionId,
      order: data.order !== undefined ? data.order : count + 1,
    });

    return testCase;
  }

  static async updateTestCase(id, data) {
    const testCase = await TestCase.findById(id);
    if (!testCase) {
      const error = new Error('Test case not found');
      error.statusCode = 404;
      error.errorCode = 'TEST_CASE_NOT_FOUND';
      throw error;
    }

    Object.assign(testCase, data);
    await testCase.save();

    return testCase;
  }

  static async deleteTestCase(id) {
    const testCase = await TestCase.findByIdAndDelete(id);
    if (!testCase) {
      const error = new Error('Test case not found');
      error.statusCode = 404;
      error.errorCode = 'TEST_CASE_NOT_FOUND';
      throw error;
    }

    return { message: 'Test case deleted successfully' };
  }

  static async getTestCasesByQuestion(questionId) {
    return TestCase.find({ questionId }).sort({ order: 1, createdAt: 1 });
  }
}
