import { connectDB } from '../config/db.js';
import { Exam } from '../models/Exam.js';
import { Question } from '../models/Question.js';
import { User } from '../models/User.js';
import { ensurePracticeQuestionsExist } from './seedPracticeQuestions.js';

export async function seedPracticeExams(exitOnComplete = false) {
  await connectDB();

  const admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) {
    console.warn('[Practice Seeder] No admin user found to attribute practice exams to. Skipping practice exams seed.');
    if (exitOnComplete) process.exit(1);
    return;
  }

  // Ensure all practice questions and test cases exist first
  await ensurePracticeQuestionsExist(admin._id);

  // Find questions
  const allQuestions = await Question.find({});
  const qMap = new Map();
  allQuestions.forEach((q) => qMap.set(q.title.trim().toLowerCase(), q));

  const practicePacks = [
    {
      title: 'Practice 1: Coding Fundamentals & IDE Warmup',
      description: 'Interactive orientation assessment. Test the Monaco code editor, multi-language compilers, and test case execution runner before real exams.',
      difficulty: 'BEGINNER',
      duration: 30,
      instructions: 'Welcome to CodeAssess Practice Mode! In this sandbox, you can test code compilation, run sample test cases, navigate between questions, and experience full proctoring lockdown without affecting official grades.',
      questionTitles: ['Sum of Two Numbers', 'Even or Odd', 'Load Test MCQ: Basic Computing'],
      passingMarks: 10,
    },
    {
      title: 'Practice 2: Algorithmic Logic & Loops',
      description: 'Practice number-theoretic iterative patterns, divisibility tests, and sequence generators against private automated test suites.',
      difficulty: 'INTERMEDIATE',
      duration: 45,
      instructions: 'Solve algorithmic challenges using your preferred programming language. Test your solutions with custom input and examine compiler runtime telemetry.',
      questionTitles: ['Prime Check', 'Reverse Number', 'Nth Fibonacci'],
      passingMarks: 12,
    },
    {
      title: 'Practice 3: Strings & Text Processing',
      description: 'Test your string scanning, character classification, and palindrome detection algorithms against automated Docker execution containers.',
      difficulty: 'BEGINNER',
      duration: 45,
      instructions: 'Pay close attention to string casing, whitespace trimming, and string boundary conditions.',
      questionTitles: ['Palindrome String', 'Count Vowels', 'Remove Spaces'],
      passingMarks: 12,
    },
    {
      title: 'Practice 4: Arrays, Searching & Two Sum',
      description: 'Master linear scan, target-sum search pairs, and element extrema identification in timed evaluation conditions.',
      difficulty: 'INTERMEDIATE',
      duration: 60,
      instructions: 'Analyze array bounds, handle edge test cases, and optimize algorithm execution time to avoid TLE (Time Limit Exceeded).',
      questionTitles: ['Linear Search', 'Two Sum Exists', 'Array Maximum'],
      passingMarks: 15,
    },
    {
      title: 'Practice 5: Mathematics & Matrix Computing',
      description: 'Benchmark computational algorithms including Euclidean GCD, multi-dimensional array diagonals, and recursive factorials.',
      difficulty: 'INTERMEDIATE',
      duration: 60,
      instructions: 'Test matrix traversal coordinates, handle large integer bounds, and verify recursive stack limits.',
      questionTitles: ['Greatest Common Divisor', 'Matrix Diagonal Sum', 'Factorial'],
      passingMarks: 15,
    },
    {
      title: 'Practice 6: SQL Fundamentals & Querying',
      description: 'Master relational database queries, record retrieval, conditional filtering, and group aggregations against in-memory SQLite sandbox databases.',
      difficulty: 'BEGINNER',
      duration: 45,
      instructions: 'Write standard SQL queries to solve each problem. Each question environment initializes the database tables automatically; write queries against the pre-populated schema.',
      questionTitles: ['Select All Records', 'Filter with WHERE', 'Aggregation'],
      passingMarks: 12,
    },
  ];

  console.log(`Seeding ${practicePacks.length} practice exams...`);

  for (const pack of practicePacks) {
    const questionsForExam = [];
    let totalMarks = 0;

    for (let i = 0; i < pack.questionTitles.length; i++) {
      const qTitle = pack.questionTitles[i];
      const q = qMap.get(qTitle.toLowerCase());
      if (q) {
        const marks = q.marks || (q.type === 'MCQ' ? 5 : 10);
        questionsForExam.push({
          questionId: q._id,
          marks,
          order: i + 1,
          allowCodeRun: q.type !== 'MCQ',
        });
        totalMarks += marks;
      } else {
        console.warn(`Question "${qTitle}" not found in database.`);
      }
    }

    if (questionsForExam.length === 0) {
      console.warn(`No questions found for pack: ${pack.title}. Skipping.`);
      continue;
    }

    const examData = {
      title: pack.title,
      description: pack.description,
      instructions: pack.instructions,
      duration: pack.duration,
      startDate: new Date('2026-01-01T00:00:00.000Z'),
      endDate: new Date('2030-12-31T23:59:59.000Z'),
      totalMarks,
      passingMarks: pack.passingMarks || Math.floor(totalMarks * 0.4),
      difficulty: pack.difficulty,
      status: 'ACTIVE',
      isPublished: true,
      isPractice: true,
      questions: questionsForExam,
      allowCodeRun: true,
      maxViolations: 5,
      restrictToLaptop: false,
      organization: 'CodeAssess Practice Sandbox',
      technology: 'General',
      targetTechnologies: [],
      targetBatches: [],
      createdBy: admin._id,
    };

    const existing = await Exam.findOne({ title: pack.title });
    if (existing) {
      await Exam.findByIdAndUpdate(existing._id, examData);
      console.log(`Updated existing practice exam: "${pack.title}" (${questionsForExam.length} questions, ${totalMarks} marks)`);
    } else {
      await Exam.create(examData);
      console.log(`Created new practice exam: "${pack.title}" (${questionsForExam.length} questions, ${totalMarks} marks)`);
    }
  }

  console.log(`Successfully configured ${practicePacks.length} practice exams!`);
  if (exitOnComplete) {
    process.exit(0);
  }
}

// Run directly if called as main module
if (process.argv[1]?.endsWith('seedPracticeExams.js')) {
  seedPracticeExams(true).catch((err) => {
    console.error('Failed to seed practice exams:', err);
    process.exit(1);
  });
}
