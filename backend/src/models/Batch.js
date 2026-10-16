import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Batch name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    department: {
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

// Compound unique index: batch name is unique per instructor/creator
batchSchema.index({ name: 1, createdBy: 1 }, { unique: true });

export const Batch = mongoose.model('Batch', batchSchema);

// Self-healing: Ensure legacy global unique index on name is dropped
const dropLegacyIndex = async () => {
  try {
    await Batch.collection.dropIndex('name_1');
  } catch (_) {
    // Ignore if index not present
  }
};
dropLegacyIndex();
Batch.on('index', dropLegacyIndex);

export default Batch;
