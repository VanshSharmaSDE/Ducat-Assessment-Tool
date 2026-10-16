import mongoose from 'mongoose';
import { Exam } from '../models/Exam.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Question } from '../models/Question.js';
import { TestCase } from '../models/TestCase.js';
import { Submission } from '../models/Submission.js';
import { ExecutionJob } from '../models/ExecutionJob.js';
import { addSubmissionJob, runCustomCodeInPool } from '../queues/queueManager.js';
import { User } from '../models/User.js';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { emitToAdmin, emitToAttempt } from '../socket.js';

const userLastRunTime = new Map();
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [userId, timestamp] of userLastRunTime.entries()) {
      if (now - timestamp > 60000) {
        userLastRunTime.delete(userId);
      }
    }
  }, 60000).unref?.();
}


export class ExamService {
  static async canStudentAccessExam(exam, studentUser) {
    if (!studentUser) return false;
    // Admins and faculty have privileged access
    if (['ADMIN', 'FACULTY'].includes(studentUser.role)) return true;

    // Determine who created this exam
    const examCreatorId = String(exam.createdBy?._id || exam.createdBy);
    let examCreator = exam.populated?.('createdBy') ? exam.createdBy : null;
    if (!examCreator || !examCreator.role) {
      examCreator = await User.findById(examCreatorId).select('role');
    }
    const isExamByAdmin = examCreator?.role === 'ADMIN';

    // Determine who created this student
    const studentCreatorId = String(studentUser.createdBy?._id || studentUser.createdBy || '');

    // Check if the student is assigned to / imported by the faculty who created this exam
    const isAssignedToExamCreator = (studentUser.assignedFaculties || []).some(
      (fId) => String(fId?._id || fId) === examCreatorId
    );
    const isCreatedByExamCreator = studentCreatorId === examCreatorId;

    // Creator isolation check:
    // If exam was created by Admin: accessible by all students across the institution
    // If exam was created by Faculty: accessible ONLY if student was created or imported by that faculty
    if (!isExamByAdmin && !isCreatedByExamCreator && !isAssignedToExamCreator) {
      return false;
    }

    // Technology Matching Check:
    // An exam may be conducted for specific technologies (e.g. React, Java).
    // Students can only access exams configured for their assigned technology.
    const examTechs = [
      ...(Array.isArray(exam.targetTechnologies) ? exam.targetTechnologies : []),
      exam.technology,
    ]
      .filter(Boolean)
      .map((t) => String(t).trim().toLowerCase());

    if (examTechs.length > 0) {
      const studentTech = String(studentUser.technology || '').trim().toLowerCase();
      if (!studentTech || !examTechs.includes(studentTech)) {
        return false;
      }
    }

    // Batch Matching Check:
    // If targetBatches is specified, student must belong to one of the target batches
    const examBatches = (Array.isArray(exam.targetBatches) ? exam.targetBatches : [])
      .filter(Boolean)
      .map((b) => String(b).trim().toLowerCase());

    if (examBatches.length > 0) {
      const studentBatch = String(studentUser.batch || '').trim().toLowerCase();
      if (!studentBatch || !examBatches.includes(studentBatch)) {
        return false;
      }
    }

    return true;
  }

