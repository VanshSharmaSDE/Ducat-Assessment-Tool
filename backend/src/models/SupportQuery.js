import mongoose from 'mongoose';

const supportMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    senderRole: {
      type: String,
      enum: ['USER', 'FACULTY', 'ADMIN'],
      required: true,
    },
    senderName: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: [true, 'Message content is required'],
      trim: true,
      maxlength: 3000,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const supportQuerySchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['STUDENT_QUERY', 'FACULTY_QUERY'],
      default: 'STUDENT_QUERY',
      index: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    faculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    accessibleBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: 3,
      maxlength: 200,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'GENERAL_INQUIRY',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
      index: true,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNotes: {
      type: String,
      default: '',
      trim: true,
    },
    lastReadBy: {
      type: Map,
      of: Date,
      default: {},
    },
    messages: [supportMessageSchema],
  },
  {
    timestamps: true,
  }
);

// Indexes for high performance querying
supportQuerySchema.index({ type: 1, status: 1, createdAt: -1 });
supportQuerySchema.index({ accessibleBy: 1, createdAt: -1 });
supportQuerySchema.index({ student: 1, createdAt: -1 });
supportQuerySchema.index({ faculty: 1, createdAt: -1 });

export const SupportQuery = mongoose.model('SupportQuery', supportQuerySchema);
