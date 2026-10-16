/**
 * Comprehensive Backend Load Testing Suite
 * Simulates 100 (or N) concurrent students hitting:
 * 1. Login API (POST /api/auth/login)
 * 2. Exam Start API (POST /api/exams/:id/start)
 * 3. Code Run API (POST /api/exams/:id/run-code)
 * 4. Exam Submission API (POST /api/exams/:id/submit)
 * 5. Full Docker Evaluation Queue Drain & Completion Monitoring
 *
 * Usage:
 *   node src/scripts/loadTest.js --all                  # Setup test users/exam, run 100-user load test, cleanup
 *   node src/scripts/loadTest.js --users=50             # Run with 50 concurrent students
 *   node src/scripts/loadTest.js --target=https://api.skillcodex.tech  # Run against remote VPS
 *   node src/scripts/loadTest.js --setup                # Only create the test users and exam
 *   node src/scripts/loadTest.js --run                  # Only execute the benchmark
 *   node src/scripts/loadTest.js --cleanup              # Only remove test data
 *   node src/scripts/loadTest.js --keep                 # Keep test users/exam after test
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { performance } from 'perf_hooks';
import { config } from '../config/index.js';
import { User } from '../models/User.js';
import { Question } from '../models/Question.js';
import { TestCase } from '../models/TestCase.js';
import { Exam } from '../models/Exam.js';
import { ExamAttempt } from '../models/ExamAttempt.js';
import { Submission } from '../models/Submission.js';
import { SubmissionResult } from '../models/SubmissionResult.js';
import { ExecutionJob } from '../models/ExecutionJob.js';

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(name, defaultValue) {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  if (match) return match.split('=')[1];
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith('--')) return args[idx + 1];
  return defaultValue;
}

const TARGET_URL = (getArg('target', process.env.API_TARGET_URL || `http://localhost:${config.port}`)).replace(/\/$/, '');
const USER_COUNT = parseInt(getArg('users', '100'), 10);
const DO_SETUP = args.includes('--setup') || args.includes('--all') || (!args.includes('--run') && !args.includes('--cleanup'));
const DO_RUN = args.includes('--run') || args.includes('--all') || (!args.includes('--setup') && !args.includes('--cleanup'));
const DO_CLEANUP = args.includes('--cleanup') || (args.includes('--all') && !args.includes('--keep'));

const TEST_PASSWORD = 'LoadTest@Password2026!';
const ORG_NAME = 'LoadTest Academy';
const TECH_NAME = 'FullStack';
const BATCH_NAME = 'Batch-LoadTest-100';

const SAMPLE_PYTHON_CODE = `import sys

def main():
    lines = sys.stdin.read().strip().split()
    if len(lines) >= 2:
        print(int(lines[0]) + int(lines[1]))
    else:
        print(0)

if __name__ == '__main__':
    main()
`;

// Helper for statistics calculation
function calculateStats(latenciesMs) {
  if (!latenciesMs || latenciesMs.length === 0) {
    return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
  }
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || sorted[sorted.length - 1];
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];

  return {
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    avg: Math.round(sum / sorted.length),
    p50: Math.round(p50),
    p95: Math.round(p95),
    p99: Math.round(p99),
  };
}

// ---------------------------------------------------------------------------
// 1. Database Setup / Seeding
// ---------------------------------------------------------------------------
async function setupTestData() {
  console.log(`\n📦 [Setup] Connecting to MongoDB to prepare ${USER_COUNT} test students and test exam...`);
  await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 10000 });

  // 1. Check or create test admin
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, salt);

  let admin = await User.findOne({ role: 'ADMIN' });
  if (!admin) {
    admin = await User.create({
      name: 'LoadTest Admin',
      email: 'loadtest_admin@skillcodex.tech',
      adminId: 'LTADMIN01',
      passwordHash,
      role: 'ADMIN',
      isActive: true,
      isVerified: true,
    });
  }

  // 2. Create Coding Question & MCQ Question
  let codingQuestion = await Question.findOne({ title: 'Load Test Problem: Two Sum' });
  if (!codingQuestion) {
    codingQuestion = await Question.create({
      title: 'Load Test Problem: Two Sum',
      description: 'Given two integers from stdin, print their sum to stdout.',
      problemStatement: 'Read two integers separated by whitespace and output their sum.',
      type: 'CODING',
      marks: 10,
      timeLimit: 2,
      memoryLimit: 256,
      allowedLanguages: ['python', 'javascript', 'java'],
      allowCodeRun: true,
      isPublished: true,
      createdBy: admin._id,
      inputFormat: 'Two space-separated integers a and b',
      outputFormat: 'Single integer representing a + b',
    });

    await TestCase.create([
      {
        questionId: codingQuestion._id,
        input: '10 20\n',
        expectedOutput: '30\n',
        isHidden: false,
        order: 1,
      },
      {
        questionId: codingQuestion._id,
        input: '100 250\n',
        expectedOutput: '350\n',
        isHidden: true,
        order: 2,
      },
    ]);
  }

  let mcqQuestion = await Question.findOne({ title: 'Load Test MCQ: Basic Computing' });
  if (!mcqQuestion) {
    mcqQuestion = await Question.create({
      title: 'Load Test MCQ: Basic Computing',
      description: 'Which of the following is an interpreted programming language?',
      type: 'MCQ',
      marks: 5,
      options: [{ text: 'Python' }, { text: 'C' }, { text: 'C++' }, { text: 'Assembly' }],
      correctAnswer: 0,
      allowCodeRun: false,
      isPublished: true,
      createdBy: admin._id,
    });
  }

  // 3. Create active test Exam
  const now = new Date();
  const startDate = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours ahead

  let exam = await Exam.findOne({ title: 'Load Testing Assessment - 100 Students' });
  if (exam) {
    exam.startDate = startDate;
    exam.endDate = endDate;
    exam.isPublished = true;
    exam.allowCodeRun = true;
    exam.status = 'ACTIVE';
    exam.passingMarks = 6;
    await exam.save();
  } else {
    exam = await Exam.create({
      title: 'Load Testing Assessment - 100 Students',
      description: 'Automated high-concurrency performance benchmark exam',
      duration: 120,
      totalMarks: 15,
      passingMarks: 6,
      status: 'ACTIVE',
      startDate,
      endDate,
      isPublished: true,
      allowCodeRun: true,
      organization: ORG_NAME,
      technology: TECH_NAME,
      batches: [BATCH_NAME],
      createdBy: admin._id,
      questions: [
        { questionId: codingQuestion._id, marks: 10, allowCodeRun: true },
        { questionId: mcqQuestion._id, marks: 5, allowCodeRun: false },
      ],
    });
  }

  // 4. Batch create or update the N student accounts
  console.log(`👤 [Setup] Ensuring ${USER_COUNT} student accounts in DB...`);
  const studentDocs = [];
  const existingCount = await User.countDocuments({
    email: { $regex: /^loadtest_student_\d+@skillcodex\.tech$/ },
  });

  if (existingCount < USER_COUNT) {
    const existingUsers = await User.find({
      email: { $regex: /^loadtest_student_\d+@skillcodex\.tech$/ },
    }).select('email');
    const existingSet = new Set(existingUsers.map((u) => u.email));

    for (let i = 1; i <= USER_COUNT; i++) {
      const email = `loadtest_student_${i}@skillcodex.tech`;
      if (!existingSet.has(email)) {
        studentDocs.push({
          name: `LoadTest Student ${i}`,
          studentId: `LTSTU${String(i).padStart(4, '0')}`,
          email,
          passwordHash,
          role: 'USER',
          organization: ORG_NAME,
          technology: TECH_NAME,
          batch: BATCH_NAME,
          isActive: true,
          isVerified: true,
          createdBy: admin._id,
        });
      }
    }

    if (studentDocs.length > 0) {
      await User.insertMany(studentDocs);
      console.log(`   Created ${studentDocs.length} new test student accounts.`);
    }
  } else {
    console.log(`   Found ${existingCount} test students already prepared.`);
  }

  // Clear any existing attempts for this load-test exam so tests start completely clean
  await ExamAttempt.deleteMany({ examId: exam._id });
  await Submission.deleteMany({ examId: exam._id });

  console.log(`✅ [Setup] Ready: Exam ID = ${exam._id}, Coding Q = ${codingQuestion._id}, MCQ Q = ${mcqQuestion._id}`);
  await mongoose.disconnect();

  return {
    examId: exam._id.toString(),
    codingQuestionId: codingQuestion._id.toString(),
    mcqQuestionId: mcqQuestion._id.toString(),
  };
}

// ---------------------------------------------------------------------------
// 2. High-Concurrency API Test Runner
// ---------------------------------------------------------------------------
async function runLoadTest(testMeta) {
  console.log(`\n========================================================================`);
  console.log(`🚀 STARTING CONCURRENT LOAD TEST ON: ${TARGET_URL}`);
  console.log(`👥 VIRTUAL STUDENTS CONCURRENCY: ${USER_COUNT}`);
  console.log(`========================================================================\n`);

  const students = Array.from({ length: USER_COUNT }, (_, idx) => ({
    id: idx + 1,
    email: `loadtest_student_${idx + 1}@skillcodex.tech`,
    studentId: `LTSTU${String(idx + 1).padStart(4, '0')}`,
    password: TEST_PASSWORD,
    token: null,
    attemptId: null,
  }));

  const report = {};

  // -----------------------------------------------------------------------
  // STAGE 1: 100 Simultaneous Logins (POST /api/auth/login)
  // -----------------------------------------------------------------------
  console.log(`🔥 [Stage 1/5] Hitting /api/auth/login with ${USER_COUNT} simultaneous requests...`);
  const stage1Start = performance.now();
  const stage1Results = await Promise.all(
    students.map(async (student) => {
      const t0 = performance.now();
      try {
        const res = await fetch(`${TARGET_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: student.email,
            password: student.password,
          }),
        });
        const duration = performance.now() - t0;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.data?.accessToken) {
          student.token = data.data.accessToken;
          return { success: true, duration, status: res.status };
        }
        return { success: false, duration, status: res.status, error: data?.message || res.statusText };
      } catch (err) {
        return { success: false, duration: performance.now() - t0, status: 0, error: err.message };
      }
    })
  );
  const stage1TotalTime = (performance.now() - stage1Start) / 1000;
  report.login = processStageResults('1. Concurrent Login (POST /api/auth/login)', stage1Results, stage1TotalTime);

  // Check if logins succeeded
  const loggedInCount = students.filter((s) => s.token).length;
  if (loggedInCount === 0) {
    console.error('\n❌ Fatal: All 100 login requests failed. Check if server is running or if rate limiting is enabled.');
    return report;
  }

  // -----------------------------------------------------------------------
  // STAGE 2: 100 Simultaneous Exam Starts (POST /api/exams/:id/start)
  // -----------------------------------------------------------------------
  console.log(`\n🔥 [Stage 2/5] Hitting /api/exams/${testMeta.examId}/start with ${USER_COUNT} simultaneous requests...`);
  const stage2Start = performance.now();
  const stage2Results = await Promise.all(
    students.map(async (student) => {
      if (!student.token) return { success: false, duration: 0, status: 401, error: 'No token' };
      const t0 = performance.now();
      try {
        const res = await fetch(`${TARGET_URL}/api/exams/${testMeta.examId}/start`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student.token}`,
          },
        });
        const duration = performance.now() - t0;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.data?._id) {
          student.attemptId = data.data._id;
          return { success: true, duration, status: res.status };
        }
        return { success: false, duration, status: res.status, error: data?.message || res.statusText };
      } catch (err) {
        return { success: false, duration: performance.now() - t0, status: 0, error: err.message };
      }
    })
  );
  const stage2TotalTime = (performance.now() - stage2Start) / 1000;
  report.examStart = processStageResults('2. Concurrent Exam Start (POST /api/exams/:id/start)', stage2Results, stage2TotalTime);

  // -----------------------------------------------------------------------
  // STAGE 3: 100 Simultaneous Code Runs (POST /api/exams/:id/run-code)
  // -----------------------------------------------------------------------
  console.log(`\n🔥 [Stage 3/5] Hitting /api/exams/${testMeta.examId}/run-code with ${USER_COUNT} simultaneous Docker executions...`);
  const stage3Start = performance.now();
  const stage3Results = await Promise.all(
    students.map(async (student) => {
      if (!student.token) return { success: false, duration: 0, status: 401, error: 'No token' };
      const t0 = performance.now();
      try {
        const res = await fetch(`${TARGET_URL}/api/exams/${testMeta.examId}/run-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student.token}`,
          },
          body: JSON.stringify({
            questionId: testMeta.codingQuestionId,
            language: 'python',
            sourceCode: SAMPLE_PYTHON_CODE,
            customInput: '45 55\n',
          }),
        });
        const duration = performance.now() - t0;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.success) {
          return { success: true, duration, status: res.status };
        }
        return { success: false, duration, status: res.status, error: data?.message || res.statusText };
      } catch (err) {
        return { success: false, duration: performance.now() - t0, status: 0, error: err.message };
      }
    })
  );
  const stage3TotalTime = (performance.now() - stage3Start) / 1000;
  report.codeRun = processStageResults('3. Concurrent Code Run (POST /api/exams/:id/run-code)', stage3Results, stage3TotalTime);

  // -----------------------------------------------------------------------
  // STAGE 4: 100 Simultaneous Exam Submissions (POST /api/exams/:id/submit)
  // -----------------------------------------------------------------------
  console.log(`\n🔥 [Stage 4/5] Hitting /api/exams/${testMeta.examId}/submit with ${USER_COUNT} simultaneous full submissions...`);
  const stage4Start = performance.now();
  const stage4Results = await Promise.all(
    students.map(async (student) => {
      if (!student.token || !student.attemptId) {
        return { success: false, duration: 0, status: 400, error: 'No active attempt' };
      }
      const t0 = performance.now();
      try {
        const res = await fetch(`${TARGET_URL}/api/exams/${testMeta.examId}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${student.token}`,
          },
          body: JSON.stringify({
            attemptId: student.attemptId,
            answers: [
              {
                questionId: testMeta.codingQuestionId,
                language: 'python',
                code: SAMPLE_PYTHON_CODE,
              },
              {
                questionId: testMeta.mcqQuestionId,
                selectedOption: 0,
              },
            ],
          }),
        });
        const duration = performance.now() - t0;
        const data = await res.json().catch(() => ({}));
        if (res.ok && data?.success) {
          return { success: true, duration, status: res.status };
        }
        return { success: false, duration, status: res.status, error: data?.message || res.statusText };
      } catch (err) {
        return { success: false, duration: performance.now() - t0, status: 0, error: err.message };
      }
    })
  );
  const stage4TotalTime = (performance.now() - stage4Start) / 1000;
  report.submission = processStageResults('4. Concurrent Submissions (POST /api/exams/:id/submit)', stage4Results, stage4TotalTime);

  // -----------------------------------------------------------------------
  // STAGE 5: Evaluation Queue Drain & Completion Monitoring
  // -----------------------------------------------------------------------
  console.log(`\n⏳ [Stage 5/5] Monitoring Docker evaluation worker processing all ${USER_COUNT} submissions...`);
  const evalStart = performance.now();
  let evaluatedCount = 0;
  let pollAttempts = 0;
  const maxPolls = 60; // Up to 2 minutes max

  while (pollAttempts < maxPolls) {
    await new Promise((r) => setTimeout(r, 2000));
    pollAttempts++;

    // Check statuses using one of the student tokens
    const sampleStudent = students.find((s) => s.token && s.attemptId);
    if (!sampleStudent) break;

    // Direct check via MongoDB if running locally
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 5000 }).catch(() => {});
    }

    if (mongoose.connection.readyState === 1) {
      evaluatedCount = await ExamAttempt.countDocuments({
        examId: testMeta.examId,
        status: 'EVALUATED',
      });
      const evaluatingCount = await ExamAttempt.countDocuments({
        examId: testMeta.examId,
        status: { $in: ['EVALUATING', 'SUBMITTED'] },
      });
      process.stdout.write(`\r   Progress: [${evaluatedCount}/${USER_COUNT}] Evaluated (${evaluatingCount} in worker queue)...`);
      if (evaluatedCount >= USER_COUNT || evaluatingCount === 0) {
        break;
      }
    } else {
      // Fallback via API call
      process.stdout.write(`\r   Polling evaluation queue (attempt ${pollAttempts}/${maxPolls})...`);
      break;
    }
  }

  const evalTotalTime = Math.round((performance.now() - evalStart) / 1000);
  console.log(`\n✅ Evaluation Queue Finished: ${evaluatedCount}/${USER_COUNT} evaluated in ${evalTotalTime}s!`);
  report.evaluation = {
    totalEvaluated: evaluatedCount,
    totalTimeSec: evalTotalTime,
    avgSecPerSubmission: evaluatedCount > 0 ? (evalTotalTime / evaluatedCount).toFixed(2) : 0,
  };

  // -----------------------------------------------------------------------
  // Print Benchmark Summary Report
  // -----------------------------------------------------------------------
  printBenchmarkSummary(report);
  return report;
}

function processStageResults(stageName, results, totalTimeSec) {
  const successes = results.filter((r) => r.success);
  const failures = results.filter((r) => !r.success);
  const latencies = results.map((r) => r.duration);
  const stats = calculateStats(latencies);
  const rps = (results.length / (totalTimeSec || 0.001)).toFixed(1);

  // Group status codes
  const statusCodes = {};
  results.forEach((r) => {
    statusCodes[r.status] = (statusCodes[r.status] || 0) + 1;
  });

  const failureReasons = {};
  failures.forEach((f) => {
    failureReasons[f.error] = (failureReasons[f.error] || 0) + 1;
  });

  return {
    stageName,
    total: results.length,
    successCount: successes.length,
    failureCount: failures.length,
    successRate: `${((successes.length / results.length) * 100).toFixed(1)}%`,
    totalTimeSec: totalTimeSec.toFixed(2),
    rps,
    stats,
    statusCodes,
    failureReasons,
  };
}

function printBenchmarkSummary(report) {
  console.log(`\n========================================================================`);
  console.log(`📊 LOAD TEST BENCHMARK REPORT (100 CONCURRENT USERS)`);
  console.log(`========================================================================\n`);

  const stages = [report.login, report.examStart, report.codeRun, report.submission].filter(Boolean);

  console.log(`+-------------------------------------+--------+--------+---------+--------+--------+--------+--------+`);
  console.log(`| Stage                               | Pass   | Fail   | Pass %  | Min ms | Avg ms | P95 ms | Req/s  |`);
  console.log(`+-------------------------------------+--------+--------+---------+--------+--------+--------+--------+`);

  stages.forEach((s) => {
    const name = s.stageName.padEnd(35).slice(0, 35);
    const pass = String(s.successCount).padStart(6);
    const fail = String(s.failureCount).padStart(6);
    const rate = String(s.successRate).padStart(7);
    const min = String(s.stats.min).padStart(6);
    const avg = String(s.stats.avg).padStart(6);
    const p95 = String(s.stats.p95).padStart(6);
    const rps = String(s.rps).padStart(6);
    console.log(`| ${name} | ${pass} | ${fail} | ${rate} | ${min} | ${avg} | ${p95} | ${rps} |`);
  });
  console.log(`+-------------------------------------+--------+--------+---------+--------+--------+--------+--------+`);

  if (report.evaluation) {
    console.log(`\n⚡ Code Evaluation Throughput:`);
    console.log(`   - Completed: ${report.evaluation.totalEvaluated} submissions`);
    console.log(`   - Total Queue Drain Time: ${report.evaluation.totalTimeSec} seconds`);
    console.log(`   - Average Time per Code Evaluation: ${report.evaluation.avgSecPerSubmission}s / submission`);
  }

  // Bottleneck & Health Diagnostic
  console.log(`\n🔍 System Diagnostic & Bottleneck Analysis:`);
  let has429 = false;
  let has503 = false;
  let has500 = false;

  stages.forEach((s) => {
    if (s.statusCodes[429]) has429 = true;
    if (s.statusCodes[503]) has503 = true;
    if (s.statusCodes[500]) has500 = true;
  });

  if (has429) {
    console.log(`   ⚠️ HTTP 429 Detected: Rate limiting throttled requests from this IP.`);
    console.log(`      Fix: Set DISABLE_RATE_LIMIT=true in backend/.env during load testing.`);
  } else {
    console.log(`   ✅ Rate Limiting: Passed without throttling.`);
  }

  if (has503) {
    console.log(`   ⚠️ HTTP 503 Detected: Docker execution pool queue reached high-load protection threshold.`);
    console.log(`      Fix: Increase JOBS_PER_CONTAINER or MAX_EXECUTION_QUEUE_SIZE in backend/.env.`);
  } else {
    console.log(`   ✅ Container Queue Capacity: Handled concurrent queue load.`);
  }

  if (!has500) {
    console.log(`   ✅ Server Stability: 0 Internal Server Errors (500) recorded.`);
  }

  console.log(`\n========================================================================\n`);
}

// ---------------------------------------------------------------------------
// 3. Database Cleanup
// ---------------------------------------------------------------------------
async function cleanupTestData() {
  console.log(`\n🧹 [Cleanup] Removing load-test artifacts and student accounts...`);
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 5000 }).catch(() => {});
  }
  if (mongoose.connection.readyState === 1) {
    const exam = await Exam.findOne({ title: 'Load Testing Assessment - 100 Students' });
    if (exam) {
      await ExamAttempt.deleteMany({ examId: exam._id });
      await Submission.deleteMany({ examId: exam._id });
      await Exam.deleteOne({ _id: exam._id });
    }
    await User.deleteMany({
      email: { $regex: /^loadtest_student_\d+@skillcodex\.tech$/ },
    });
    console.log(`✅ [Cleanup] Complete! Cleaned up test students, attempts, and exam.`);
    await mongoose.disconnect();
  }
}

// ---------------------------------------------------------------------------
// Main Entrypoint
// ---------------------------------------------------------------------------
async function main() {
  let testMeta = { examId: null, codingQuestionId: null, mcqQuestionId: null };

  try {
    if (DO_SETUP) {
      testMeta = await setupTestData();
    } else {
      // Find existing test exam
      await mongoose.connect(config.mongo.uri, { serverSelectionTimeoutMS: 5000 });
      const exam = await Exam.findOne({ title: 'Load Testing Assessment - 100 Students' });
      if (exam) {
        testMeta.examId = exam._id.toString();
        const coding = exam.questions.find((q) => q.allowCodeRun);
        const mcq = exam.questions.find((q) => !q.allowCodeRun);
        testMeta.codingQuestionId = coding?.questionId?.toString() || '';
        testMeta.mcqQuestionId = mcq?.questionId?.toString() || '';
      }
      await mongoose.disconnect();
    }

    if (DO_RUN && testMeta.examId) {
      await runLoadTest(testMeta);
    }

    if (DO_CLEANUP) {
      await cleanupTestData();
    }
  } catch (err) {
    console.error(`\n❌ Error during load test: ${err.message}`, err);
    process.exit(1);
  }
}

main();
