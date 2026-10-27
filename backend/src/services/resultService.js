import mongoose from 'mongoose';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';
import { Exam } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { User } from '../models/User.js';
import { Batch } from '../models/Batch.js';

export class ResultService {
  static async getUserResults(userId) {
    const attempts = await ExamAttempt.find({
      userId,
      status: { $in: ['EVALUATING', 'EVALUATED', 'SUBMITTED', 'TERMINATED'] },
    })
      .populate('examId', 'title description duration totalMarks passingMarks difficulty isPractice')
      .sort({ createdAt: -1 });

    return attempts.map((att) => {
      const isTerminated = att.status === 'TERMINATED' || att.resultStatus === 'TERMINATED';
      const isEvaluating = att.status === 'EVALUATING';
      return {
        _id: att._id,
        exam: att.examId,
        startedAt: att.startedAt,
        submittedAt: att.submittedAt,
        status: isTerminated ? 'TERMINATED' : att.status,
        totalScore: isEvaluating ? null : att.totalScore,
        maxScore: att.maxScore,
        percentage: isEvaluating ? null : att.percentage,
        resultStatus: isTerminated ? 'TERMINATED' : (isEvaluating ? 'EVALUATING' : att.resultStatus),
        terminationReason: att.terminationReason || (isTerminated ? `Terminated due to exceeding proctoring violations limit (${att.violationCount || 0} violations).` : ''),
        violationCount: att.violationCount,
      };
    });
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
          select: 'title description duration totalMarks passingMarks difficulty instructions questions isPractice createdBy',
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

    // Role check: Faculty can only view results of students they created, are assigned to, who belong to their batches, or exams they created
    if (currentUser && currentUser.role === 'FACULTY') {
      const studentCreatedBy = attempt.userId?.createdBy?._id || attempt.userId?.createdBy;
      const examCreatedBy = attempt.examId?.createdBy?._id || attempt.examId?.createdBy;
      const isCreatorOfStudent = studentCreatedBy && String(studentCreatedBy) === String(currentUser._id);
      const isCreatorOfExam = examCreatedBy && String(examCreatedBy) === String(currentUser._id);
      const isAssignedFaculty = attempt.userId?.assignedFaculties?.some(
        (f) => String(f._id || f) === String(currentUser._id)
      );

      // Check if student belongs to a batch created by or assigned to this faculty
      const myBatchDocs = await Batch.find({
        $or: [{ createdBy: currentUser._id }, { assignedFaculties: currentUser._id }],
      });
      const myBatchIds = myBatchDocs.map((b) => String(b._id));
      const myBatchNames = myBatchDocs.map((b) => b.name.toLowerCase());
      const studentBatchId = attempt.userId?.batchId ? String(attempt.userId.batchId) : '';
      const studentBatchName = (attempt.userId?.batch || '').toLowerCase();
      const isInMyBatch = (studentBatchId && myBatchIds.includes(studentBatchId)) ||
                          (studentBatchName && myBatchNames.includes(studentBatchName));

      if (!isCreatorOfStudent && !isCreatorOfExam && !isAssignedFaculty && !isInMyBatch) {
        const error = new Error('Access denied. You can only view results for your own assigned batches, students, or exams.');
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

    const isTerminated = attempt.status === 'TERMINATED' || attempt.resultStatus === 'TERMINATED';
    const isOngoing = attempt.status === 'IN_PROGRESS';
    const isEvaluating = attempt.status === 'EVALUATING';

    // Self-healing for maxScore and resultStatus if attempt was saved out of sync (ONLY when fully EVALUATED)
    const questionMarksSum = (exam?.questions || []).reduce((acc, q) => acc + Number(q.marks || 0), 0);
    const expectedMax = questionMarksSum > 0 ? questionMarksSum : (exam?.totalMarks || 100);

    if (expectedMax > 0 && !isOngoing && !isEvaluating && !isTerminated) {
      if (attempt.maxScore !== expectedMax || (!attempt.totalScore && submissionResults.length > 0)) {
        let calcScore = 0;
        submissionResults.forEach((r) => { calcScore += r.score || 0; });
        calcScore = Math.round(calcScore * 100) / 100;
        attempt.totalScore = calcScore;
        attempt.maxScore = expectedMax;
        attempt.percentage = expectedMax > 0 ? +((calcScore / expectedMax) * 100).toFixed(2) : 0;
        attempt.resultStatus = calcScore >= (exam?.passingMarks || 0) ? 'PASS' : 'FAIL';
        await attempt.save().catch(() => {});
      }
    }

    let resolvedResultStatus = attempt.resultStatus;
    if (isTerminated) {
      resolvedResultStatus = 'TERMINATED';
    } else if (isOngoing) {
      resolvedResultStatus = 'ONGOING';
    } else if (isEvaluating) {
      resolvedResultStatus = 'EVALUATING';
    }

    const resolvedReason =
      attempt.terminationReason ||
      (isTerminated
        ? (attempt.violationCount > 0
            ? `Exceeded maximum permitted proctoring violations (${attempt.violationCount} violations recorded).`
            : 'Examination terminated due to security violation.')
        : '');

    return {
      attempt: {
        _id: attempt._id,
        user: attempt.userId,
        exam: attempt.examId,
        startedAt: attempt.startedAt,
        submittedAt: attempt.submittedAt,
        endTime: attempt.endTime,
        status: isTerminated ? 'TERMINATED' : attempt.status,
        totalScore: attempt.totalScore,
        maxScore: attempt.maxScore,
        percentage: attempt.percentage,
        resultStatus: resolvedResultStatus,
        terminationReason: resolvedReason,
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

      // Fetch ONLY batches created by or assigned to this faculty
      const myBatchDocs = await Batch.find({
        $or: [
          { createdBy: currentUser._id },
          { assignedFaculties: currentUser._id },
        ],
      });
      const myBatchIds = myBatchDocs.map((b) => b._id);
      const myBatchNames = myBatchDocs.map((b) => b.name);

      // Faculty can ONLY see students created by them, assigned to them, or in their batches
      const studentQuery = {
        role: 'USER',
        $or: [
          { createdBy: currentUser._id },
          { assignedFaculties: currentUser._id },
          { batchId: { $in: myBatchIds } },
          { batch: { $in: myBatchNames } },
        ],
      };
      if (currentUser.organization && currentUser.organization.trim()) {
        const escapedOrg = currentUser.organization.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        studentQuery.organization = { $regex: new RegExp(`^${escapedOrg}$`, 'i') };
      }

      allowedStudentIds = await User.find(studentQuery).distinct('_id');

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
      if (query.resultStatus === 'PASS') {
        filter.resultStatus = 'PASS';
        filter.status = { $ne: 'TERMINATED' };
      } else if (query.resultStatus === 'FAIL') {
        filter.resultStatus = 'FAIL';
        filter.status = { $ne: 'TERMINATED' };
      } else if (query.resultStatus === 'TERMINATED') {
        filter.$or = [
          { status: 'TERMINATED' },
          { resultStatus: 'TERMINATED' },
        ];
      } else if (query.resultStatus === 'ONGOING') {
        filter.status = 'IN_PROGRESS';
      } else if (query.resultStatus === 'PENDING') {
        filter.status = { $in: ['EVALUATING', 'SUBMITTED'] };
      } else {
        filter.resultStatus = query.resultStatus;
      }
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

    const enrichedResults = attempts.map((att) => {
      const isTerminated = att.status === 'TERMINATED' || att.resultStatus === 'TERMINATED';
      const isOngoing = att.status === 'IN_PROGRESS';
      const isEvaluating = att.status === 'EVALUATING';
      let calculatedResultStatus = att.resultStatus;
      if (isTerminated) {
        calculatedResultStatus = 'TERMINATED';
      } else if (isOngoing) {
        calculatedResultStatus = 'ONGOING';
      } else if (isEvaluating) {
        calculatedResultStatus = 'EVALUATING';
      }
      return {
        ...att.toJSON(),
        status: isTerminated ? 'TERMINATED' : att.status,
        resultStatus: calculatedResultStatus,
        terminationReason:
          att.terminationReason ||
          (isTerminated
            ? (att.violationCount > 0
                ? `Exceeded violation limit (${att.violationCount} violations)`
                : 'Terminated for security violation')
            : ''),
        languagesUsed: Array.from(attemptLangMap[att._id.toString()] || []),
      };
    });

    return {
      results: enrichedResults,
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
