import mongoose from 'mongoose';

const technologySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Technology name is required'],
      trim: true,
    },
    organization: {
      type: String,
      required: [true, 'Organization is required for technology'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: technology name is unique per organization
technologySchema.index({ name: 1, organization: 1 }, { unique: true });

export const Technology = mongoose.model('Technology', technologySchema);
export default Technology;
