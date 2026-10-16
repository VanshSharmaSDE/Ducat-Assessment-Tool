import mongoose from 'mongoose';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(config.mongo.uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
      maxPoolSize: 100,
    });

    isConnected = true;
    logger.info(`MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);

    // Verify and ensure sparse indexes on users collection for optional unique fields
    try {
      const usersColl = conn.connection.collection('users');
      const indexes = await usersColl.indexes();
      const sparseFields = ['email_1', 'studentId_1', 'facultyId_1', 'adminId_1'];
      for (const idx of indexes) {
        if (sparseFields.includes(idx.name) && !idx.sparse) {
          logger.warn(`Dropping non-sparse index ${idx.name} on users collection...`);
          await usersColl.dropIndex(idx.name);
          logger.info(`Dropped non-sparse index ${idx.name}.`);
        }
      }
    } catch (idxErr) {
      logger.warn(`Index check note: ${idxErr.message}`);
    }
  } catch (error) {
    logger.error(`MongoDB Connection Error: ${error.message}`);
    // In dev or testing, allow caller to handle or retry
    throw error;
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
  isConnected = false;
});

mongoose.connection.on('error', (err) => {
  logger.error(`MongoDB connection error event: ${err.message}`);
});
