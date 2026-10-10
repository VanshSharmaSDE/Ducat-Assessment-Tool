import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { User } from '../models/User.js';

async function seedFaculty() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(config.mongo.uri);

  const existing = await User.findOne({ email: 'faculty@assessment.com' });
  if (existing) {
    existing.role = 'FACULTY';
    existing.name = 'Prof. Vikram Malhotra';
    existing.batch = 'Computer Science Department';
    await existing.save();
    console.log('Updated existing faculty account: faculty@assessment.com');
  } else {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('Faculty@123456', salt);
    await User.create({
      name: 'Prof. Vikram Malhotra',
      email: 'faculty@assessment.com',
      passwordHash,
      role: 'FACULTY',
      isActive: true,
      isVerified: true,
      phone: '+1-555-0150',
      batch: 'Computer Science Department',
    });
    console.log('Created faculty account: faculty@assessment.com / Faculty@123456');
  }

  await mongoose.disconnect();
  console.log('Done.');
}

seedFaculty().catch((err) => {
  console.error('Error seeding faculty:', err);
  process.exit(1);
});
