import { User } from '../models/User.js';
import { Exam } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';

export class AdminService {
  static async getDashboardAnalytics(currentUser = null) {
    const now = new Date();
    const isFaculty = currentUser && currentUser.role === 'FACULTY';

    let userFilter = { role: 'USER' };
    let examFilter = {};
    let examActiveFilter = { isPublished: true, startDate: { $lte: now }, endDate: { $gte: now } };
    let subFilter = {};
    let attemptFilter = {};
    let questionFilter = {};

    if (isFaculty) {
      userFilter.createdBy = currentUser._id;
      examFilter.createdBy = currentUser._id;
      examActiveFilter.createdBy = currentUser._id;
      questionFilter.createdBy = currentUser._id;

      const myStudentIds = await User.find({ role: 'USER', createdBy: currentUser._id }).distinct('_id');
      subFilter.userId = { $in: myStudentIds };
      attemptFilter.userId = { $in: myStudentIds };
    }

    const [
      totalUsers,
      totalExams,
      activeExams,
      totalSubmissions,
      completedAttempts,
      allAttempts,
      submissionsByLang,
      questionsByDiff,
    ] = await Promise.all([
      User.countDocuments(userFilter),
      Exam.countDocuments(examFilter),
      Exam.countDocuments(examActiveFilter),
      Submission.countDocuments(subFilter),
      ExamAttempt.find({ ...attemptFilter, status: { $in: ['EVALUATED', 'SUBMITTED'] } }),
      ExamAttempt.countDocuments(attemptFilter),
      Submission.aggregate([
        ...(isFaculty ? [{ $match: subFilter }] : []),
        { $group: { _id: '$language', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Question.aggregate([
        ...(isFaculty ? [{ $match: questionFilter }] : []),
        { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      ]),
    ]);

    // Calculate Average Score and Pass Rate
    let totalScoreSum = 0;
    let passedCount = 0;

    completedAttempts.forEach((att) => {
      totalScoreSum += att.percentage || 0;
      if (att.resultStatus === 'PASS') {
        passedCount += 1;
      }
    });

    const averageScore = completedAttempts.length > 0
      ? +(totalScoreSum / completedAttempts.length).toFixed(1)
      : 0;

    const passRate = completedAttempts.length > 0
      ? +((passedCount / completedAttempts.length) * 100).toFixed(1)
      : 0;

    // Recent 5 submissions
    const recentSubmissions = await Submission.find(subFilter)
      .populate('userId', 'name email')
      .populate('examId', 'title')
      .populate('questionId', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    return {
      stats: {
        totalUsers,
        totalExams,
        activeExams,
        completedExams: completedAttempts.length,
        totalSubmissions,
        totalAttempts: allAttempts,
        averageScore,
        passRate,
      },
      languageDistribution: submissionsByLang.map((l) => ({ language: l._id, count: l.count })),
      difficultyDistribution: questionsByDiff.map((d) => ({ difficulty: d._id, count: d.count })),
      recentSubmissions,
    };
  }

  static async getUsers(query = {}, currentUser = null) {
    const filter = { role: 'USER' };
    if (currentUser && currentUser.role === 'FACULTY') {
      filter.createdBy = currentUser._id;
    }

    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: 'i' } },
        { email: { $regex: query.search, $options: 'i' } },
        { rollNumber: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.status !== undefined && query.status !== '') {
      filter.isActive = query.status === 'active';
    }
    if (query.batch) {
      filter.batch = query.batch;
    }
    if (query.gender) {
      filter.gender = query.gender;
    }

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '15', 10);
    const skip = (page - 1) * limit;

    const [users, total, availableBatches, availableGenders] = await Promise.all([
      User.find(filter)
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
      User.distinct('batch', { ...filter, batch: { $ne: '' } }),
      User.distinct('gender', { ...filter, gender: { $ne: '' } }),
    ]);

    // Attach attempts count and avg score for each user
    const usersWithStats = await Promise.all(
      users.map(async (u) => {
        const attempts = await ExamAttempt.find({ userId: u._id, status: 'EVALUATED' });
        const avgScore = attempts.length
          ? +(attempts.reduce((acc, curr) => acc + (curr.percentage || 0), 0) / attempts.length).toFixed(1)
          : 0;

        return {
          ...u.toJSON(),
          createdBy: u.createdBy,
          examsAttempted: attempts.length,
          averageScore: avgScore,
        };
      })
    );

    return {
      users: usersWithStats,
      availableBatches,
      availableGenders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  static async toggleUserStatus(userId, currentUser = null) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.errorCode = 'USER_NOT_FOUND';
      throw error;
    }

    if (user.role === 'ADMIN') {
      const error = new Error('Cannot toggle status of administrator account');
      error.statusCode = 400;
      error.errorCode = 'CANNOT_MODIFY_ADMIN';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(user.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only modify students created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    user.isActive = !user.isActive;
    await user.save();

    return {
      userId: user._id,
      isActive: user.isActive,
      message: `User account ${user.isActive ? 'activated' : 'deactivated'} successfully`,
    };
  }

  static async deleteUser(userId, currentUser = null) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.errorCode = 'USER_NOT_FOUND';
      throw error;
    }

    if (user.role === 'ADMIN') {
      const error = new Error('Cannot delete administrator account');
      error.statusCode = 400;
      error.errorCode = 'CANNOT_DELETE_ADMIN';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(user.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only delete students created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    // Cascade delete attempts, submissions, and submission results
    await ExamAttempt.deleteMany({ userId });
    await Submission.deleteMany({ userId });
    await SubmissionResult.deleteMany({ userId });
    await User.findByIdAndDelete(userId);

    return {
      success: true,
      message: `User ${user.name} and associated attempt records deleted successfully.`,
    };
  }

  static async getAllExams(currentUser = null) {
    const filter = {};
    if (currentUser && currentUser.role === 'FACULTY') {
      filter.createdBy = currentUser._id;
    }

    const exams = await Exam.find(filter)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    const now = new Date();

    return exams.map((exam) => {
      const examObj = exam.toObject();
      let calculatedStatus = exam.status || 'DRAFT';

      if (exam.isPublished) {
        if (now < new Date(exam.startDate)) {
          calculatedStatus = 'UPCOMING';
        } else if (now > new Date(exam.endDate)) {
          calculatedStatus = 'EXPIRED';
        } else {
          calculatedStatus = 'ACTIVE';
        }
      } else {
        calculatedStatus = 'DRAFT';
      }

      return {
        ...examObj,
        questionCount: exam.questions?.length || 0,
        calculatedStatus,
      };
    });
  }

  static async createExam(data, adminId) {
    // Calculate total marks from questions
    let totalMarks = 0;
    const questions = (data.questions || []).map((q, idx) => {
      totalMarks += Number(q.marks || 0);
      return {
        questionId: q.questionId,
        marks: Number(q.marks || 0),
        order: q.order !== undefined ? q.order : idx + 1,
      };
    });

    const exam = await Exam.create({
      ...data,
      totalMarks: data.totalMarks || totalMarks || 100,
      questions,
      createdBy: adminId,
    });

    return exam;
  }

  static async updateExam(id, data, currentUser = null) {
    const exam = await Exam.findById(id);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(exam.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only update examinations created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    if (data.questions) {
      let totalMarks = 0;
      data.questions = data.questions.map((q, idx) => {
        totalMarks += Number(q.marks || 0);
        return {
          questionId: q.questionId,
          marks: Number(q.marks || 0),
          order: q.order !== undefined ? q.order : idx + 1,
        };
      });
      if (!data.totalMarks) {
        data.totalMarks = totalMarks;
      }
    }

    Object.assign(exam, data);
    await exam.save();

    return exam;
  }

  static async deleteExam(id, currentUser = null) {
    const exam = await Exam.findById(id);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(exam.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only delete examinations created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    // Check if exam has attempts
    const attempts = await ExamAttempt.countDocuments({ examId: id });
    if (attempts > 0) {
      // Soft-delete or archive
      exam.status = 'ARCHIVED';
      exam.isPublished = false;
      await exam.save();
      return { message: 'Exam has candidate attempts; archived instead of deleted.' };
    }

    await Exam.findByIdAndDelete(id);
    return { message: 'Exam deleted successfully.' };
  }

  static async duplicateExam(id, adminId, currentUser = null) {
    const original = await Exam.findById(id);
    if (!original) {
      const error = new Error('Original exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(original.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only duplicate examinations created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    const copyData = original.toObject();
    delete copyData._id;
    delete copyData.createdAt;
    delete copyData.updatedAt;
    copyData.title = `${original.title} (Copy)`;
    copyData.isPublished = false;
    copyData.status = 'DRAFT';
    copyData.createdBy = adminId;

    const newExam = await Exam.create(copyData);
    return newExam;
  }

  static async reorderQuestions(examId, orderedQuestionIds, currentUser = null) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (currentUser && currentUser.role === 'FACULTY' && String(exam.createdBy) !== String(currentUser._id)) {
      const error = new Error('Access denied. You can only modify examinations created by you.');
      error.statusCode = 403;
      error.errorCode = 'FORBIDDEN';
      throw error;
    }

    const qMap = new Map();
    exam.questions.forEach((q) => qMap.set(q.questionId.toString(), q));

    const reordered = [];
    orderedQuestionIds.forEach((qId, idx) => {
      const existing = qMap.get(qId.toString());
      if (existing) {
        existing.order = idx + 1;
        reordered.push(existing);
      }
    });

    exam.questions = reordered;
    await exam.save();

    return exam;
  }
}
