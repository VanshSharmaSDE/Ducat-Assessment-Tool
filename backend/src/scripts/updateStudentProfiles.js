import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';

async function run() {
  await connectDB();
  await User.updateOne(
    { email: 'student@assessment.com' },
    { $set: { rollNumber: 'CS2024-001', batch: 'Batch 2024-A', gender: 'Female', age: 21 } }
  );
  await User.updateOne(
    { email: 'john@assessment.com' },
    { $set: { rollNumber: 'CS2024-002', batch: 'Batch 2024-B', gender: 'Male', age: 22 } }
  );
  console.log('Successfully updated student profile fields in MongoDB.');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
