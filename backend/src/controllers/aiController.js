import { OllamaService } from '../services/ollamaService.js';
import { QuestionService } from '../services/questionService.js';
import { AdminService } from '../services/adminService.js';
import { ResultService } from '../services/resultService.js';
import ExamAttempt from '../models/ExamAttempt.js';
import { Exam } from '../models/Exam.js';
import User from '../models/User.js';
import { Batch } from '../models/Batch.js';
import { normalizeAllowedLanguages } from '../utils/starterCode.js';
import { logger } from '../utils/logger.js';

export class AiController {
  /**
   * Check if local Ollama daemon is reachable and list its models.
   */
  static async checkOllamaStatus(req, res, next) {
    try {
      const url = req.query.url || 'http://127.0.0.1:11434';
      const status = await OllamaService.checkConnection(url);
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Fetch installed local models from Ollama.
   */
  static async getOllamaModels(req, res, next) {
    try {
      const url = req.query.url || 'http://127.0.0.1:11434';
      const status = await OllamaService.checkConnection(url);
      if (!status.online) {
        return res.status(200).json({
          success: false,
          message: status.error || 'Ollama is offline',
          data: {
            online: false,
            models: [],
            hint: status.hint,
          },
        });
      }
      res.status(200).json({
        success: true,
        data: {
          online: true,
          models: status.models || [],
          count: status.count || 0,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generate an end-to-end exam (structure + coding questions + MCQ questions).
   */
  static async generateExam(req, res, next) {
    try {
      const {
        baseUrl = 'http://127.0.0.1:11434',
        model,
        topic,
        difficulty = 'INTERMEDIATE',
        codingCount = 2,
        mcqCount = 5,
        codingMarks = 20,
        mcqMarks = 5,
        targetTechnologies = ['Java', 'Python', 'JavaScript'],
        customInstructions = '',
      } = req.body;

      if (!model) {
        return res.status(400).json({
          success: false,
          message: 'Model is required. Please select an installed Ollama model.',
        });
      }

      if (!topic || !String(topic).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Assessment topic or subject is required.',
        });
      }

      const generated = await OllamaService.generateExam({
        baseUrl,
        model,
        topic: String(topic).trim(),
        difficulty,
        codingCount,
        mcqCount,
        codingMarks,
        mcqMarks,
        targetTechnologies: Array.isArray(targetTechnologies) ? targetTechnologies : [targetTechnologies],
        customInstructions,
      });

      res.status(200).json({
        success: true,
        message: 'Exam generated successfully by local AI model',
        data: generated,
      });
    } catch (err) {
      logger.error(`AI generateExam error: ${err.message}`, err);
      const statusCode = err.statusCode || (err.message?.includes('Empty response') ? 422 : 500);
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to generate exam using local LLM',
        hint: err.hint || 'Ensure Ollama is running and has enough memory.',
        errorCode: 'AI_EXAM_GENERATION_FAILED',
      });
    }
  }

  /**
   * Generate a standalone coding problem with examples and test suites.
   */
  static async generateCodingQuestion(req, res, next) {
    try {
      const {
        baseUrl = 'http://127.0.0.1:11434',
        model,
        topic,
        difficulty = 'MEDIUM',
        marks = 20,
        allowedLanguages,
        customInstructions = '',
      } = req.body;

      if (!model) {
        return res.status(400).json({
          success: false,
          message: 'Model is required. Please select an installed Ollama model.',
        });
      }

      if (!topic || !String(topic).trim()) {
        return res.status(400).json({
          success: false,
          message: 'Coding problem topic or algorithm description is required.',
        });
      }

      const problem = await OllamaService.generateCodingQuestion({
        baseUrl,
        model,
        topic: String(topic).trim(),
        difficulty,
        marks,
        allowedLanguages,
        customInstructions,
      });

      res.status(200).json({
        success: true,
        message: 'Coding problem generated successfully by local AI',
        data: { question: problem },
      });
    } catch (err) {
      logger.error(`AI generateCodingQuestion error: ${err.message}`, err);
      const statusCode = err.statusCode || (err.message?.includes('Empty response') ? 422 : 500);
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to generate coding problem using local LLM',
        hint: err.hint || 'Ensure Ollama is running and has enough memory.',
        errorCode: 'AI_CODING_GENERATION_FAILED',
      });
    }
  }

  /**
   * Generate standalone MCQ questions.
   */
  static async generateMcqQuestions(req, res, next) {
    try {
      const {
        baseUrl = 'http://127.0.0.1:11434',
        model,
        topic,
        difficulty = 'MEDIUM',
        count = 3,
        marks = 5,
        customInstructions = '',
      } = req.body;

      if (!model) {
        return res.status(400).json({
          success: false,
          message: 'Model is required. Please select an installed Ollama model.',
        });
      }

      if (!topic || !String(topic).trim()) {
        return res.status(400).json({
          success: false,
          message: 'MCQ topic or subject area is required.',
        });
      }

      const questions = await OllamaService.generateMcqQuestions({
        baseUrl,
        model,
        topic: String(topic).trim(),
        difficulty,
        count,
        marks,
        customInstructions,
      });

      res.status(200).json({
        success: true,
        message: 'MCQ question(s) generated successfully by local AI',
        data: { questions },
      });
    } catch (err) {
      logger.error(`AI generateMcqQuestions error: ${err.message}`, err);
      const statusCode = err.statusCode || (err.message?.includes('Empty response') ? 422 : 500);
      return res.status(statusCode).json({
        success: false,
        message: err.message || 'Failed to generate MCQ questions using local LLM',
        hint: err.hint || 'Ensure Ollama is running and has enough memory.',
        errorCode: 'AI_MCQ_GENERATION_FAILED',
      });
    }
  }

  /**
   * Atomically save the AI-generated exam and create its questions in the database.
   */
  static async saveGeneratedExam(req, res, next) {
    try {
      const {
        examConfig,
        codingQuestions = [],
        mcqQuestions = [],
      } = req.body;

      if (!examConfig || !examConfig.title) {
        return res.status(400).json({
          success: false,
          message: 'Exam configuration with title is required.',
        });
      }

      if (codingQuestions.length === 0 && mcqQuestions.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot create an exam with zero questions.',
        });
      }

      const userId = req.user._id;
      const createdQuestionIds = [];

      // 1. Create coding questions in database
      for (const cq of codingQuestions) {
        const questionPayload = {
          title: cq.title,
          description: cq.description,
          type: 'CODING',
          difficulty: cq.difficulty || 'MEDIUM',
          marks: Number(cq.marks) || 20,
          inputFormat: cq.inputFormat || '',
          outputFormat: cq.outputFormat || '',
          constraints: cq.constraints || '',
          explanation: cq.explanation || '',
          examples: cq.examples || [],
          allowedLanguages: normalizeAllowedLanguages(
            cq.allowedLanguages,
            cq.title || examConfig.title || examConfig.topic || ''
          ),
          timeLimit: Number(cq.timeLimit) || 2,
          memoryLimit: Number(cq.memoryLimit) || 256,
          allowCodeRun: cq.allowCodeRun !== undefined ? Boolean(cq.allowCodeRun) : true,
          testCases: (cq.testCases || []).map((tc, idx) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput || '',
            isHidden: tc.isHidden !== undefined ? Boolean(tc.isHidden) : idx > 0,
            marks: Number(tc.marks) || 5,
          })),
        };

