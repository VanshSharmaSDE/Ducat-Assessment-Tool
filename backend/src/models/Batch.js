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
    technology: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    organization: {
      type: String,
      trim: true,
      default: '',
      index: true,
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

// Compound unique index: batch name is unique per technology, organization, and creator
batchSchema.index({ name: 1, technology: 1, organization: 1, createdBy: 1 }, { unique: true });

export const Batch = mongoose.model('Batch', batchSchema);

// Self-healing: Ensure legacy global unique indexes on name or {name, createdBy} are dropped
const dropLegacyIndex = async () => {
  try {
    await Batch.collection.dropIndex('name_1');
  } catch (_) {}
  try {
    await Batch.collection.dropIndex('name_1_createdBy_1');
  } catch (_) {}
};
dropLegacyIndex();
Batch.on('index', dropLegacyIndex);

export default Batch;