  static async getAvailableExams(userId, query = {}) {
    const filter = { isPublished: true };

    const student = await User.findById(userId).populate('createdBy', 'role name email');
    if (student && student.role === 'USER') {
      const assignedIds = (student.assignedFaculties || []).map((f) => String(f._id || f));

      // Admin exams are institution-wide and accessible to all eligible students
      const adminIds = await User.find({ role: 'ADMIN' }).distinct('_id');
      const allowedCreatorIds = [...adminIds.map(String)];

      if (student.createdBy && student.createdBy.role === 'FACULTY') {
        allowedCreatorIds.push(String(student.createdBy._id || student.createdBy));
      }

      // Imported / Assigned faculties: student can see exams created by faculties who imported them
      if (assignedIds.length > 0) {
        allowedCreatorIds.push(...assignedIds);
      }

      const uniqueCreatorIds = Array.from(new Set(allowedCreatorIds.filter(Boolean)));
      filter.createdBy = { $in: uniqueCreatorIds };

      // Filter by student's technology
      const studentTech = String(student.technology || '').trim();
      const techConditions = [
        { targetTechnologies: { $size: 0 }, technology: '' },
        { targetTechnologies: { $exists: false }, technology: { $exists: false } },
        { targetTechnologies: null, technology: null },
      ];
      if (studentTech) {
        const escapedTech = studentTech.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const techRegex = new RegExp(`^${escapedTech}$`, 'i');
        techConditions.push({ targetTechnologies: techRegex });
        techConditions.push({ technology: techRegex });
      }

      // Filter by student's batch
      const studentBatch = String(student.batch || '').trim();
      const batchConditions = [
        { targetBatches: { $size: 0 } },
        { targetBatches: { $exists: false } },
        { targetBatches: null },
      ];
      if (studentBatch) {
        const escapedBatch = studentBatch.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
        const batchRegex = new RegExp(`^${escapedBatch}$`, 'i');
        batchConditions.push({ targetBatches: batchRegex });
      }

      filter.$and = [
        { $or: techConditions },
        { $or: batchConditions },
      ];
    } else if (student && student.role === 'FACULTY') {
      // Faculty previewing exams
      filter.createdBy = student._id;
    }

    const exams = await Exam.find(filter).sort({ startDate: 1 });
    const now = new Date();

    // Fetch user attempts to map attempt status (sorted latest first)
    const attempts = await ExamAttempt.find({ userId }).sort({ createdAt: -1 });
    const attemptMap = new Map();
    attempts.forEach((att) => {
      const examKey = att.examId.toString();
      if (!attemptMap.has(examKey)) {
        attemptMap.set(examKey, att);
      }
    });

    const result = exams.map((exam) => {
      const examObj = exam.toObject();
      const attempt = attemptMap.get(exam._id.toString());

      let userStatus = 'NOT_ATTEMPTED';
      if (attempt) {
        if (['EVALUATED', 'SUBMITTED', 'EVALUATING', 'TERMINATED'].includes(attempt.status)) {
          userStatus = 'COMPLETED';
        } else if (attempt.status === 'IN_PROGRESS') {
          if (now > attempt.endTime) {
            userStatus = 'EXPIRED';
          } else {
            userStatus = 'IN_PROGRESS';
          }
        } else if (attempt.status === 'EXPIRED') {
          userStatus = 'EXPIRED';
        }
      }

      let examStatus = 'ACTIVE';
      if (now < exam.startDate) {
        examStatus = 'UPCOMING';
      } else if (now > exam.endDate) {
        examStatus = 'EXPIRED';
      }

      return {
        ...examObj,
        questionCount: exam.questions.length,
        examStatus,
        userStatus,
        attemptId: attempt ? attempt._id : null,
      };
    });

    return result;
  }

  static async getExamDetails(examId, userId, isAdmin = false, currentUser = null) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    const isPrivileged = isAdmin || (currentUser && ['ADMIN', 'FACULTY'].includes(currentUser.role));
    if (!isPrivileged && !exam.isPublished) {
      const error = new Error('Exam is not currently published');
      error.statusCode = 403;
      error.errorCode = 'EXAM_NOT_PUBLISHED';
      throw error;
    }

    if (!isPrivileged) {
      const studentUser = currentUser || await User.findById(userId).populate('createdBy', 'role');
      const canAccess = await ExamService.canStudentAccessExam(exam, studentUser);
      if (!canAccess) {
        const error = new Error('Access denied. This examination is only available to students assigned to this instructor or administrator.');
        error.statusCode = 403;
        error.errorCode = 'EXAM_ACCESS_DENIED';
        throw error;
      }
    }

    const now = new Date();
    let computedStatus = 'ACTIVE';
    if (now < exam.startDate) computedStatus = 'UPCOMING';
    if (now > exam.endDate) computedStatus = 'EXPIRED';

    // Fetch questions with only public fields (never hidden test cases or correctAnswer!)
    const questionIds = exam.questions.map((q) => q.questionId);
    const [questions, unhiddenTestCases] = await Promise.all([
      Question.find({ _id: { $in: questionIds } }).select(
        '_id title description type options inputFormat outputFormat constraints examples explanation difficulty marks allowCodeRun allowedLanguages starterCode timeLimit memoryLimit comparisonMode'
      ),
      TestCase.find({
        questionId: { $in: questionIds },
        isHidden: false,
      }).sort({ order: 1 }),
    ]);

