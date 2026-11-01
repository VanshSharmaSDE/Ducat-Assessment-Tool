# SkillCodex — Executive Analytics, Supervision & Faculty Mobile App

A high-performance React Native Android application built exclusively for **Executive Platform Analytics**, **Assessment Results Deep Analysis**, **Exam Supervision**, and **Faculty Management & Creation**.

It directly connects to the existing Node.js & Express backend (`PORT 5000`) with identical API schemas, featuring **all the filters from the web portal** and a native mobile design.

---

## 🎯 Scope & Core Modules

### 1. 📊 Executive Analytics & Live Telemetry
- Consolidated KPI cards (Submissions, Cohort Average Score, Pass Ratio, Anti-Cheat Violations, Enrolled Candidates, Live Exams, Active Cohorts, Faculty Count).
- Visual outcomes breakdown (Passed vs Failed ratio meter).
- Submissions breakdown by programming language (Python, JavaScript, Java, C++, SQL).
- Recent candidate submissions live feed with pull-to-refresh.

### 2. 🏆 Results Deep Analysis & Code Inspection (All Web Filters Included)
- **All 6 Web Filter Dimensions**:
  1. **Status**: All, Passed, Failed, Ongoing (In-Progress), Pending (Evaluating), Terminated.
  2. **Examination**: Filter by any specific examination.
  3. **Technology Stack**: Filter by candidate's registered technology.
  4. **Cohort / Batch**: Filter by academic batch.
  5. **Submission Language**: Filter by programming language (`python`, `javascript`, `java`, `cpp`, `sql`).
  6. **Gender**: Filter by candidate gender.
  7. **Candidate Search**: Instant search by Student Name, Roll ID, or Email.
- **Deep Code & Audit Inspection**:
  - Question-by-question breakdown.
  - Candidate's submitted source code in clean monospace viewer with character/length telemetry.
  - Testcases passed vs failed (e.g. `3 / 3 Testcases Passed`).
  - Anti-cheat timeline (tab switch violations and proctoring events).
- **Proctoring Actions**:
  - **Allow Retake**: Resets attempt so student can retake the assessment.
  - **Terminate Attempt**: Instantly halts an active in-progress assessment.

### 3. 📝 Examinations Supervision (Read-Only Inspection)
- Inspect all published and draft exams.
- Filters:
  - Status tabs: `ALL`, `ACTIVE`, `UPCOMING`, `COMPLETED`, `DRAFT`.
  - Type chips: `ALL`, `CODING`, `MCQ`, `HYBRID`.
  - Cohort / Batch filter.
  - Search by Title or Exam Code.
- **Exam Inspection Details Modal**:
  - Code, duration, pass score percentage, total marks, start and end windows.
  - Full instructions.
  - Anti-cheat rules (Fullscreen enforcement, Webcam proctoring, Tab switch thresholds).
  - Attached problems list with difficulty and marks.
- **Supervisory Controls**: Duplicate exam, Delete exam, Publish/Draft status.
*(Creation of exams and students is disabled as requested).*

### 4. 👨‍🏫 Faculty Management & Creation
- Full roster of instructors and departments.
- Status filters: `ALL`, `ACTIVE`, `INACTIVE`.
- Search by name, employee ID, email, or department.
- **Create Faculty Modal (FAB `+`)**:
  - Instructor Full Name.
  - Faculty / Employee ID.
  - Email and Password.
  - Department and Phone.
  - Affiliated Organization (picker from system organizations).
  - Teaching technologies (comma-separated tags).
- One-tap status toggle (Activate / Deactivate) and deletion controls.

### 5. ⚙️ Control Hub & Settings
- Active Server Endpoint Manager (Android Emulator `10.0.2.2:5000`, Localhost, Wi-Fi LAN IP, Production VPS).
- Live latency ping tester.
- Admin Profile summary.
- Secure Sign Out.

---

## 🚀 How to Run

1. **Start Backend**:
   ```powershell
   cd backend
   npm run dev
   ```

2. **Start Mobile App**:
   ```powershell
   cd mobile-admin
   npm start
   ```

3. **Open on Device**:
   - Press <kbd>a</kbd> for Android Emulator.
   - Scan QR code using **Expo Go** on any physical Android device.
   - Press <kbd>w</kbd> for web preview.
