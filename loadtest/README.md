# 🚀 Backend High-Concurrency Load Testing Guide (100 Students)

This guide provides everything you need to simulate **100 students simultaneously** executing:
1. **Login API** (`POST /api/auth/login`)
2. **Exam Start API** (`POST /api/exams/:id/start`)
3. **Code Run API** (`POST /api/exams/:id/run-code` inside Docker warm container pool)
4. **Final Submission API** (`POST /api/exams/:id/submit`)
5. **Code Evaluation Engine** (end-to-end queue drain and scoring)

---

## ⚡ Method 1: Built-in Automated Runner (Recommended)

A fully automated, self-contained test suite is included in the project. It requires **zero extra tools** and handles user seeding, simultaneous token generation, concurrent execution, metric collection, and cleanup.

### 1. Enable High Concurrency in `backend/.env`
Before running the benchmark with 100 students from a single IP, ensure your backend rate limiter doesn't throttle the requests:

```env
# In backend/.env
DISABLE_RATE_LIMIT=true
MAX_EXECUTION_QUEUE_SIZE=500
JOBS_PER_CONTAINER=8
```

### 2. Run the 100-User Load Test (Localhost)
In the project root, run:

```powershell
npm run loadtest --prefix backend -- --all
```
*This command automatically:*
1. Connects to MongoDB and sets up 100 test students (`loadtest_student_1@skillcodex.tech` through `100`).
2. Creates an active test exam with a Coding question and an MCQ question.
3. Fires all 100 logins at the exact same millisecond.
4. Starts the exam for all 100 students concurrently.
5. Sends 100 simultaneous code executions to the warm Docker container pool.
6. Submits all 100 exams concurrently.
7. Monitors the evaluation queue until all 100 students are graded.
8. Prints a complete latency breakdown table (Min, Avg, P50, P95, P99, RPS) and cleans up the test data.

### 3. Run Against Your Production VPS
You can point the test suite to your live VPS backend (`https://api.skillcodex.tech`):

```powershell
node backend/src/scripts/loadTest.js --target=https://api.skillcodex.tech --users=100
```

---

## 🛠️ CLI Flags & Customizations

| Flag | Default | Description |
|---|---|---|
| `--users=N` | `100` | Number of simultaneous concurrent virtual students |
| `--target=URL` | `http://localhost:5000` | Target backend URL (e.g. `https://api.skillcodex.tech`) |
| `--setup` | - | Only create the 100 student accounts and test exam |
| `--run` | - | Only execute the concurrent test stages |
| `--cleanup` | - | Delete all test users, test exam, attempts, and submissions |
| `--keep` | - | Retain test users in DB after test completion |

---

## 📈 Key Tuning Parameters for 100 Concurrent Students

When 100 students submit code at the same time, the backend handles CPU-intensive compilation and execution. Here are the 4 settings to tune in `backend/.env`:

1. **`JOBS_PER_CONTAINER` (Default: `4`, Recommended: `8` - `10`)**
   - Number of parallel code executions running inside each warm Docker container.
2. **`MAX_EXECUTION_QUEUE_SIZE` (Default: `500`)**
   - Maximum queue depth before returning HTTP 503 high-load protection.
3. **`CONTAINERS_PER_LANGUAGE` (Default: `1`, Recommended: `2` or `3` for busy languages)**
   - Scales the number of warm Docker containers running in parallel (e.g. `PYTHON_CONTAINERS=2`).
4. **`maxPoolSize: 100` in MongoDB**
   - Configured in `backend/src/config/db.js` so 100 simultaneous DB queries never wait on connection sockets.
