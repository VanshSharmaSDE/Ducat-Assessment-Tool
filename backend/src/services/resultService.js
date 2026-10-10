import { ExamAttempt } from '../models/ExamAttempt.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';
import { Exam } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { User } from '../models/User.js';

export class ResultService {
  static async getUserResults(userId) {
    const attempts = await ExamAttempt.find({
      userId,
      status: { $in: ['EVALUATING', 'EVALUATED', 'SUBMITTED'] },
    })
      .populate('examId', 'title description duration totalMarks passingMarks difficulty')
      .sort({ createdAt: -1 });

    return attempts.map((att) => ({
      _id: att._id,
      exam: att.examId,
      startedAt: att.startedAt,
      submittedAt: att.submittedAt,
      status: att.status,
      totalScore: att.totalScore,
      maxScore: att.maxScore,
      percentage: att.percentage,
      resultStatus: att.resultStatus,
      violationCount: att.violationCount,
    }));
  }

  static async getResultDetails(attemptId, userId, isAdmin = false, currentUser = null) {
    const filter = { _id: attemptId };
    if (!isAdmin && !currentUser) {
      filter.userId = userId;
    }

    const attempt = await ExamAttempt.findOne(filter)
      .populate({
        path: 'userId',
        select: 'name email phone rollNumber batch gender createdBy',
        populate: { path: 'createdBy', select: 'name email role' }
      })
      .populate({
        path: 'examId',
        select: 'title description duration totalMarks passingMarks difficulty instructions questions createdBy',
        populate: { path: 'createdBy', select: 'name email role' }
      });

    if (!attempt) {
      const error = new Error('Result not found or access unauthorized');
      error.statusCode = 404;
      error.errorCode = 'RESULT_NOT_FOUND';
      throw error;
    }

    // Role check: Faculty can only view results of students they created or exams they created
    if (currentUser && currentUser.role === 'FACULTY') {
      const studentCreatedBy = attempt.userId?.createdBy?._id || attempt.userId?.createdBy;
      const examCreatedBy = attempt.examId?.createdBy?._id || attempt.examId?.createdBy;
      const isCreatorOfStudent = studentCreatedBy && String(studentCreatedBy) === String(currentUser._id);
      const isCreatorOfExam = examCreatedBy && String(examCreatedBy) === String(currentUser._id);

      if (!isCreatorOfStudent && !isCreatorOfExam) {
        const error = new Error('Access denied. You can only view results for students or exams you created.');
        error.statusCode = 403;
        error.errorCode = 'FORBIDDEN';
        throw error;
      }
    }

    // Fetch submissions and results
    const submissions = await Submission.find({ attemptId });
    const submissionResults = await SubmissionResult.find({ attemptId });

    // Fetch questions to map titles and metadata
    const questionIds = submissions.map((s) => s.questionId);
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map();
    questions.forEach((q) => questionMap.set(q._id.toString(), q));

    const resultMap = new Map();
    submissionResults.forEach((r) => resultMap.set(r.questionId.toString(), r));

    const questionBreakdown = submissions.map((sub) => {
      const q = questionMap.get(sub.questionId.toString());
      const res = resultMap.get(sub.questionId.toString());

      // Sanitize test cases for students: NEVER expose hidden test case inputs/expected outputs!
      let sanitizedTestResults = [];
      if (res && res.testResults) {
        sanitizedTestResults = res.testResults.map((tr) => {
          if (isAdmin || (currentUser && ['ADMIN', 'FACULTY'].includes(currentUser.role))) {
            return tr; // Admin and Faculty can see full test breakdown
          }
          return {
            isHidden: tr.isHidden,
            passed: tr.passed,
            status: tr.status,
            executionTime: tr.executionTime,
            actualOutput: tr.isHidden ? undefined : tr.actualOutput,
            expectedOutput: tr.isHidden ? undefined : tr.expectedOutput,
            input: tr.isHidden ? undefined : tr.input,
            errorMessage: tr.isHidden ? undefined : tr.errorMessage,
          };
        });
      }

      return {
        questionId: sub.questionId,
        questionTitle: q ? q.title : 'Question',
        questionDifficulty: q ? q.difficulty : 'MEDIUM',
        maxMarks: q ? q.marks : 0,
        language: sub.language,
        submittedCode: sub.sourceCode,
        submissionStatus: sub.status,
        result: res
          ? {
              passedTests: res.passedTests,
              totalTests: res.totalTests,
              score: res.score,
              maxScore: res.maxScore,
              status: res.status,
              executionTime: res.executionTime,
              memoryUsed: res.memoryUsed,
              compileOutput: res.compileOutput,
              testResults: sanitizedTestResults,
            }
          : null,
      };
    });

    return {
      attempt: {
        _id: attempt._id,
        user: attempt.userId,
        exam: attempt.examId,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        status: attempt.status,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        resultStatus: attempt.resultStatus,
        violationCount: attempt.violationCount,
        events: (isAdmin || currentUser) ? attempt.events : undefined,
      },
      questionBreakdown,
    };
  }

