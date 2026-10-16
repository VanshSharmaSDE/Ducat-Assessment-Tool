import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 Load Testing Script for CodeAssess / SkillCodex Platform
 * Simulates 100 concurrent students hitting:
 * 1. Login (/api/auth/login)
 * 2. Exam Details & Start (/api/exams/:id/start)
 * 3. Code Run (/api/exams/:id/run-code)
 * 4. Submission & Evaluation (/api/exams/:id/submit)
 *
 * How to run:
 *   k6 run --vus 100 --duration 1m loadtest/k6-script.js
 * Or with custom URL:
 *   k6 run -e TARGET_URL=https://api.skillcodex.tech -e EXAM_ID=YOUR_EXAM_ID loadtest/k6-script.js
 */

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Ramp-up to 50 users
    { duration: '30s', target: 100 }, // Ramp-up to 100 concurrent users
    { duration: '20s', target: 100 }, // Stay at 100 concurrent users
    { duration: '10s', target: 0 },   // Ramp-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],     // Error rate should be below 5%
    http_req_duration: ['p(95)<3000'],  // 95% of requests should respond under 3s
  },
};

const BASE_URL = __ENV.TARGET_URL || 'http://localhost:5000';
const EXAM_ID = __ENV.EXAM_ID || '';
const QUESTION_ID = __ENV.QUESTION_ID || '';

export default function () {
  const userId = (__VU % 100) + 1;
  const email = `loadtest_student_${userId}@skillcodex.tech`;
  const password = 'LoadTest@Password2026!';

  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ identifier: email, password }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });

  const body = loginRes.json();
  const token = body?.data?.accessToken;
  if (!token) return;

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  if (!EXAM_ID) {
    sleep(1);
    return;
  }

  // 2. Start Exam Attempt
  const startRes = http.post(`${BASE_URL}/api/exams/${EXAM_ID}/start`, {}, { headers: authHeaders });
  check(startRes, {
    'exam start status is 200': (r) => r.status === 200 || r.status === 400, // 400 if already started
  });

  const attemptId = startRes.json()?.data?._id;

  // 3. Run Custom Code
  if (QUESTION_ID) {
    const runRes = http.post(
      `${BASE_URL}/api/exams/${EXAM_ID}/run-code`,
      JSON.stringify({
        questionId: QUESTION_ID,
        language: 'python',
        sourceCode: 'import sys\nprint("Hello from 100 concurrent students!")',
        customInput: '',
      }),
      { headers: authHeaders }
    );
    check(runRes, {
      'code run status is 200': (r) => r.status === 200,
    });
  }

  // 4. Submit Exam
  if (attemptId && QUESTION_ID) {
    const submitRes = http.post(
      `${BASE_URL}/api/exams/${EXAM_ID}/submit`,
      JSON.stringify({
        attemptId,
        answers: [
          {
            questionId: QUESTION_ID,
            language: 'python',
            code: 'import sys\nprint(42)',
          },
        ],
      }),
      { headers: authHeaders }
    );
    check(submitRes, {
      'submit status is 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}