    // Map questions in configured order
    const orderedQuestions = exam.questions
      .map((eq) => {
        const qData = questions.find((q) => q._id.toString() === eq.questionId.toString());
        if (!qData) return null;
        const qObj = qData.toObject();
        qObj.marks = eq.marks || qObj.marks;
        qObj.questionId = eq.questionId;

        // Effective allowCodeRun: Check question-level override on exam item first, then question doc, then exam global
        const examItemOverride = eq.allowCodeRun !== undefined && eq.allowCodeRun !== null ? Boolean(eq.allowCodeRun) : null;
        const questionDocOverride = qObj.allowCodeRun !== undefined && qObj.allowCodeRun !== null ? Boolean(qObj.allowCodeRun) : null;
        const effectiveAllowCodeRun = examItemOverride !== null 
          ? examItemOverride 
          : (questionDocOverride !== null ? questionDocOverride : Boolean(exam.allowCodeRun));

        qObj.allowCodeRun = qObj.type === 'MCQ' ? false : effectiveAllowCodeRun;
        qObj.examItemAllowCodeRun = examItemOverride;

        // Attach unhidden testcases so student can test with public cases in LeetCode style
        qObj.sampleTestCases = unhiddenTestCases
          .filter((tc) => tc.questionId.toString() === qObj._id.toString())
          .map((tc) => ({
            _id: tc._id,
            input: tc.input,
            expectedOutput: tc.expectedOutput,
          }));

        return qObj;
      })
      .filter(Boolean);

    // Check user attempt
    let activeAttempt = null;
    if (userId) {
      const attempt = await ExamAttempt.findOne({ userId, examId });
      if (attempt) {
        activeAttempt = {
          _id: attempt._id,
          status: attempt.status,
          startedAt: attempt.startedAt,
          endTime: attempt.endTime,
          remainingSeconds: Math.max(0, Math.floor((new Date(attempt.endTime) - now) / 1000)),
          violationCount: attempt.violationCount,
        };
      }
    }

