import mongoose from 'mongoose';

const testResultSchema = new mongoose.Schema(
  {
    testCaseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TestCase',
      required: true,
    },
    isHidden: {
      type: Boolean,
      default: true,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: [
        'PASSED',
        'WRONG_ANSWER',
        'COMPILE_ERROR',
        'RUNTIME_ERROR',
        'TIME_LIMIT_EXCEEDED',
        'MEMORY_LIMIT_EXCEEDED',
        'SYSTEM_ERROR',
      ],
      required: true,
    },
    executionTime: {
      type: Number, // in seconds
      default: 0,
    },
    memoryUsed: {
      type: Number, // in MB
      default: 0,
    },
    actualOutput: {
      type: String,
      default: '', // Only exposed to students for public tests, hidden for hidden tests
    },
    expectedOutput: {
      type: String,
      default: '', // Exposed only for public tests or admin view
    },
    input: {
      type: String,
      default: '', // Exposed only for public tests or admin view
    },
    errorMessage: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const submissionResultSchema = new mongoose.Schema(
  {
    submissionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Submission',
      required: true,
      unique: true,
      index: true,
    },
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      required: true,
      index: true,
    },
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    passedTests: {
      type: Number,
      default: 0,
    },
    totalTests: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    executionTime: {
      type: Number, // average or max execution time in seconds
      default: 0,
    },
    memoryUsed: {
      type: Number, // peak memory in MB
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'PASSED',
        'PARTIAL',
        'WRONG_ANSWER',
        'COMPILE_ERROR',
        'RUNTIME_ERROR',
        'TIME_LIMIT_EXCEEDED',
        'MEMORY_LIMIT_EXCEEDED',
        'SYSTEM_ERROR',
      ],
      default: 'PENDING',
      index: true,
    },
    compileOutput: {
      type: String,
      default: '',
    },
    testResults: [testResultSchema],
  },
  {
    timestamps: true,
  }
);

export const SubmissionResult = mongoose.model('SubmissionResult', submissionResultSchema);
