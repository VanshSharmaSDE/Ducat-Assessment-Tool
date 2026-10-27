import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
      index: true,
    },
    input: {
      type: String,
      default: '',
    },
    expectedOutput: {
      type: String,
      default: '',
    },
    isHidden: {
      type: Boolean,
      default: true,
      index: true,
    },
    marks: {
      type: Number,
      required: true,
      default: 5,
      min: 0,
    },
    timeLimit: {
      type: Number, // in seconds (override question level if set)
      default: null,
    },
    memoryLimit: {
      type: Number, // in MB (override question level if set)
      default: null,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const TestCase = mongoose.model('TestCase', testCaseSchema);