  static async getAllResultsAdmin(query = {}, currentUser = null) {
    const filter = {};
    const isFaculty = currentUser && currentUser.role === 'FACULTY';

    if (isFaculty) {
      const myStudentIds = await User.find({ createdBy: currentUser._id }).distinct('_id');
      filter.userId = { $in: myStudentIds };
    }

    if (query.examId) {
      filter.examId = query.examId;
    }
    if (query.userId) {
      if (isFaculty) {
        const isMyStudent = await User.exists({ _id: query.userId, createdBy: currentUser._id });
        if (!isMyStudent) {
          filter.userId = { $in: [] };
        } else {
          filter.userId = query.userId;
        }
      } else {
        filter.userId = query.userId;
      }
    }
    if (query.resultStatus) {
      filter.resultStatus = query.resultStatus;
    }

    // Filter by student batch or gender
    const userFilter = {};
    if (isFaculty) {
      userFilter.createdBy = currentUser._id;
    }
    if (query.batch) userFilter.batch = query.batch;
    if (query.gender) userFilter.gender = query.gender;

    if (Object.keys(userFilter).length > 0) {
      const userIds = await User.find(userFilter).distinct('_id');
      if (filter.userId && filter.userId.$in) {
        const existingIds = new Set(filter.userId.$in.map(String));
        filter.userId = { $in: userIds.filter((id) => existingIds.has(String(id))) };
      } else {
        filter.userId = { $in: userIds };
      }
    }

    // Filter by programming language
    if (query.language) {
      const attemptIds = await Submission.find({ language: query.language }).distinct('attemptId');
      filter._id = { $in: attemptIds };
    }

    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '20', 10);
    const skip = (page - 1) * limit;

    const [attempts, total, availableBatches, availableGenders, availableExams] = await Promise.all([
      ExamAttempt.find(filter)
        .populate({
          path: 'userId',
          select: 'name email phone rollNumber batch gender createdBy',
          populate: { path: 'createdBy', select: 'name email role' }
        })
        .populate({
          path: 'examId',
          select: 'title duration totalMarks passingMarks createdBy',
          populate: { path: 'createdBy', select: 'name email role' }
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ExamAttempt.countDocuments(filter),
      User.distinct('batch', {
        role: 'USER',
        batch: { $ne: '' },
        ...(isFaculty ? { createdBy: currentUser._id } : {})
      }),
      User.distinct('gender', {
        role: 'USER',
        gender: { $ne: '' },
        ...(isFaculty ? { createdBy: currentUser._id } : {})
      }),
      Exam.find(isFaculty ? { createdBy: currentUser._id } : {}).select('_id title').sort({ title: 1 }),
    ]);

    // Attach languages used for each attempt
    const attemptIds = attempts.map((a) => a._id);
    const submissions = await Submission.find({ attemptId: { $in: attemptIds } }, 'attemptId language');
    const attemptLangMap = {};
    submissions.forEach((sub) => {
      const idStr = sub.attemptId.toString();
      if (!attemptLangMap[idStr]) {
        attemptLangMap[idStr] = new Set();
      }
      attemptLangMap[idStr].add(sub.language);
    });

    const enrichedResults = attempts.map((att) => ({
      ...att.toJSON(),
      languagesUsed: Array.from(attemptLangMap[att._id.toString()] || []),
    }));

    return {
      results: enrichedResults,
      availableBatches,
      availableGenders,
      availableExams,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
