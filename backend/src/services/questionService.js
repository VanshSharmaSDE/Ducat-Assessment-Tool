import { Question } from '../models/Question.js';
import { TestCase } from '../models/TestCase.js';
import { Exam } from '../models/Exam.js';
import { SUPPORTED_LANGUAGES, DEFAULT_STARTER_CODE } from '../utils/starterCode.js';

export class QuestionService {
  static async createQuestion(data, userId) {
    const starterCodeMap = new Map();
    const allowed = data.allowedLanguages && data.allowedLanguages.length > 0
      ? data.allowedLanguages
      : SUPPORTED_LANGUAGES;

    allowed.forEach((lang) => {
      const customCode = data.starterCode ? data.starterCode[lang] : null;
      starterCodeMap.set(lang, customCode || DEFAULT_STARTER_CODE[lang] || '');
    });

    const question = await Question.create({
      ...data,
      starterCode: starterCodeMap,
      createdBy: userId,
    });

    return question;
  }

  static async updateQuestion(id, data, currentUser = null) {
    const question = await Question.findById(id);
    if (!question) {
      const error = new Error('Question not found');
      error.statusCode = 404;
      error.errorCode = 'QUESTION_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(question.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only update questions created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    if (data.starterCode) {
      const currentMap = question.starterCode || new Map();
      Object.entries(data.starterCode).forEach(([lang, code]) => {
        currentMap.set(lang, code);
      });
      data.starterCode = currentMap;
    }

    Object.assign(question, data);
    await question.save();

    return question;
  }

  static async deleteQuestion(id, currentUser = null) {
    const question = await Question.findById(id);
    if (!question) {
      const error = new Error('Question not found');
      error.statusCode = 404;
      error.errorCode = 'QUESTION_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(question.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only delete questions created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    // Check if question is used in any published exam
    const usedInExam = await Exam.findOne({ 'questions.questionId': id, isPublished: true });
    if (usedInExam) {
      const error = new Error(`Cannot delete question as it is attached to published exam "${usedInExam.title}"`);
      error.statusCode = 400;
      error.errorCode = 'QUESTION_IN_USE';
      throw error;
    }

    await TestCase.deleteMany({ questionId: id });
    await Question.findByIdAndDelete(id);

    return { message: 'Question and associated test cases deleted successfully' };
  }

  static async bulkDeleteQuestions(ids, currentUser = null) {
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      const error = new Error('No question IDs provided for deletion');
      error.statusCode = 400;
      throw error;
    }

    let filter = { _id: { $in: ids } };
    if (currentUser && currentUser.role === 'FACULTY') {
      filter.createdBy = currentUser._id;
    }

    const validQuestions = await Question.find(filter).distinct('_id');
    if (validQuestions.length === 0) {
      return { count: 0, message: 'No eligible questions found to delete' };
    }

    // Delete associated test cases
    await TestCase.deleteMany({ questionId: { $in: validQuestions } });
    const res = await Question.deleteMany({ _id: { $in: validQuestions } });
    return { count: res.deletedCount, message: `Successfully deleted ${res.deletedCount} question(s).` };
  }

  static async duplicateQuestion(id, userId, currentUser = null) {
    const original = await Question.findById(id);
    if (!original) {
      const error = new Error('Original question not found');
      error.statusCode = 404;
      error.errorCode = 'QUESTION_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(original.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only duplicate questions created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    const copyData = original.toObject();
    delete copyData._id;
    delete copyData.createdAt;
    delete copyData.updatedAt;
    copyData.title = `${original.title} (Copy)`;
    copyData.createdBy = userId;

    const newQuestion = await Question.create(copyData);

    // Duplicate test cases
    const testCases = await TestCase.find({ questionId: id });
    for (const tc of testCases) {
      const tcCopy = tc.toObject();
      delete tcCopy._id;
      tcCopy.questionId = newQuestion._id;
      await TestCase.create(tcCopy);
    }

    return newQuestion;
  }

  static async getQuestionById(id, isAdmin = false, currentUser = null) {
    const question = await Question.findById(id).populate('createdBy', 'name email role');
    if (!question) {
      const error = new Error('Question not found');
      error.statusCode = 404;
      error.errorCode = 'QUESTION_NOT_FOUND';
      throw error;
    }

    let testCases = [];
    if (isAdmin || (currentUser && ['ADMIN', 'FACULTY'].includes(currentUser.role))) {
      testCases = await TestCase.find({ questionId: id }).sort({ order: 1 });
    }

    return {
      ...question.toObject(),
      testCases,
    };
  }

  static async getAllQuestions(query = {}, currentUser = null) {
    const filter = {};
    if (currentUser && currentUser.role === 'FACULTY') {
      filter.createdBy = currentUser._id;
    }
    if (query.type) {
      filter.type = query.type.toUpperCase();
    }
    if (query.difficulty) {
      filter.difficulty = query.difficulty;
    }
    if (query.search) {
      filter.title = { $regex: query.search, $options: 'i' };
    }

    const questions = await Question.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    // Attach test case count
    const questionsWithCount = await Promise.all(
      questions.map(async (q) => {
        const testCaseCount = await TestCase.countDocuments({ questionId: q._id });
        return {
          ...q.toObject(),
          testCaseCount,
        };
      })
    );

    return questionsWithCount;
  }
}
