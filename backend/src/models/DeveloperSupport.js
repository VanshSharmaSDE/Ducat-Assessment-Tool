import mongoose from 'mongoose';

const developerSupportSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    adminName: {
      type: String,
      required: true,
      trim: true,
    },
    adminEmail: {
      type: String,
      trim: true,
      default: '',
    },
    adminPhone: {
      type: String,
      trim: true,
      default: '',
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      minlength: 3,
      maxlength: 250,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      default: 'BUG_REPORT',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'HIGH',
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 10000,
    },
    developerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    systemDiagnostics: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    emailStatus: {
      type: String,
      enum: ['SENT', 'FAILED', 'MANUAL_DISPATCH'],
      default: 'SENT',
      index: true,
    },
    emailError: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

developerSupportSchema.index({ admin: 1, createdAt: -1 });

export const DeveloperSupport = mongoose.model('DeveloperSupport', developerSupportSchema);
