import mongoose from 'mongoose';
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
      status: { $in: ['EVALUATING', 'EVALUATED', 'SUBMITTED', 'TERMINATED'] },
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
    if (!isAdmin && (!currentUser || currentUser.role === 'USER')) {
      filter.userId = userId;
    }

    let attempt = null;
    if (mongoose.Types.ObjectId.isValid(attemptId)) {
      attempt = await ExamAttempt.findOne(filter)
        .populate({
          path: 'userId',
          select: 'name email phone rollNumber batch gender createdBy assignedFaculties',
          populate: { path: 'createdBy', select: 'name email role' }
        })
        .populate({
          path: 'examId',
          select: 'title description duration totalMarks passingMarks difficulty instructions questions createdBy',
          populate: { path: 'createdBy', select: 'name email role' }
        });

      // Fallback: If not found directly by attempt _id, try finding by examId for this user
      if (!attempt) {
        const fallbackFilter = { examId: attemptId };
        if (!isAdmin && (!currentUser || currentUser.role === 'USER')) {
          fallbackFilter.userId = userId;
        }
        attempt = await ExamAttempt.findOne(fallbackFilter)
          .sort({ createdAt: -1 })
          .populate({
            path: 'userId',
            select: 'name email phone rollNumber batch gender createdBy assignedFaculties',
            populate: { path: 'createdBy', select: 'name email role' }
          })
          .populate({
            path: 'examId',
            select: 'title description duration totalMarks passingMarks difficulty instructions questions createdBy',
            populate: { path: 'createdBy', select: 'name email role' }
          });
      }
    }

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
      const isAssignedFaculty = attempt.userId?.assignedFaculties?.some(
        (f) => String(f._id || f) === String(currentUser._id)
      );

      if (!isCreatorOfStudent && !isCreatorOfExam && !isAssignedFaculty) {
        const error = new Error('Access denied. You can only view results for students or exams you created.');
        error.statusCode = 403;
        error.errorCode = 'FORBIDDEN';
        throw error;
      }
    }

    const actualAttemptId = attempt._id;
    const exam = attempt.examId;

    // Fetch submissions and results
    const submissions = await Submission.find({ attemptId: actualAttemptId });
    const submissionResults = await SubmissionResult.find({ attemptId: actualAttemptId });

    // Fetch questions to map titles and metadata
    const examQuestions = exam?.questions || [];
    const questionIds = Array.from(
      new Set([
        ...submissions.map((s) => s.questionId.toString()),
        ...examQuestions.map((eq) => (eq.questionId?._id || eq.questionId || '').toString()).filter(Boolean),
      ])
    );
    const questions = await Question.find({ _id: { $in: questionIds } });
    const questionMap = new Map();
    questions.forEach((q) => questionMap.set(q._id.toString(), q));

    const resultMap = new Map();
    submissionResults.forEach((r) => resultMap.set(r.questionId.toString(), r));

    const subMap = new Map();
    submissions.forEach((s) => subMap.set(s.questionId.toString(), s));

    let itemsToBreakdown = [];
    if (examQuestions.length > 0) {
      itemsToBreakdown = examQuestions.map((eq) => {
        const qIdStr = (eq.questionId?._id || eq.questionId).toString();
        return {
          questionId: qIdStr,
          examQ: eq,
          sub: subMap.get(qIdStr),
          q: questionMap.get(qIdStr),
          res: resultMap.get(qIdStr),
        };
      });
    } else {
      itemsToBreakdown = submissions.map((sub) => {
        const qIdStr = sub.questionId.toString();
        return {
          questionId: qIdStr,
          examQ: null,
          sub,
          q: questionMap.get(qIdStr),
          res: resultMap.get(qIdStr),
        };
      });
    }

    const questionBreakdown = itemsToBreakdown.map((item) => {
      const { questionId, examQ, sub, q, res } = item;
      const questionMaxMarks =
        examQ && examQ.marks !== undefined
          ? Number(examQ.marks)
          : (res?.maxScore || (q ? q.marks : 0));

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
        questionId,
        questionTitle: q ? q.title : 'Question',
        questionType: q?.type || res?.questionType || 'CODING',
        questionDifficulty: q ? q.difficulty : 'MEDIUM',
        options: q?.options || [],
        correctAnswer: (isAdmin || (currentUser && ['ADMIN', 'FACULTY'].includes(currentUser.role)) || attempt.status === 'EVALUATED') ? q?.correctAnswer : undefined,
        explanation: q?.explanation || '',
        maxMarks: questionMaxMarks,
        language: sub?.language || 'code',
        submittedCode: sub?.sourceCode || '',
        selectedOption: (sub?.selectedOption !== undefined && sub?.selectedOption !== null)
          ? Number(sub.selectedOption)
          : (res?.selectedOption !== undefined && res?.selectedOption !== null ? Number(res.selectedOption) : null),
        submissionStatus: sub ? sub.status : 'NOT_SUBMITTED',
        result: res
          ? {
              questionType: res.questionType || q?.type || 'CODING',
              selectedOption: res.selectedOption !== undefined && res.selectedOption !== null ? Number(res.selectedOption) : null,
              isCorrect: res.isCorrect,
              passedTests: res.passedTests,
              totalTests: res.totalTests,
              score: res.score,
              maxScore: questionMaxMarks,
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

    let allowedStudentIds = null;
    let myExamIds = [];

    if (isFaculty) {
      myExamIds = await Exam.find({ createdBy: currentUser._id }).distinct('_id');
      const adminIds = await User.find({ role: 'ADMIN' }).distinct('_id');
      allowedStudentIds = await User.find({
        role: 'USER',
        $or: [
          { createdBy: currentUser._id },
          { assignedFaculties: currentUser._id },
          { organization: currentUser.organization || '__NONE__' },
          { createdBy: { $in: adminIds } },
          { createdBy: null },
          { createdBy: { $exists: false } },
        ],
      }).distinct('_id');

      if (query.examId) {
        const isMyExam = myExamIds.map(String).includes(String(query.examId));
        if (!isMyExam) {
          filter.userId = { $in: allowedStudentIds };
        }
      } else if (!query.userId) {
        filter.$or = [
          { examId: { $in: myExamIds } },
          { userId: { $in: allowedStudentIds } },
        ];
      }
    }

    if (query.examId) {
      filter.examId = query.examId;
    }
    if (query.userId) {
      if (isFaculty) {
        const isAllowedStudent = allowedStudentIds?.map(String).includes(String(query.userId));
        if (!isAllowedStudent) {
          const tookMyExam = await ExamAttempt.exists({
            userId: query.userId,
            examId: { $in: myExamIds },
          });
          if (tookMyExam) {
            filter.userId = query.userId;
            filter.examId = { $in: myExamIds };
          } else {
            filter.userId = { $in: [] };
          }
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

    // Filter by student organization, technology, batch, or gender
    const userFilter = {};
    if (isFaculty) {
      const adminIds = await User.find({ role: 'ADMIN' }).distinct('_id');
      userFilter.$or = [
        { createdBy: currentUser._id },
        { assignedFaculties: currentUser._id },
        { organization: currentUser.organization || '__NONE__' },
        { createdBy: { $in: adminIds } },
        { createdBy: null },
        { createdBy: { $exists: false } },
      ];
    }
    if (query.organization) userFilter.organization = query.organization;
    if (query.technology) userFilter.technology = query.technology;
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

    const baseUserRoleFilter = {
      role: 'USER',
      ...(isFaculty
        ? {
            $or: [
              { createdBy: currentUser._id },
              { assignedFaculties: currentUser._id },
              { organization: currentUser.organization || '__NONE__' },
            ],
          }
        : {}),
    };

    const [attempts, total, availableOrganizations, availableTechnologies, availableBatches, availableGenders, availableExams] = await Promise.all([
      ExamAttempt.find(filter)
        .populate({
          path: 'userId',
          select: 'name email phone rollNumber studentId batch technology organization gender createdBy assignedFaculties',
          populate: { path: 'createdBy', select: 'name email role' },
        })
        .populate({
          path: 'examId',
          select: 'title duration totalMarks passingMarks createdBy',
          populate: { path: 'createdBy', select: 'name email role' },
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ExamAttempt.countDocuments(filter),
      User.distinct('organization', {
        ...baseUserRoleFilter,
        organization: { $ne: '' },
      }),
      User.distinct('technology', {
        ...baseUserRoleFilter,
        technology: { $ne: '' },
      }),
      User.distinct('batch', {
        ...baseUserRoleFilter,
        batch: { $ne: '' },
      }),
      User.distinct('gender', {
        ...baseUserRoleFilter,
        gender: { $ne: '' },
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

    // Aggregate exam-level statistics for exam-centric view
    const examFilterForSummary = isFaculty ? { createdBy: currentUser._id } : {};
    const examsList = await Exam.find(examFilterForSummary)
      .populate('createdBy', 'name email role')
      .sort({ createdAt: -1 });

    const examIds = examsList.map((e) => e._id);
    const baseAttemptFilter = { examId: { $in: examIds } };
    if (filter.userId) {
      baseAttemptFilter.userId = filter.userId;
    }

    const examStatsAgg = await ExamAttempt.aggregate([
      { $match: baseAttemptFilter },
      {
        $group: {
          _id: '$examId',
          totalAttempts: { $sum: 1 },
          passedCount: { $sum: { $cond: [{ $eq: ['$resultStatus', 'PASS'] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ['$resultStatus', 'FAIL'] }, 1, 0] } },
          evaluatedCount: { $sum: { $cond: [{ $eq: ['$status', 'EVALUATED'] }, 1, 0] } },
          avgScore: { $avg: '$totalScore' },
          avgPercentage: { $avg: '$percentage' },
          highestScore: { $max: '$totalScore' },
        },
      },
    ]);

    const statsMap = new Map();
    examStatsAgg.forEach((s) => {
      if (s._id) statsMap.set(String(s._id), s);
    });

    const examsSummary = examsList.map((ex) => {
      const st = statsMap.get(String(ex._id)) || {
        totalAttempts: 0,
        passedCount: 0,
        failedCount: 0,
        evaluatedCount: 0,
        avgScore: 0,
        avgPercentage: 0,
        highestScore: 0,
      };
      return {
        _id: ex._id,
        title: ex.title,
        totalMarks: ex.totalMarks,
        passingMarks: ex.passingMarks,
        duration: ex.duration,
        difficulty: ex.difficulty,
        isPublished: ex.isPublished,
        createdAt: ex.createdAt,
        createdBy: ex.createdBy,
        totalAttempts: st.totalAttempts || 0,
        passedCount: st.passedCount || 0,
        failedCount: st.failedCount || 0,
        evaluatedCount: st.evaluatedCount || 0,
        avgScore: st.avgScore ? +st.avgScore.toFixed(1) : 0,
        avgPercentage: st.avgPercentage ? +st.avgPercentage.toFixed(1) : 0,
        highestScore: st.highestScore || 0,
      };
    });

    return {
      results: enrichedResults,
      examsSummary,
      availableOrganizations,
      availableTechnologies,
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
