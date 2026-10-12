import mongoose from 'mongoose';

const examQuestionSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true,
    },
    marks: {
      type: Number,
      required: true,
      min: 1,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const examSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Exam title is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      default: '',
    },
    instructions: {
      type: String,
      default: 'Read all questions carefully. Code execution is not available during the assessment. Your code will be evaluated automatically against hidden test cases upon final submission.',
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Exam duration is required'],
      min: 5,
      max: 360,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 1,
    },
    passingMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    difficulty: {
      type: String,
      enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'],
      default: 'INTERMEDIATE',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'UPCOMING', 'ACTIVE', 'EXPIRED', 'COMPLETED', 'ARCHIVED'],
      default: 'DRAFT',
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    questions: [examQuestionSchema],
    randomizeQuestions: {
      type: Boolean,
      default: false,
    },
    maxViolations: {
      type: Number,
      default: 5, // Auto-submit/terminate after 5 violations (tab-switches, fullscreen exits)
    },
    allowCodeRun: {
      type: Boolean,
      default: false,
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

// Method to compute dynamic status based on current time & published status
examSchema.methods.getComputedStatus = function () {
  if (!this.isPublished) return 'DRAFT';
  const now = new Date();
  if (now < this.startDate) return 'UPCOMING';
  if (now > this.endDate) return 'EXPIRED';
  return 'ACTIVE';
};

export const Exam = mongoose.model('Exam', examSchema);