        const createdQ = await QuestionService.createQuestion(questionPayload, userId);
        createdQuestionIds.push({
          questionId: createdQ._id,
          marks: Number(createdQ.marks),
          allowCodeRun: Boolean(createdQ.allowCodeRun),
        });
      }

      // 2. Create MCQ questions in database
      for (const mq of mcqQuestions) {
        const mcqPayload = {
          title: mq.title,
          description: mq.description,
          type: 'MCQ',
          difficulty: mq.difficulty || 'MEDIUM',
          marks: Number(mq.marks) || 5,
          options: (mq.options || []).map((o) => ({ text: typeof o === 'string' ? o : o.text })),
          correctAnswer: Number(mq.correctAnswer) || 0,
          explanation: mq.explanation || '',
        };

        const createdMq = await QuestionService.createQuestion(mcqPayload, userId);
        createdQuestionIds.push({
          questionId: createdMq._id,
          marks: Number(createdMq.marks),
          allowCodeRun: false,
        });
      }

      // 3. Assemble and calculate exam total
      const totalMarks = createdQuestionIds.reduce((sum, q) => sum + q.marks, 0);

      const targetTechs = Array.isArray(examConfig.targetTechnologies) && examConfig.targetTechnologies.length > 0
        ? examConfig.targetTechnologies
        : (examConfig.technology ? [examConfig.technology] : []);

      const examPayload = {
        title: examConfig.title.trim(),
        description: (examConfig.description || '').trim(),
        instructions: (examConfig.instructions || 'Follow all standard exam guidelines.').trim(),
        duration: Number(examConfig.duration) || 60,
        startDate: examConfig.startDate ? new Date(examConfig.startDate) : new Date(),
        endDate: examConfig.endDate
          ? new Date(examConfig.endDate)
          : new Date(Date.now() + 30 * 24 * 3600 * 1000),
        totalMarks: totalMarks > 0 ? totalMarks : 100,
        passingMarks: Number(examConfig.passingMarks) || Math.round(totalMarks * 0.4) || 40,
        difficulty: examConfig.difficulty || 'INTERMEDIATE',
        isPublished: examConfig.isPublished !== undefined ? Boolean(examConfig.isPublished) : true,
        status: examConfig.isPublished ? 'ACTIVE' : 'DRAFT',
        organization: (examConfig.organization || '').trim(),
        technology: targetTechs[0] || examConfig.technology || '',
        targetTechnologies: targetTechs,
        targetBatches: Array.isArray(examConfig.targetBatches) ? examConfig.targetBatches : [],
        maxViolations: Number(examConfig.maxViolations) || 5,
        restrictToLaptop: Boolean(examConfig.restrictToLaptop),
        allowCodeRun: Boolean(examConfig.allowCodeRun),
        questions: createdQuestionIds.map((item, idx) => ({
          questionId: item.questionId,
          marks: item.marks,
          order: idx + 1,
          allowCodeRun: item.allowCodeRun,
        })),
      };

      const exam = await AdminService.createExam(examPayload, userId);

      res.status(201).json({
        success: true,
        message: 'Exam and all questions created successfully via local AI!',
        data: {
          exam,
          questionsCount: createdQuestionIds.length,
          codingCount: codingQuestions.length,
          mcqCount: mcqQuestions.length,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Analyze filtered results cohort using local Ollama.
   * Safely processes filtered attempts in-memory and returns structured intelligence.
   */
  static async analyzeResultsCohort(req, res, next) {
    try {
      const {
        baseUrl = 'http://127.0.0.1:11434',
        model,
        filters = {},
        options = {},
      } = req.body;

      if (!model) {
        return res.status(400).json({
          success: false,
          message: 'Model is required. Please select an installed Ollama model.',
        });
      }

      const {
        examId,
        technology,
        batch,
        gender,
        resultStatus,
        search,
      } = filters;

      // Build attempt query matching exactly the admin results filter & role scope
      const attemptFilter = {};
      const isFaculty = req.user?.role === 'FACULTY';
      let myExamIds = [];
      let allowedStudentIds = null;

      if (isFaculty) {
        myExamIds = await Exam.find({ createdBy: req.user._id }).distinct('_id');
        const myBatchDocs = await Batch.find({
          $or: [
            { createdBy: req.user._id },
            { assignedFaculties: req.user._id },
          ],
        });
        const myBatchIds = myBatchDocs.map((b) => b._id);
        const myBatchNames = myBatchDocs.map((b) => b.name);

        const studentQuery = {
          role: 'USER',
          $or: [
            { createdBy: req.user._id },
            { assignedFaculties: req.user._id },
            { batchId: { $in: myBatchIds } },
            { batch: { $in: myBatchNames } },
          ],
        };
        if (req.user.organization && req.user.organization.trim()) {
          const escapedOrg = req.user.organization.trim().replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
          studentQuery.organization = { $regex: new RegExp(`^${escapedOrg}$`, 'i') };
        }

        allowedStudentIds = await User.find(studentQuery).distinct('_id');

        if (examId) {
          const isMyExam = myExamIds.map(String).includes(String(examId));
          if (!isMyExam) {
            attemptFilter.userId = { $in: allowedStudentIds };
          }
        } else {
          attemptFilter.$or = [
            { examId: { $in: myExamIds } },
            { userId: { $in: allowedStudentIds } },
          ];
        }
      }

      if (examId) {
        attemptFilter.examId = examId;
      }

      if (resultStatus) {
        if (resultStatus === 'PASS') {
          attemptFilter.resultStatus = 'PASS';
          attemptFilter.status = { $ne: 'TERMINATED' };
        } else if (resultStatus === 'FAIL') {
          attemptFilter.resultStatus = 'FAIL';
          attemptFilter.status = { $ne: 'TERMINATED' };
        } else if (resultStatus === 'TERMINATED') {
          attemptFilter.$or = [{ status: 'TERMINATED' }, { resultStatus: 'TERMINATED' }];
        } else if (resultStatus === 'ONGOING') {
          attemptFilter.status = 'IN_PROGRESS';
        } else if (resultStatus === 'PENDING') {
          attemptFilter.status = { $in: ['EVALUATING', 'SUBMITTED'] };
        } else {
          attemptFilter.resultStatus = resultStatus;
        }
      }

      // Filter by student attributes (technology, batch, gender, search)
      const userFilter = {};
      if (isFaculty) {
        const adminIds = await User.find({ role: 'ADMIN' }).distinct('_id');
        userFilter.$or = [
          { createdBy: req.user._id },
          { assignedFaculties: req.user._id },
          { organization: req.user.organization || '__NONE__' },
          { createdBy: { $in: adminIds } },
          { createdBy: null },
          { createdBy: { $exists: false } },
        ];
      }
      if (technology) userFilter.technology = technology;
      if (batch) userFilter.batch = batch;
      if (gender) userFilter.gender = gender;
      if (search && search.trim()) {
        const s = search.trim();
        const sRegex = new RegExp(s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'), 'i');
        userFilter.$and = userFilter.$and || [];
        userFilter.$and.push({
          $or: [
            { name: sRegex },
            { email: sRegex },
            { rollNumber: sRegex },
            { studentId: sRegex },
          ],
        });
      }

      if (Object.keys(userFilter).length > 0) {
        const matchingUserIds = await User.find(userFilter).distinct('_id');
        if (attemptFilter.userId && attemptFilter.userId.$in) {
          const existingSet = new Set(attemptFilter.userId.$in.map(String));
          attemptFilter.userId = { $in: matchingUserIds.filter((id) => existingSet.has(String(id))) };
        } else {
          attemptFilter.userId = { $in: matchingUserIds };
        }
      }

      // Query all matching attempts (limit to 300 for aggregation performance)
      const attempts = await ExamAttempt.find(attemptFilter)
        .populate('examId', 'title totalMarks passingMarks duration questions')
        .populate('userId', 'name rollNumber studentId technology batch organization')
        .sort({ createdAt: -1 })
        .limit(300);

      if (attempts.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No candidate attempts found matching the selected filters.',
          data: {
            analysis: null,
            filteredStats: {
              totalCandidates: 0,
              filterSummary: 'No results found',
            },
            filtersApplied: filters,
          },
        });
      }

      // Compute cohort statistical aggregates
      const totalCandidates = attempts.length;
      let passCount = 0;
      let failCount = 0;
      let terminatedCount = 0;
      let ongoingCount = 0;
      let evaluatingCount = 0;

      let scoreSum = 0;
      let percentageSum = 0;
      let highestPercentage = 0;
      let lowestPercentage = 100;
      let totalViolations = 0;
      let attemptsWithViolations = 0;

      const scoreBands = {
        '>=90%': 0,
        '75-89%': 0,
        '50-74%': 0,
        '<50%': 0,
      };

      const examTitles = new Set();
      const batches = new Set();
      const technologies = new Set();

      attempts.forEach((att) => {
        const isTerminated = att.status === 'TERMINATED' || att.resultStatus === 'TERMINATED';
        const isOngoing = att.status === 'IN_PROGRESS';
        const isEvaluating = att.status === 'EVALUATING';
        const isPass = !isTerminated && att.resultStatus === 'PASS';

        if (isTerminated) terminatedCount++;
        else if (isOngoing) ongoingCount++;
        else if (isEvaluating) evaluatingCount++;
        else if (isPass) passCount++;
        else failCount++;

        const pct = typeof att.percentage === 'number' ? Math.round(att.percentage) : 0;
        percentageSum += pct;
        scoreSum += typeof att.totalScore === 'number' ? att.totalScore : 0;

        if (pct > highestPercentage) highestPercentage = pct;
        if (pct < lowestPercentage) lowestPercentage = pct;

        if (pct >= 90) scoreBands['>=90%']++;
        else if (pct >= 75) scoreBands['75-89%']++;
        else if (pct >= 50) scoreBands['50-74%']++;
        else scoreBands['<50%']++;

        const vCount = Number(att.violationCount) || 0;
        totalViolations += vCount;
        if (vCount > 0) attemptsWithViolations++;

        if (att.examId?.title) examTitles.add(att.examId.title);
        if (att.userId?.batch) batches.add(att.userId.batch);
        if (att.userId?.technology) technologies.add(att.userId.technology);
      });

      const averagePercentage = totalCandidates > 0 ? +(percentageSum / totalCandidates).toFixed(1) : 0;
      const averageScore = totalCandidates > 0 ? +(scoreSum / totalCandidates).toFixed(1) : 0;
      const completedCount = passCount + failCount + terminatedCount;
      const passRate = completedCount > 0 ? `${Math.round((passCount / completedCount) * 100)}%` : '0%';

      // Batch-wise and technology-wise breakdown for organization & faculty benchmarking
      const batchMap = new Map();
      const techMap = new Map();
      const sortedAttempts = [...attempts].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));

      attempts.forEach((att) => {
        const bName = att.userId?.batch || 'General Batch';
        const tName = att.userId?.technology || 'Core Tech';
        const isPass = att.resultStatus === 'PASS';
        const pct = typeof att.percentage === 'number' ? att.percentage : 0;

        if (!batchMap.has(bName)) batchMap.set(bName, { name: bName, total: 0, passed: 0, pctSum: 0 });
        const bObj = batchMap.get(bName);
        bObj.total++;
        if (isPass) bObj.passed++;
        bObj.pctSum += pct;

        if (!techMap.has(tName)) techMap.set(tName, { name: tName, total: 0, passed: 0, pctSum: 0 });
        const tObj = techMap.get(tName);
        tObj.total++;
        if (isPass) tObj.passed++;
        tObj.pctSum += pct;
      });

      const batchBreakdown = Array.from(batchMap.values()).map((b) => ({
        batch: b.name,
        candidates: b.total,
        passed: b.passed,
        passRate: b.total > 0 ? `${Math.round((b.passed / b.total) * 100)}%` : '0%',
        avgPercentage: b.total > 0 ? +(b.pctSum / b.total).toFixed(1) : 0,
      }));

      const technologyBreakdown = Array.from(techMap.values()).map((t) => ({
        technology: t.name,
        candidates: t.total,
        passed: t.passed,
        passRate: t.total > 0 ? `${Math.round((t.passed / t.total) * 100)}%` : '0%',
        avgPercentage: t.total > 0 ? +(t.pctSum / t.total).toFixed(1) : 0,
      }));

      const topPerformers = sortedAttempts.slice(0, 6).map((att) => ({
        name: att.userId?.name || 'Candidate',
        studentId: att.userId?.studentId || att.userId?.rollNumber || '',
        batch: att.userId?.batch || '',
        technology: att.userId?.technology || '',
        score: att.totalScore || 0,
        percentage: att.percentage || 0,
      }));

      const remediationRoster = sortedAttempts
        .filter((att) => att.resultStatus === 'FAIL' || (att.percentage || 0) < 50 || att.status === 'TERMINATED')
        .slice(0, 8)
        .map((att) => ({
          name: att.userId?.name || 'Candidate',
          studentId: att.userId?.studentId || att.userId?.rollNumber || '',
          batch: att.userId?.batch || '',
          technology: att.userId?.technology || '',
          score: att.totalScore || 0,
          percentage: att.percentage || 0,
          reason: att.status === 'TERMINATED' ? 'Terminated (Integrity)' : 'Scored below pass benchmark',
        }));

      // Build readable filter summary string
      const activeFilterParts = [];
      if (examId && attempts[0]?.examId?.title) activeFilterParts.push(`Exam: "${attempts[0].examId.title}"`);
      else if (examTitles.size > 0) activeFilterParts.push(`Exams: ${Array.from(examTitles).slice(0, 3).join(', ')}`);
      if (technology) activeFilterParts.push(`Tech: ${technology}`);
      if (batch) activeFilterParts.push(`Batch: ${batch}`);
      if (gender) activeFilterParts.push(`Gender: ${gender}`);
      if (resultStatus) activeFilterParts.push(`Status: ${resultStatus}`);
      if (search) activeFilterParts.push(`Search: "${search}"`);
      const filterSummary = activeFilterParts.length > 0 ? activeFilterParts.join(' | ') : 'All Results';

      const cohortStats = {
        totalCandidates,
        passCount,
        failCount,
        terminatedCount,
        ongoingCount,
        evaluatingCount,
        passRate,
        averagePercentage,
        highestPercentage: highestPercentage || 0,
        lowestPercentage: lowestPercentage === 100 && completedCount === 0 ? 0 : lowestPercentage,
        averageScore,
        maxPossibleScore: attempts[0]?.maxScore || attempts[0]?.examId?.totalMarks || 100,
        scoreBands,
        totalViolations,
        attemptsWithViolations,
        filterSummary,
        examTitle: Array.from(examTitles).join(', ') || 'Assessment Group',
        batchName: Array.from(batches).join(', ') || batch || '',
        technologyName: Array.from(technologies).join(', ') || technology || '',
        batchBreakdown,
        technologyBreakdown,
        topPerformers,
        remediationRoster,
        questionIssues: [],
      };

      // Call Ollama local service ephemerally
      const analysis = await OllamaService.analyzeResultsCohort({
        baseUrl,
        model,
        cohortStats,
        options,
      });

      res.status(200).json({
        success: true,
        message: 'AI Cohort Analysis completed successfully.',
        data: {
          analysis,
          filteredStats: cohortStats,
          filtersApplied: filters,
          modelUsed: model,
          generatedAt: new Date(),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Analyze individual candidate result using local Ollama.
   * Examines question breakdown, code quality, complexity, test case coverage, and proctoring.
   */
  static async analyzeCandidateResult(req, res, next) {
    try {
      const attemptId = req.params.id || req.body.attemptId;
      const {
        baseUrl = 'http://127.0.0.1:11434',
        model,
        options = {},
      } = req.body;

      if (!model) {
        return res.status(400).json({
          success: false,
          message: 'Model is required. Please select an installed Ollama model.',
        });
      }

      if (!attemptId) {
        return res.status(400).json({
          success: false,
          message: 'Attempt ID is required.',
        });
      }

      const isAdmin = req.user?.role === 'ADMIN';
      const resultData = await ResultService.getResultDetails(attemptId, req.user._id, isAdmin, req.user);
      if (!resultData?.attempt) {
        return res.status(404).json({
          success: false,
          message: 'Result attempt not found.',
        });
      }

      const { attempt, questionBreakdown } = resultData;
      const candidateName = attempt.user?.name || 'Candidate';
      const studentId = attempt.user?.studentId || attempt.user?.rollNumber || '';
      const examTitle = attempt.exam?.title || 'Assessment';
      const totalScore = attempt.totalScore || 0;
      const maxScore = attempt.maxScore || attempt.exam?.totalMarks || 100;
      const percentage = attempt.percentage || (maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0);
      const resultStatus = attempt.resultStatus || 'PENDING';
      const violationCount = attempt.violationCount || 0;

      let timeSpentMinutes = 0;
      if (attempt.startedAt && attempt.submittedAt) {
        timeSpentMinutes = Math.max(1, Math.round((new Date(attempt.submittedAt) - new Date(attempt.startedAt)) / 60000));
      }

      const questions = (questionBreakdown || []).map((qb) => ({
        title: qb.title,
        type: qb.type || 'CODING',
        maxMarks: qb.maxMarks,
        scored: qb.result?.score || 0,
        status: qb.result?.status || qb.submissionStatus || 'NOT_SUBMITTED',
        passedTests: qb.result?.passedTests,
        totalTests: qb.result?.totalTests,
        isCorrect: qb.result?.isCorrect,
        language: qb.language,
        submittedCode: qb.submittedCode || '',
        selectedOption: qb.selectedOption,
        selectedOptionText: qb.selectedOption !== null && qb.options?.[qb.selectedOption]?.text
          ? qb.options[qb.selectedOption].text
          : null,
      }));

      const candidateData = {
        candidateName,
        studentId,
        examTitle,
        totalScore,
        maxScore,
        percentage,
        resultStatus,
        violationCount,
        timeSpentMinutes,
        questions,
      };

      const analysis = await OllamaService.analyzeCandidateResult({
        baseUrl,
        model,
        candidateData,
        options,
      });

      res.status(200).json({
        success: true,
        message: 'AI Candidate Analysis completed successfully.',
        data: {
          analysis,
          candidateSummary: {
            candidateName,
            studentId,
            examTitle,
            totalScore,
            maxScore,
            percentage,
            resultStatus,
            violationCount,
            timeSpentMinutes,
          },
          modelUsed: model,
          generatedAt: new Date(),
        },
      });
    } catch (err) {
      next(err);
    }
  }
}
