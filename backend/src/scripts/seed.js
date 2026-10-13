import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { TestCase } from '../models/TestCase.js';
import { Exam } from '../models/Exam.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';
import { ExecutionJob } from '../models/ExecutionJob.js';
import { DEFAULT_STARTER_CODE } from '../utils/starterCode.js';

async function seed() {
  const force = process.argv.includes('--force');

  console.log('Connecting to MongoDB for seeding...');
  try {
    await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 5000 });
  } catch (err) {
    console.error(`\nCould not connect to MongoDB at ${config.mongo.uri}`);
    console.error('Make sure the MongoDB server is installed and running (or set MONGO_URI in backend/.env).\n');
    process.exit(1);
  }

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0 && !force) {
    console.log(`Database already contains ${existingUsers} user(s). Skipping seed (use "npm run seed -- --force" to reset).`);
    await mongoose.disconnect();
    return;
  }

  console.log('Cleaning existing collections...');
  await Promise.all([
    User.deleteMany({}),
    Question.deleteMany({}),
    TestCase.deleteMany({}),
    Exam.deleteMany({}),
    ExamAttempt.deleteMany({}),
    Submission.deleteMany({}),
    SubmissionResult.deleteMany({}),
    ExecutionJob.deleteMany({}),
  ]);

  console.log('Creating Admin and Student accounts...');
  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123456', salt);
  const studentPasswordHash = await bcrypt.hash('Student@123456', salt);

  const admin = await User.create({
    name: 'Platform Administrator',
    adminId: 'ADMIN001',
    email: 'admin@assessment.com',
    passwordHash: adminPasswordHash,
    role: 'ADMIN',
    isActive: true,
    isVerified: true,
    phone: '+1-555-0199',
  });

  const student1 = await User.create({
    name: 'Alice Johnson',
    email: 'student@assessment.com',
    passwordHash: studentPasswordHash,
    role: 'USER',
    isActive: true,
    isVerified: true,
    phone: '+1-555-0101',
    rollNumber: 'CS2024-001',
    batch: 'Batch 2024-A',
    gender: 'Female',
    age: 21,
  });

  const student2 = await User.create({
    name: 'John Doe',
    email: 'john@assessment.com',
    passwordHash: studentPasswordHash,
    role: 'USER',
    isActive: true,
    isVerified: true,
    phone: '+1-555-0102',
    rollNumber: 'CS2024-002',
    batch: 'Batch 2024-B',
    gender: 'Male',
    age: 22,
  });

  const facultyPasswordHash = await bcrypt.hash('Faculty@123456', salt);
  const faculty = await User.create({
    name: 'Prof. Vikram Malhotra',
    email: 'faculty@assessment.com',
    passwordHash: facultyPasswordHash,
    role: 'FACULTY',
    isActive: true,
    isVerified: true,
    phone: '+1-555-0150',
    batch: 'Computer Science Department',
  });

  console.log('Creating 10 programming questions with test cases...');

  const questionsData = [
    {
      title: 'Two Sum',
      difficulty: 'EASY',
      marks: 10,
      description: 'Given an array of integers `nums` and an integer `target`, return the 0-based indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice. Print the two indices separated by a single space in ascending order.',
      inputFormat: 'First line contains integer n (number of elements).\nSecond line contains n space-separated integers.\nThird line contains integer target.',
      outputFormat: 'Print two space-separated indices (i j) such that nums[i] + nums[j] == target and i < j.',
      constraints: '2 <= n <= 10^4\n-10^9 <= nums[i] <= 10^9\n-10^9 <= target <= 10^9',
      examples: [
        {
          input: '4\n2 7 11 15\n9',
          output: '0 1',
          explanation: 'nums[0] + nums[1] = 2 + 7 = 9, so output is "0 1".',
        },
        {
          input: '3\n3 2 4\n6',
          output: '1 2',
          explanation: 'nums[1] + nums[2] = 2 + 4 = 6.',
        },
      ],
      testCases: [
        { input: '4\n2 7 11 15\n9', expectedOutput: '0 1', isHidden: false, marks: 3 },
        { input: '3\n3 2 4\n6', expectedOutput: '1 2', isHidden: false, marks: 3 },
        { input: '2\n3 3\n6', expectedOutput: '0 1', isHidden: true, marks: 2 },
        { input: '5\n1 5 3 7 10\n12', expectedOutput: '1 3', isHidden: true, marks: 2 },
      ],
    },
    {
      title: 'Valid Parentheses',
      difficulty: 'EASY',
      marks: 10,
      description: 'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\nPrint `true` if valid, otherwise `false`.',
      inputFormat: 'A single line containing the bracket string s.',
      outputFormat: 'Print "true" if the string is valid, otherwise "false".',
      constraints: '1 <= s.length <= 10^4\ns consists of parentheses only \'()[]{}\'.',
      examples: [
        { input: '()', output: 'true', explanation: 'Direct matching pair.' },
        { input: '()[]{}', output: 'true', explanation: 'All pairs properly closed.' },
        { input: '(]', output: 'false', explanation: 'Mismatched closing bracket.' },
      ],
      testCases: [
        { input: '()', expectedOutput: 'true', isHidden: false, marks: 3 },
        { input: '()[]{}', expectedOutput: 'true', isHidden: false, marks: 3 },
        { input: '(]', expectedOutput: 'false', isHidden: true, marks: 2 },
        { input: '{[()]}', expectedOutput: 'true', isHidden: true, marks: 2 },
      ],
    },
    {
      title: 'Palindrome Number',
      difficulty: 'EASY',
      marks: 10,
      description: 'Given an integer `x`, print `true` if `x` is a palindrome, and `false` otherwise.\n\nAn integer is a palindrome when it reads the same forward and backward.',
      inputFormat: 'A single integer x.',
      outputFormat: 'Print "true" or "false".',
      constraints: '-2^31 <= x <= 2^31 - 1',
      examples: [
        { input: '121', output: 'true', explanation: '121 reads as 121 from left to right and from right to left.' },
        { input: '-121', output: 'false', explanation: 'From left to right it reads -121. From right to left it becomes 121-.' },
      ],
      testCases: [
        { input: '121', expectedOutput: 'true', isHidden: false, marks: 3 },
        { input: '-121', expectedOutput: 'false', isHidden: false, marks: 3 },
        { input: '10', expectedOutput: 'false', isHidden: true, marks: 2 },
        { input: '12321', expectedOutput: 'true', isHidden: true, marks: 2 },
      ],
    },
    {
      title: 'Reverse a String',
      difficulty: 'EASY',
      marks: 10,
      description: 'Given a string `s`, print the reversed version of `s`.',
      inputFormat: 'A single line string.',
      outputFormat: 'Print the reversed string.',
      constraints: '1 <= s.length <= 10^5',
      examples: [
        { input: 'hello', output: 'olleh', explanation: 'The reverse of hello is olleh.' },
        { input: 'assessment', output: 'tnemssessa', explanation: 'The reverse of assessment.' },
      ],
      testCases: [
        { input: 'hello', expectedOutput: 'olleh', isHidden: false, marks: 4 },
        { input: 'assessment', expectedOutput: 'tnemssessa', isHidden: false, marks: 3 },
        { input: 'racecar', expectedOutput: 'racecar', isHidden: true, marks: 3 },
      ],
    },
    {
      title: 'Binary Search',
      difficulty: 'EASY',
      marks: 15,
      description: 'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, then print its 0-based index. Otherwise, print `-1`.',
      inputFormat: 'First line contains n.\nSecond line contains n space-separated sorted integers.\nThird line contains target.',
      outputFormat: 'Print the 0-based index of target, or -1 if target is not found.',
      constraints: '1 <= n <= 10^4\n-10^4 < nums[i], target < 10^4\nAll integers in nums are unique and sorted.',
      examples: [
        { input: '6\n-1 0 3 5 9 12\n9', output: '4', explanation: '9 exists in nums and its index is 4.' },
        { input: '6\n-1 0 3 5 9 12\n2', output: '-1', explanation: '2 does not exist in nums so return -1.' },
      ],
      testCases: [
        { input: '6\n-1 0 3 5 9 12\n9', expectedOutput: '4', isHidden: false, marks: 5 },
        { input: '6\n-1 0 3 5 9 12\n2', expectedOutput: '-1', isHidden: false, marks: 5 },
        { input: '1\n5\n5', expectedOutput: '0', isHidden: true, marks: 3 },
        { input: '5\n10 20 30 40 50\n60', expectedOutput: '-1', isHidden: true, marks: 2 },
      ],
    },
    {
      title: 'Maximum Subarray Sum',
      difficulty: 'MEDIUM',
      marks: 25,
      description: 'Given an integer array `nums`, find the subarray with the largest sum, and print its sum (Kadane\'s algorithm).',
      inputFormat: 'First line contains n.\nSecond line contains n space-separated integers.',
      outputFormat: 'Print a single integer representing the maximum subarray sum.',
      constraints: '1 <= n <= 10^5\n-10^4 <= nums[i] <= 10^4',
      examples: [
        { input: '9\n-2 1 -3 4 -1 2 1 -5 4', output: '6', explanation: 'The subarray [4,-1,2,1] has the largest sum 6.' },
        { input: '1\n1', output: '1', explanation: 'Single element subarray.' },
      ],
      testCases: [
        { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isHidden: false, marks: 10 },
        { input: '1\n1', expectedOutput: '1', isHidden: false, marks: 5 },
        { input: '5\n5 4 -1 7 8', expectedOutput: '23', isHidden: true, marks: 5 },
        { input: '4\n-5 -2 -8 -1', expectedOutput: '-1', isHidden: true, marks: 5 },
      ],
    },
    {
      title: 'Merge Two Sorted Arrays',
      difficulty: 'MEDIUM',
      marks: 20,
      description: 'You are given two integer arrays `nums1` and `nums2`, sorted in non-decreasing order. Merge `nums1` and `nums2` into a single sorted array and print all elements separated by a space.',
      inputFormat: 'First line contains n and m (lengths of nums1 and nums2).\nSecond line contains n space-separated integers of nums1.\nThird line contains m space-separated integers of nums2.',
      outputFormat: 'Print the n+m merged integers in non-decreasing order, separated by a single space.',
      constraints: '1 <= n, m <= 10^4\n-10^9 <= nums1[i], nums2[j] <= 10^9',
      examples: [
        { input: '3 3\n1 2 3\n2 5 6', output: '1 2 2 3 5 6', explanation: 'Combined and sorted array.' },
        { input: '1 1\n1\n2', output: '1 2', explanation: 'Simple two element merge.' },
      ],
      testCases: [
        { input: '3 3\n1 2 3\n2 5 6', expectedOutput: '1 2 2 3 5 6', isHidden: false, marks: 8 },
        { input: '1 1\n1\n2', expectedOutput: '1 2', isHidden: false, marks: 6 },
        { input: '4 2\n0 4 8 10\n1 7', expectedOutput: '0 1 4 7 8 10', isHidden: true, marks: 6 },
      ],
    },
    {
      title: 'Longest Substring Without Repeating Characters',
      difficulty: 'MEDIUM',
      marks: 20,
      description: 'Given a string `s`, find the length of the longest substring without repeating characters.',
      inputFormat: 'A single string s.',
      outputFormat: 'Print an integer representing the maximum length.',
      constraints: '0 <= s.length <= 5 * 10^4\ns consists of English letters, digits, symbols and spaces.',
      examples: [
        { input: 'abcabcbb', output: '3', explanation: 'The answer is "abc", with the length of 3.' },
        { input: 'bbbbb', output: '1', explanation: 'The answer is "b", with the length of 1.' },
        { input: 'pwwkew', output: '3', explanation: 'The answer is "wke", with the length of 3.' },
      ],
      testCases: [
        { input: 'abcabcbb', expectedOutput: '3', isHidden: false, marks: 7 },
        { input: 'bbbbb', expectedOutput: '1', isHidden: false, marks: 7 },
        { input: 'pwwkew', expectedOutput: '3', isHidden: true, marks: 6 },
      ],
    },
    {
      title: 'Fibonacci Number',
      difficulty: 'EASY',
      marks: 10,
      description: 'The Fibonacci numbers, commonly denoted `F(n)` form a sequence, such that each number is the sum of the two preceding ones, starting from 0 and 1. That is:\nF(0) = 0, F(1) = 1\nF(n) = F(n - 1) + F(n - 2), for n > 1.\n\nGiven `n`, calculate `F(n)`.',
      inputFormat: 'A single integer n.',
      outputFormat: 'Print F(n).',
      constraints: '0 <= n <= 30',
      examples: [
        { input: '2', output: '1', explanation: 'F(2) = F(1) + F(0) = 1 + 0 = 1.' },
        { input: '3', output: '2', explanation: 'F(3) = F(2) + F(1) = 1 + 1 = 2.' },
        { input: '4', output: '3', explanation: 'F(4) = F(3) + F(2) = 2 + 1 = 3.' },
      ],
      testCases: [
        { input: '2', expectedOutput: '1', isHidden: false, marks: 3 },
        { input: '3', expectedOutput: '2', isHidden: false, marks: 3 },
        { input: '4', expectedOutput: '3', isHidden: true, marks: 2 },
        { input: '10', expectedOutput: '55', isHidden: true, marks: 2 },
      ],
    },
    {
      title: 'Matrix Transpose',
      difficulty: 'MEDIUM',
      marks: 20,
      description: 'Given a 2D integer array `matrix` of size `R x C`, print the transpose of `matrix`.\n\nThe transpose of a matrix is the matrix flipped over its main diagonal, switching the matrix\'s row and column indices.',
      inputFormat: 'First line contains R and C (rows and columns).\nNext R lines each contain C space-separated integers.',
      outputFormat: 'Print C lines, each containing R space-separated integers representing the transposed matrix.',
      constraints: '1 <= R, C <= 100\n-10^4 <= matrix[i][j] <= 10^4',
      examples: [
        {
          input: '2 3\n1 2 3\n4 5 6',
          output: '1 4\n2 5\n3 6',
          explanation: 'Original 2x3 matrix transposed into 3x2 matrix.',
        },
      ],
      testCases: [
        { input: '2 3\n1 2 3\n4 5 6', expectedOutput: '1 4\n2 5\n3 6', isHidden: false, marks: 10 },
        { input: '3 3\n1 2 3\n4 5 6\n7 8 9', expectedOutput: '1 4 7\n2 5 8\n3 6 9', isHidden: true, marks: 10 },
      ],
    },
  ];

  const createdQuestions = [];

  for (const qData of questionsData) {
    const question = await Question.create({
      title: qData.title,
      description: qData.description,
      inputFormat: qData.inputFormat,
      outputFormat: qData.outputFormat,
      constraints: qData.constraints,
      examples: qData.examples,
      difficulty: qData.difficulty,
      marks: qData.marks,
      allowedLanguages: ['java', 'python', 'javascript'],
      starterCode: new Map([
        ['java', DEFAULT_STARTER_CODE.java],
        ['python', DEFAULT_STARTER_CODE.python],
        ['javascript', DEFAULT_STARTER_CODE.javascript],
      ]),
      timeLimit: 2,
      memoryLimit: 256,
      comparisonMode: 'TRIMMED',
      createdBy: admin._id,
    });

    createdQuestions.push(question);

    // Create test cases
    for (let i = 0; i < qData.testCases.length; i++) {
      const tc = qData.testCases[i];
      await TestCase.create({
        questionId: question._id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isHidden: tc.isHidden,
        marks: tc.marks,
        order: i + 1,
      });
    }
  }

  console.log(`Created ${createdQuestions.length} questions.`);

  console.log('Creating 3 sample exams...');
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fiveDaysAhead = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
  const fifteenDaysAhead = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

  // Exam 1: Standard Algorithmic Assessment 2026 (Active)
  const exam1Questions = [
    { questionId: createdQuestions[0]._id, marks: 10, order: 1 }, // Two Sum
    { questionId: createdQuestions[1]._id, marks: 10, order: 2 }, // Valid Parentheses
    { questionId: createdQuestions[4]._id, marks: 15, order: 3 }, // Binary Search
    { questionId: createdQuestions[5]._id, marks: 25, order: 4 }, // Maximum Subarray
  ];
  const exam1 = await Exam.create({
    title: 'Standard Algorithmic Assessment 2026',
    description: 'Comprehensive core computer science assessment evaluating fundamental data structures, arrays, strings, and search algorithms.',
    instructions: '1. Duration: 60 minutes.\n2. Do NOT refresh or close the tab; timer continues running on server.\n3. Anti-cheating proctoring active: switching tabs or exiting full-screen will be recorded as violations.\n4. Code execution is not provided during the assessment. Your final submission will be evaluated automatically against hidden test cases.\n5. Click "Submit Exam" once all solutions are written.',
    duration: 60,
    startDate: oneDayAgo,
    endDate: thirtyDaysAhead,
    totalMarks: 60,
    passingMarks: 35,
    difficulty: 'INTERMEDIATE',
    status: 'ACTIVE',
    isPublished: true,
    questions: exam1Questions,
    maxViolations: 5,
    createdBy: admin._id,
  });

  // Exam 2: Full-Stack Developer Coding Assessment (Active)
  const exam2Questions = [
    { questionId: createdQuestions[2]._id, marks: 10, order: 1 }, // Palindrome Number
    { questionId: createdQuestions[6]._id, marks: 20, order: 2 }, // Merge Two Sorted Arrays
    { questionId: createdQuestions[7]._id, marks: 20, order: 3 }, // Longest Substring
    { questionId: createdQuestions[9]._id, marks: 20, order: 4 }, // Matrix Transpose
  ];
  const exam2 = await Exam.create({
    title: 'Full-Stack Developer Coding Assessment',
    description: 'Technical evaluation covering string manipulation, arrays, sliding windows, and matrix transformation logic.',
    instructions: '1. Duration: 90 minutes.\n2. You can switch between questions freely.\n3. All solutions must be written in Java 17 (read from standard input, print to standard output).\n4. Code will be tested against private test suites upon submission.',
    duration: 90,
    startDate: oneDayAgo,
    endDate: thirtyDaysAhead,
    totalMarks: 70,
    passingMarks: 40,
    difficulty: 'INTERMEDIATE',
    status: 'ACTIVE',
    isPublished: true,
    questions: exam2Questions,
    maxViolations: 5,
    createdBy: admin._id,
  });

  // Exam 3: Advanced Competitive Programming Examination (Upcoming)
  const exam3Questions = [
    { questionId: createdQuestions[3]._id, marks: 10, order: 1 }, // Reverse a String
    { questionId: createdQuestions[8]._id, marks: 10, order: 2 }, // Fibonacci Number
    { questionId: createdQuestions[5]._id, marks: 25, order: 3 }, // Maximum Subarray
    { questionId: createdQuestions[9]._id, marks: 20, order: 4 }, // Matrix Transpose
  ];
  const exam3 = await Exam.create({
    title: 'Advanced Competitive Programming Examination',
    description: 'Timed assessment testing optimal time complexity, algorithmic paradigms, dynamic programming, and memory constraints.',
    instructions: '1. Duration: 120 minutes.\n2. Exam opens automatically on scheduled start date.\n3. Strict time limit enforced by backend.',
    duration: 120,
    startDate: fiveDaysAhead,
    endDate: fifteenDaysAhead,
    totalMarks: 65,
    passingMarks: 40,
    difficulty: 'ADVANCED',
    status: 'UPCOMING',
    isPublished: true,
    questions: exam3Questions,
    maxViolations: 5,
    createdBy: admin._id,
  });

  console.log(`Created 3 exams: "${exam1.title}", "${exam2.title}", "${exam3.title}"`);

  // Optionally seed 1 completed attempt for student2 (John Doe) to populate analytics charts immediately
  console.log('Seeding sample completed attempt for analytics display...');
  const attempt = await ExamAttempt.create({
    userId: student2._id,
    examId: exam1._id,
    startedAt: new Date(Date.now() - 3600000),
    endTime: new Date(Date.now() - 600000),
    submittedAt: new Date(Date.now() - 600000),
    status: 'EVALUATED',
    totalScore: 50,
    maxScore: 60,
    percentage: 83.33,
    resultStatus: 'PASS',
    violationCount: 1,
    events: [
      { type: 'tab_switch', timestamp: new Date(Date.now() - 1800000), details: 'User switched browser tab for 2 seconds' }
    ],
  });

  // Submissions for student2
  const sub1 = await Submission.create({
    attemptId: attempt._id,
    userId: student2._id,
    examId: exam1._id,
    questionId: createdQuestions[0]._id,
    language: 'java',
    sourceCode: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        int[] nums = new int[n];\n        for (int i = 0; i < n; i++) nums[i] = sc.nextInt();\n        int target = sc.nextInt();\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < n; i++) {\n            Integer j = seen.get(target - nums[i]);\n            if (j != null) { System.out.println(j + " " + i); return; }\n            seen.put(nums[i], i);\n        }\n    }\n}\n`,
    status: 'COMPLETED',
  });

  await SubmissionResult.create({
    submissionId: sub1._id,
    attemptId: attempt._id,
    questionId: createdQuestions[0]._id,
    passedTests: 4,
    totalTests: 4,
    score: 10,
    maxScore: 10,
    executionTime: 0.045,
    memoryUsed: 18.2,
    status: 'PASSED',
    testResults: [
      { testCaseId: new mongoose.Types.ObjectId(), isHidden: false, passed: true, status: 'PASSED', executionTime: 0.04, memoryUsed: 18, actualOutput: '0 1', expectedOutput: '0 1', input: '4\n2 7 11 15\n9' },
      { testCaseId: new mongoose.Types.ObjectId(), isHidden: false, passed: true, status: 'PASSED', executionTime: 0.04, memoryUsed: 18, actualOutput: '1 2', expectedOutput: '1 2', input: '3\n3 2 4\n6' },
      { testCaseId: new mongoose.Types.ObjectId(), isHidden: true, passed: true, status: 'PASSED', executionTime: 0.05, memoryUsed: 18 },
      { testCaseId: new mongoose.Types.ObjectId(), isHidden: true, passed: true, status: 'PASSED', executionTime: 0.05, memoryUsed: 19 },
    ],
  });

  console.log('=======================================================');
  console.log(' SEEDING COMPLETED SUCCESSFULLY!');
  console.log('=======================================================');
  console.log('Admin Account:');
  console.log('  Email:    admin@assessment.com');
  console.log('  Password: Admin@123456');
  console.log('');
  console.log('Student Accounts:');
  console.log('  Email:    student@assessment.com');
  console.log('  Password: Student@123456');
  console.log('  ---');
  console.log('  Email:    john@assessment.com');
  console.log('  Password: Student@123456');
  console.log('=======================================================');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
