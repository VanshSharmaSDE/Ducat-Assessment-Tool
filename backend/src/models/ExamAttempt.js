import mongoose from 'mongoose';

const examEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['tab_switch', 'fullscreen_exit', 'page_refresh', 'exam_exit', 'blur', 'copy_paste'],
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    details: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const examAttemptSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    examId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exam',
      required: true,
      index: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    endTime: {
      type: Date, // Server-calculated deadline
      required: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['IN_PROGRESS', 'SUBMITTED', 'EVALUATING', 'EVALUATED', 'EXPIRED', 'TERMINATED'],
      default: 'IN_PROGRESS',
      index: true,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    maxScore: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    resultStatus: {
      type: String,
      enum: ['PENDING', 'PASS', 'FAIL', 'TERMINATED', 'ONGOING'],
      default: 'PENDING',
      index: true,
    },
    terminationReason: {
      type: String,
      default: '',
    },
    violationCount: {
      type: Number,
      default: 0,
    },
    events: [examEventSchema],
    clientIp: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to ensure 1 active or completed attempt per user per exam
examAttemptSchema.index({ userId: 1, examId: 1 });

export const ExamAttempt = mongoose.model('ExamAttempt', examAttemptSchema);
export default ExamAttempt;
