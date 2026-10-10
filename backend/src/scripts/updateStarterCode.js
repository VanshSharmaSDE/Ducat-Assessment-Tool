import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Question } from '../models/Question.js';
import { DEFAULT_STARTER_CODE, SUPPORTED_LANGUAGES } from '../utils/starterCode.js';

async function updateStarterCode() {
  await connectDB();
  const questions = await Question.find({});
  console.log(`Found ${questions.length} questions to check.`);

  let updatedCount = 0;
  for (const q of questions) {
    let changed = false;
    if (!q.starterCode) q.starterCode = new Map();

    for (const lang of SUPPORTED_LANGUAGES) {
      const code = q.starterCode.get(lang);
      // If code is missing or contains old boilerplate (BufferedReader / solve() / fs.readFileSync)
      if (
        !code ||
        code.includes('BufferedReader') ||
        code.includes('sys.stdin.read().split()') ||
        code.includes("fs.readFileSync(0, 'utf-8')")
      ) {
        q.starterCode.set(lang, DEFAULT_STARTER_CODE[lang]);
        changed = true;
      }
    }

    if (changed) {
      await q.save();
      updatedCount++;
      console.log(`Updated question: "${q.title}" with clean starter code.`);
    }
  }

  console.log(`Starter code update complete. Updated ${updatedCount} questions.`);
  process.exit(0);
}

updateStarterCode().catch((err) => {
  console.error('Update failed:', err);
  process.exit(1);
});
