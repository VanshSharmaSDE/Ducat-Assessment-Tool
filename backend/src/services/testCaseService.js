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
    const testCase = await TestCase.findById(id);
    if (!testCase) {
      const error = new Error('Test case not found');
      error.statusCode = 404;
      error.errorCode = 'TEST_CASE_NOT_FOUND';
      throw error;
    }

    const question = await Question.findById(testCase.questionId);
    if (question && (question.type || 'CODING') === 'CODING') {
      const allCases = await TestCase.find({ questionId: testCase.questionId });
      const remaining = allCases.filter((c) => c._id.toString() !== id.toString());
      const hasPublic = remaining.some((c) => !c.isHidden);
      const hasHidden = remaining.some((c) => c.isHidden);
      if (!hasPublic || !hasHidden) {
        const error = new Error('Cannot delete this test case: Coding problems require at least one public and one hidden (private) test case.');
        error.statusCode = 400;
        error.errorCode = 'TEST_CASES_REQUIRED';
        throw error;
      }
    }

    await TestCase.findByIdAndDelete(id);
    return { message: 'Test case deleted successfully' };
  }

  static async getTestCasesByQuestion(questionId) {
    return TestCase.find({ questionId }).sort({ order: 1, createdAt: 1 });
  }
}
