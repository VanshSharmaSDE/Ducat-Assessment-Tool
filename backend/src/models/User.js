import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    studentId: {
      type: String,
      trim: true,
      default: undefined,
    },
    facultyId: {
      type: String,
      trim: true,
      default: undefined,
    },
    adminId: {
      type: String,
      trim: true,
      default: undefined,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: undefined,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },
    role: {
      type: String,
      enum: ['USER', 'FACULTY', 'ADMIN'],
      default: 'USER',
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    rollNumber: {
      type: String,
      trim: true,
      default: '',
    },
    batch: {
      type: String,
      trim: true,
      default: '',
    },
    technology: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    technologies: {
      type: [String],
      default: [],
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      default: null,
      index: true,
    },
    gender: {
      type: String,
      trim: true,
      default: '',
    },
    age: {
      type: Number,
      default: null,
    },
    organization: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    isImported: {
      type: Boolean,
      default: false,
      index: true,
    },
    importedBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        organization: { type: String, default: '' },
        at: { type: Date, default: Date.now },
      },
    ],
    assignedFaculties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    currentSessionId: {
      type: String,
      default: null,
    },
    sessionExpiresAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: true, // Auto-verified in development or upon signup
    },
    verificationToken: {
      type: String,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
  },
  {
    timestamps: true,
  }
);

// Sparse unique indexes for IDs and optional email
userSchema.index({ studentId: 1 }, { unique: true, sparse: true });
userSchema.index({ facultyId: 1 }, { unique: true, sparse: true });
userSchema.index({ adminId: 1 }, { unique: true, sparse: true });
userSchema.index({ email: 1 }, { unique: true, sparse: true });

// Pre-save cleanup for sparse indexes and sync studentId <-> rollNumber
userSchema.pre('save', function (next) {
  if (!this.email || (typeof this.email === 'string' && !this.email.trim())) {
    this.email = undefined;
  }
  if (!this.studentId || (typeof this.studentId === 'string' && !this.studentId.trim())) {
    this.studentId = undefined;
  }
  if (!this.facultyId || (typeof this.facultyId === 'string' && !this.facultyId.trim())) {
    this.facultyId = undefined;
  }
  if (!this.adminId || (typeof this.adminId === 'string' && !this.adminId.trim())) {
    this.adminId = undefined;
  }
  if (this.role === 'USER') {
    if (this.studentId && !this.rollNumber) {
      this.rollNumber = this.studentId;
    } else if (this.rollNumber && !this.studentId) {
      this.studentId = this.rollNumber;
    }
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.verificationToken;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

export const User = mongoose.model('User', userSchema);
export default User;
