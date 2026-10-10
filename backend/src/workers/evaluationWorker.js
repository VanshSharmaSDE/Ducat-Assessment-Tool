import { registerWorkerHandler } from '../queues/queueManager.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';
import { ExecutionJob } from '../models/ExecutionJob.js';
import { Question } from '../models/Question.js';
import { TestCase } from '../models/TestCase.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Exam } from '../models/Exam.js';
import { dockerExecutionService } from '../execution/DockerExecutionService.js';
import { emitToAttempt, emitToUser, emitToAdmin } from '../socket.js';
import { logger } from '../utils/logger.js';

export async function processSubmissionJob(job) {
  const { submissionId, attemptId, questionId, language, sourceCode, jobId } = job.data;
  logger.info(`Processing submission job ${job.id || jobId} for submission ${submissionId}`);

  try {
    // 1. Mark status as RUNNING
    await Submission.findByIdAndUpdate(submissionId, { status: 'RUNNING' });
    await ExecutionJob.findOneAndUpdate({ jobId }, { status: 'RUNNING', startedAt: new Date() });

    emitToAttempt(attemptId, 'submission:status', {
      submissionId,
      status: 'RUNNING',
      questionId,
    });

    // 2. Fetch Question and Test Cases
    const question = await Question.findById(questionId);
    if (!question) {
      throw new Error(`Question ${questionId} not found`);
    }

    const testCases = await TestCase.find({ questionId }).sort({ order: 1, createdAt: 1 });
    if (!testCases || testCases.length === 0) {
      logger.warn(`No test cases configured for question ${questionId}`);
    }

    // 3. Run inside the warm container of this language assigned by the pool
    const evalResult = await dockerExecutionService.evaluateSubmission({
      language,
      sourceCode,
      testCases,
      questionTimeLimit: question.timeLimit,
      questionMemoryLimit: question.memoryLimit,
      comparisonMode: question.comparisonMode,
      container: job.container,
    });

    // 4. Save SubmissionResult
    const submissionResult = await SubmissionResult.findOneAndUpdate(
      { submissionId },
      {
        submissionId,
        attemptId,
        questionId,
        passedTests: evalResult.passedTests || 0,
        totalTests: evalResult.totalTests || 0,
        score: evalResult.score || 0,
        maxScore: question.marks || 0,
        executionTime: evalResult.executionTime || 0,
        memoryUsed: evalResult.memoryUsed || 0,
        status: evalResult.overallStatus || 'SYSTEM_ERROR',
        compileOutput: evalResult.compileOutput || '',
        testResults: evalResult.testResults || [],
      },
      { upsert: true, new: true }
    );

    // 5. Mark Submission as COMPLETED
    await Submission.findByIdAndUpdate(submissionId, { status: 'COMPLETED' });
    await ExecutionJob.findOneAndUpdate({ jobId }, { status: 'COMPLETED', completedAt: new Date() });

    emitToAttempt(attemptId, 'submission:status', {
      submissionId,
      status: 'COMPLETED',
      questionId,
      result: {
        passedTests: submissionResult.passedTests,
        totalTests: submissionResult.totalTests,
        score: submissionResult.score,
        status: submissionResult.status,
      },
    });

    // 6. Check if all submissions for this ExamAttempt are completed
    await checkAndFinalizeExamAttempt(attemptId);
  } catch (err) {
    logger.error(`Failed processing submission job ${job.id || jobId}: ${err.message}`, err);
    await Submission.findByIdAndUpdate(submissionId, { status: 'FAILED' });
    await ExecutionJob.findOneAndUpdate({ jobId }, { status: 'FAILED', error: err.message, completedAt: new Date() });

    emitToAttempt(attemptId, 'submission:status', {
      submissionId,
      status: 'FAILED',
      questionId,
      error: err.message,
    });

    // Attempt might still need finalization even if one submission failed
    await checkAndFinalizeExamAttempt(attemptId);
  }
}

/**
 * Checks if all submissions of an attempt have finished processing.
 * If yes, updates attempt totalScore, percentage, and marks as EVALUATED.
 */
export async function checkAndFinalizeExamAttempt(attemptId) {
  try {
    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) return;

    const exam = await Exam.findById(attempt.examId);
    if (!exam) return;

    // Check all submissions linked to this attempt
    const submissions = await Submission.find({ attemptId });
    const pendingCount = submissions.filter((s) => s.status === 'PENDING' || s.status === 'QUEUED' || s.status === 'RUNNING').length;

    if (pendingCount > 0) {
      // Still waiting for other questions to be evaluated
      return;
    }

    // All questions evaluated! Aggregate results
    const results = await SubmissionResult.find({ attemptId });

    let totalScore = 0;
    for (const res of results) {
      totalScore += res.score || 0;
    }

    const maxScore = exam.totalMarks || 100;
    const percentage = maxScore > 0 ? +((totalScore / maxScore) * 100).toFixed(2) : 0;
    const resultStatus = totalScore >= (exam.passingMarks || 0) ? 'PASS' : 'FAIL';

    attempt.totalScore = totalScore;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.resultStatus = resultStatus;
    attempt.status = 'EVALUATED';
    attempt.submittedAt = attempt.submittedAt || new Date();
    await attempt.save();

    logger.info(`Exam attempt ${attemptId} finalized. Total Score: ${totalScore}/${maxScore} (${percentage}%) - ${resultStatus}`);

    emitToAttempt(attemptId, 'attempt:completed', {
      attemptId,
      totalScore,
      maxScore,
      percentage,
      resultStatus,
      status: 'EVALUATED',
    });

    emitToUser(attempt.userId.toString(), 'attempt:completed', {
      attemptId,
      examId: attempt.examId,
      totalScore,
      maxScore,
      percentage,
      resultStatus,
    });

    emitToAdmin('admin:result_updated', {
      attemptId,
      userId: attempt.userId,
      examId: attempt.examId,
      totalScore,
      percentage,
      resultStatus,
    });
  } catch (err) {
    logger.error(`Error finalizing exam attempt ${attemptId}: ${err.message}`, err);
  }
}

export function startWorker() {
  registerWorkerHandler(processSubmissionJob);
}
