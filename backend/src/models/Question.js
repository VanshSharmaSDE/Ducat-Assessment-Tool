import mongoose from 'mongoose';
import { SUPPORTED_LANGUAGES } from '../utils/starterCode.js';

const exampleSchema = new mongoose.Schema(
  {
    input: { type: String, default: '' },
    output: { type: String, default: '' },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Question title is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Question description is required'],
    },
    type: {
      type: String,
      enum: ['CODING', 'MCQ'],
      default: 'CODING',
      index: true,
    },
    // MCQ specific fields
    options: [
      {
        text: { type: String, required: true },
      },
    ],
    correctAnswer: {
      type: Number, // 0-indexed index of correct option in options array
      default: null,
    },
    // Coding specific fields
    inputFormat: {
      type: String,
      default: '',
    },
    outputFormat: {
      type: String,
      default: '',
    },
    constraints: {
      type: String,
      default: '',
    },
    examples: [exampleSchema],
    explanation: {
      type: String,
      default: '',
    },
    difficulty: {
      type: String,
      enum: ['EASY', 'MEDIUM', 'HARD'],
      default: 'MEDIUM',
      index: true,
    },
    marks: {
      type: Number,
      required: true,
      default: 20,
      min: 1,
    },
    allowCodeRun: {
      type: Boolean,
      default: null, // null means inherit exam setting, true/false means per-question override
    },
    allowedLanguages: {
      type: [String],
      enum: SUPPORTED_LANGUAGES,
      default: SUPPORTED_LANGUAGES,
    },
    starterCode: {
      type: Map,
      of: String,
      default: () => new Map(),
    },
    timeLimit: {
      type: Number, // in seconds
      default: 2,
      min: 0.5,
      max: 15,
    },
    memoryLimit: {
      type: Number, // in MB
      default: 256,
      min: 32,
      max: 1024,
    },
    comparisonMode: {
      type: String,
      enum: ['EXACT', 'TRIMMED', 'WHITESPACE_INSENSITIVE'],
      default: 'TRIMMED',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Question = mongoose.model('Question', questionSchema);