    return {
      exam: {
        ...exam.toObject(),
        allowCodeRun: Boolean(exam.allowCodeRun),
        questions: orderedQuestions,
        computedStatus,
      },
      activeAttempt,
    };
  }

  static async startExam(examId, userId, clientIp, userAgent) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    if (!exam.isPublished) {
      const error = new Error('Exam is not currently available');
      error.statusCode = 403;
      error.errorCode = 'EXAM_NOT_PUBLISHED';
      throw error;
    }

    const studentUser = await User.findById(userId).populate('createdBy', 'role');
    const canAccess = await ExamService.canStudentAccessExam(exam, studentUser);
    if (!canAccess) {
      const error = new Error('Access denied. This examination is only available to students assigned to this instructor or administrator.');
      error.statusCode = 403;
      error.errorCode = 'EXAM_ACCESS_DENIED';
      throw error;
    }

    const now = new Date();
    if (now < exam.startDate) {
      const error = new Error('This examination has not started yet');
      error.statusCode = 400;
      error.errorCode = 'EXAM_NOT_STARTED';
      throw error;
    }

    if (now > exam.endDate) {
      const error = new Error('This examination has expired');
      error.statusCode = 400;
      error.errorCode = 'EXAM_EXPIRED';
      throw error;
    }

    // Check existing attempt
    let attempt = await ExamAttempt.findOne({ userId, examId });

    if (attempt) {
      // If already submitted or evaluated, user cannot retake
      if (['SUBMITTED', 'EVALUATING', 'EVALUATED'].includes(attempt.status)) {
        const error = new Error('You have already submitted this examination');
        error.statusCode = 400;
        error.errorCode = 'ALREADY_SUBMITTED';
        throw error;
      }

      // If in progress, check server timer
      if (attempt.status === 'IN_PROGRESS') {
        if (now > attempt.endTime) {
          attempt.status = 'EXPIRED';
          await attempt.save();
          const error = new Error('Your examination time has expired');
          error.statusCode = 400;
          error.errorCode = 'TIME_EXPIRED';
          throw error;
        }

        // Return current active attempt
        return {
          attempt,
          remainingSeconds: Math.max(0, Math.floor((new Date(attempt.endTime) - now) / 1000)),
        };
      }

      if (attempt.status === 'EXPIRED') {
        const error = new Error('Your examination time has expired');
        error.statusCode = 400;
        error.errorCode = 'TIME_EXPIRED';
        throw error;
      }
    }

    // Create fresh attempt
    const endTime = new Date(Date.now() + exam.duration * 60 * 1000);
    attempt = await ExamAttempt.create({
      userId,
      examId,
      startedAt: now,
      endTime,
      status: 'IN_PROGRESS',
      clientIp: clientIp || '',
      userAgent: userAgent || '',
    });

    logger.info(`User ${userId} started exam ${examId}. Deadline: ${endTime.toISOString()}`);

    return {
      attempt,
      remainingSeconds: exam.duration * 60,
    };
  }

  static async recordExamEvent(attemptIdOrExamId, userId, { type, details }) {
    let attempt = null;
    if (mongoose.Types.ObjectId.isValid(attemptIdOrExamId)) {
      attempt = await ExamAttempt.findOne({ _id: attemptIdOrExamId, userId });
      if (!attempt) {
        attempt = await ExamAttempt.findOne({ examId: attemptIdOrExamId, userId, status: 'IN_PROGRESS' }).sort({ createdAt: -1 });
      }
    }

    if (!attempt) {
      const error = new Error('Attempt not found');
      error.statusCode = 404;
      error.errorCode = 'ATTEMPT_NOT_FOUND';
      throw error;
    }

    if (attempt.status !== 'IN_PROGRESS') {
      return { success: false, message: 'Attempt is not active' };
    }

    attempt.events = attempt.events || [];
    attempt.events.push({
      type,
      details: details || '',
      timestamp: new Date(),
    });

    attempt.violationCount = (attempt.violationCount || 0) + 1;

    const exam = await Exam.findById(attempt.examId);
    const maxViolations = exam?.maxViolations || 5;

    let terminated = false;
    if (attempt.violationCount >= maxViolations) {
      attempt.status = 'TERMINATED';
      terminated = true;
      logger.warn(`Attempt ${attempt._id} terminated due to excessive violations (${attempt.violationCount}/${maxViolations})`);
    }

    await attempt.save();

    // Broadcast live event to admin dashboard
    emitToAdmin('proctoring:violation', {
      attemptId: attempt._id,
      userId,
      examId: attempt.examId,
      violationCount: attempt.violationCount,
      maxViolations,
      type,
      details,
      terminated,
    });

    // Broadcast update to candidate's socket
    emitToAttempt(attempt._id, 'proctoring:warning', {
      violationCount: attempt.violationCount,
      maxViolations,
      terminated,
      type,
    });

    return {
      violationCount: attempt.violationCount,
      maxViolations,
      terminated,
    };
  }

  static async submitExam(attemptId, userId, answers = []) {
    const attempt = await ExamAttempt.findOne({ _id: attemptId, userId });
    if (!attempt) {
      const error = new Error('Exam attempt not found');
      error.statusCode = 404;
      error.errorCode = 'ATTEMPT_NOT_FOUND';
      throw error;
    }

    if (['SUBMITTED', 'EVALUATING', 'EVALUATED'].includes(attempt.status)) {
      const error = new Error('This exam has already been submitted');
      error.statusCode = 400;
      error.errorCode = 'ALREADY_SUBMITTED';
      throw error;
    }

    const exam = await Exam.findById(attempt.examId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    // Grace period of 45 seconds for network latency
    const graceMs = 45000;
    const now = new Date();
    if (now.getTime() > new Date(attempt.endTime).getTime() + graceMs) {
      attempt.status = 'EXPIRED';
      await attempt.save();
      const error = new Error('Exam deadline has passed. Late submissions are not accepted.');
      error.statusCode = 400;
      error.errorCode = 'SUBMISSION_DEADLINE_PASSED';
      throw error;
    }

    // Lock attempt immediately
    attempt.status = 'EVALUATING';
    attempt.submittedAt = now;
    await attempt.save();

    const examQuestionIds = new Set(
      exam.questions.map((q) => (q.questionId?._id || q.questionId || '').toString()).filter(Boolean)
    );
    const createdSubmissions = [];

    // Map answers by questionId for fast and reliable lookup
    const answersMap = new Map();
    for (const ans of answers) {
      if (ans?.questionId) {
        answersMap.set(ans.questionId.toString(), ans);
      }
    }

    // Process every question in the exam
    for (const eq of exam.questions) {
      const qIdStr = (eq.questionId?._id || eq.questionId || '').toString();
      if (!qIdStr) continue;

      const question = await Question.findById(qIdStr);
      if (!question) continue;

      const ans = answersMap.get(qIdStr) || {};
      const qType = question.type || 'CODING';

      // 1. Handle MCQ Questions: Immediate Synchronous Auto-Evaluation
      if (qType === 'MCQ') {
        const rawOpt = ans.selectedOption;
        const selectedOption = rawOpt !== undefined && rawOpt !== null && rawOpt !== '' && !isNaN(Number(rawOpt))
          ? Number(rawOpt)
          : null;

        const isCorrect = selectedOption !== null &&
          question.correctAnswer !== null &&
          question.correctAnswer !== undefined &&
          Number(selectedOption) === Number(question.correctAnswer);
        
        // Find assigned marks in this exam
        const assignedMarks = Number(eq?.marks || question.marks || 1);
        const earnedScore = isCorrect ? assignedMarks : 0;
        const mcqStatus = isCorrect ? 'PASSED' : 'WRONG_ANSWER';

        // Upsert Submission
        let submission = await Submission.findOne({ attemptId: attempt._id, questionId: question._id });
        if (!submission) {
          submission = await Submission.create({
            attemptId: attempt._id,
            userId,
            examId: exam._id,
            questionId: question._id,
            questionType: 'MCQ',
            language: 'MCQ',
            selectedOption,
            status: 'COMPLETED',
            submittedAt: now,
          });
        } else {
          submission.questionType = 'MCQ';
          submission.language = 'MCQ';
          submission.selectedOption = selectedOption;
          submission.status = 'COMPLETED';
          submission.submittedAt = now;
          await submission.save();
        }

        // Upsert SubmissionResult
        const { SubmissionResult } = await import('../models/SubmissionResult.js');
        await SubmissionResult.findOneAndUpdate(
          { submissionId: submission._id },
          {
            submissionId: submission._id,
            attemptId: attempt._id,
            questionId: question._id,
            questionType: 'MCQ',
            selectedOption,
            isCorrect,
            passedTests: isCorrect ? 1 : 0,
            totalTests: 1,
            score: earnedScore,
            maxScore: assignedMarks,
            status: mcqStatus,
          },
          { upsert: true, new: true }
        );

        createdSubmissions.push(submission);
        continue;
      }

      // 2. Handle Coding Questions: Queue for Docker execution
      const sourceCode = ans.code || '';
      const chosenLang = ans.language || question.allowedLanguages?.[0] || 'java';

      if (!question.allowedLanguages.includes(chosenLang)) {
        logger.warn(`Language ${chosenLang} not allowed for question ${question._id}`);
      }

      // Upsert submission
      let submission = await Submission.findOne({ attemptId: attempt._id, questionId: question._id });
      if (!submission) {
        submission = await Submission.create({
          attemptId: attempt._id,
          userId,
          examId: exam._id,
          questionId: question._id,
          questionType: 'CODING',
          language: chosenLang,
          sourceCode,
          status: 'QUEUED',
          submittedAt: now,
        });
      } else {
        submission.questionType = 'CODING';
        submission.language = chosenLang;
        submission.sourceCode = sourceCode;
        submission.status = 'QUEUED';
        submission.submittedAt = now;
        await submission.save();
      }

      // Create execution job record
      const jobId = uuidv4();
      await ExecutionJob.create({
        jobId,
        submissionId: submission._id,
        attemptId: attempt._id,
        status: 'QUEUED',
      });

      // Dispatch to BullMQ / queue manager
      await addSubmissionJob({
        jobId,
        submissionId: submission._id.toString(),
        attemptId: attempt._id.toString(),
        questionId: question._id.toString(),
        language: chosenLang,
        sourceCode,
      });

      createdSubmissions.push(submission);
    }

    // Check if all submissions (e.g. all MCQ or empty) are already completed!
    const { checkAndFinalizeExamAttempt } = await import('../workers/evaluationWorker.js');
    await checkAndFinalizeExamAttempt(attempt._id);

    const updatedAttempt = await ExamAttempt.findById(attempt._id);

    return {
      attemptId: attempt._id,
      status: updatedAttempt?.status || 'EVALUATING',
      totalScore: updatedAttempt?.totalScore,
      percentage: updatedAttempt?.percentage,
      resultStatus: updatedAttempt?.resultStatus,
      submissionCount: createdSubmissions.length,
      message: updatedAttempt?.status === 'EVALUATED'
        ? 'Exam submitted and evaluated successfully.'
        : 'Exam submitted successfully. Evaluation in progress.',
    };
  }

  static async runCustomCode({ examId, userId, currentUser, questionId, language, sourceCode, customInput }) {
    const exam = await Exam.findById(examId);
    if (!exam) {
      const error = new Error('Exam not found');
      error.statusCode = 404;
      error.errorCode = 'EXAM_NOT_FOUND';
      throw error;
    }

    const isPrivileged = currentUser && ['ADMIN', 'FACULTY'].includes(currentUser.role);

    // Fetch question to check question-level allowCodeRun override and limits
    let question = null;
    if (questionId) {
      question = await Question.findById(questionId);
    }

    // Determine effective allowCodeRun for this question
    let effectiveAllowCodeRun = Boolean(exam.allowCodeRun);
    if (questionId) {
      const examQuestion = (exam.questions || []).find(
        (eq) => (eq.questionId?._id || eq.questionId || '').toString() === questionId.toString()
      );
      if (examQuestion && examQuestion.allowCodeRun !== undefined && examQuestion.allowCodeRun !== null) {
        effectiveAllowCodeRun = Boolean(examQuestion.allowCodeRun);
      } else if (question && question.allowCodeRun !== undefined && question.allowCodeRun !== null) {
        effectiveAllowCodeRun = Boolean(question.allowCodeRun);
      }
    }
    if (question && question.type === 'MCQ') {
      effectiveAllowCodeRun = false;
    }

    // If candidate, check if code run is permitted for this question
    if (!effectiveAllowCodeRun && !isPrivileged) {
      const error = new Error('Code testing is disabled for this question.');
      error.statusCode = 403;
      error.errorCode = 'CODE_RUN_DISABLED';
      throw error;
    }

    // Rate-limiting check per user (1 second debounce)
    if (userId) {
      const uId = String(userId);
      const now = Date.now();
      const lastRun = userLastRunTime.get(uId) || 0;
      if (now - lastRun < 1000) {
        const error = new Error('Please wait a moment before running code again.');
        error.statusCode = 429;
        error.errorCode = 'TOO_MANY_REQUESTS';
        throw error;
      }
      userLastRunTime.set(uId, now);
    }

    // If candidate, verify active attempt
    if (!isPrivileged) {
      const attempt = await ExamAttempt.findOne({ examId, userId, status: 'IN_PROGRESS' });
      if (!attempt) {
        const error = new Error('Active exam attempt not found or already completed.');
        error.statusCode = 403;
        error.errorCode = 'NO_ACTIVE_ATTEMPT';
        throw error;
      }
      const now = new Date();
      if (now > attempt.endTime) {
        const error = new Error('Your examination time has expired.');
        error.statusCode = 400;
        error.errorCode = 'EXAM_TIME_EXPIRED';
        throw error;
      }
    }

    // Determine limits
    let timeLimit = 2;
    let memoryLimit = 256;
    if (questionId) {
      const question = await Question.findById(questionId);
      if (question) {
        timeLimit = question.timeLimit || 2;
        memoryLimit = question.memoryLimit || 256;
      }
    }

    // Run in the warm container pool with concurrency limits
    const result = await runCustomCodeInPool({
      language: (language || 'javascript').toLowerCase(),
      sourceCode: sourceCode || '',
      customInput: customInput || '',
      questionTimeLimit: timeLimit,
      questionMemoryLimit: memoryLimit,
    });

    return result;
  }
}

