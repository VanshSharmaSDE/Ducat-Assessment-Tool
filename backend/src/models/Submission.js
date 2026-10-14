import mongoose from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../utils/starterCode.js';

const submissionSchema = new mongoose.Schema(
  {
    attemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ExamAttempt',
      required: true,
      index: true,
    },
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
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    questionType: {
      type: String,
      enum: ['CODING', 'MCQ'],
      default: 'CODING',
    },
    language: {
      type: String,
      default: 'java',
    },
    sourceCode: {
      type: String,
      default: '',
    },
    selectedOption: {
      type: Number, // 0-indexed choice selected by the candidate for MCQ
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

submissionSchema.index({ attemptId: 1, questionId: 1 });

export const Submission = mongoose.model('Submission', submissionSchema);
