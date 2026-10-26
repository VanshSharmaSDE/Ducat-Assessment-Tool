import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Question } from '../models/Question.js';
import { SUPPORTED_LANGUAGES, DEFAULT_STARTER_CODE } from '../utils/starterCode.js';

async function migrate() {
  await connectDB();
  const questions = await Question.find({});
  console.log(`Found ${questions.length} questions to check/migrate.`);

  for (const q of questions) {
    let changed = false;
    const currentAllowed = q.allowedLanguages || [];
    
    // Skip SQL-only questions
    if (currentAllowed.length === 1 && currentAllowed[0] === 'sql') {
      continue;
    }

    // Ensure all supported coding languages are allowed
    const hasAll = SUPPORTED_LANGUAGES.every((l) => currentAllowed.includes(l));
    if (!hasAll) {
      q.allowedLanguages = SUPPORTED_LANGUAGES;
      changed = true;
    }

    // Ensure starterCode Map has templates for all 3
    if (!q.starterCode) q.starterCode = new Map();
    for (const lang of SUPPORTED_LANGUAGES) {
      if (!q.starterCode.get(lang)) {
        q.starterCode.set(lang, DEFAULT_STARTER_CODE[lang]);
        changed = true;
      }
    }

    if (changed) {
      await q.save();
      console.log(`Updated question: "${q.title}" with Java, Python, and JavaScript support.`);
    }
  }

  console.log('Migration completed.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
