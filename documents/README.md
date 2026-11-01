# Ducat Assessment Tool (CDT) - Documentation Library

Welcome to the official, comprehensive documentation suite for the **Ducat Coding & Assessment Tool (CDT)**. This directory contains end-to-end operational manuals, architectural blueprints, developer guides, and API specifications for students, faculty, administrators, system architects, and DevOps engineers.

---

## Documentation Library Navigation

The documentation is organized into two master volumes and supplementary references:

### 1. [Master User Manual (All Dashboards & Features)](file:///c:/Users/vansh/OneDrive/Desktop/CDT-Production/documents/USER_MANUAL_ALL_DASHBOARDS.md)
**Target Audience**: Students, Candidates, Faculty Instructors, Department Heads, Academic Administrators, and Accreditation Officers.
- **Role-Based Portals**: Navigation and capabilities for Super Admin (`ADMIN`), Faculty (`FACULTY`), and Student (`STUDENT`).
- **Security & Authentication**: 2-Hour inactivity timeout, Single Active Session rotation, and device policy verification.
- **Candidate Assessment Journey**:
  - Available scheduled assessments and self-paced Practice Arena.
  - Pre-exam verification, instructions, and honor code agreement.
  - **Persistent Ongoing Exam Lockdown**: Automatic session recovery across browser restarts/tab reloads, back-button and exit interception, continuous answer autosave.
  - Fullscreen Monaco editor environment, live multi-language compiler runner, question palette, and anti-cheating violation monitors.
- **Assessment Creation & Management**:
  - 4-Step Guided Exam Creation Wizard with audience scoping (Organization, Technology, Batches).
  - **Local AI Exam Generator (`/admin/exams/ai-generator`)**: End-to-end paper synthesis with local Ollama LLMs, 10-minute generation timeout, progress estimation pipeline, and **full pre-save check & edit workbench**.
- **Question Bank Management**:
  - Coding Question Builder (Mandatory at least 1 public + 1 hidden testcase rule; SQL zero-testcase exemption).
  - **Standalone AI Coding Question Generator Modal**: Step-by-step problem generation with pre-save editor and automatic language normalization.
  - MCQ Question Builder with dynamic options and explanations.
  - **Standalone AI MCQ Question Generator Modal**: Automated 4-option generation with pre-save editor.
  - Bulk Excel Question Import with line-by-line validation error reports.
- **Academic Administration**:
  - User and candidate provisioning, student password resets, bulk candidate spreadsheet ingestion.
  - Dedicated Faculty Management with multi-technology and multi-organization assignment.
  - Academic hierarchy: Organizations, Technologies, and Batch isolation.
- **Results, Scorecards & Institutional Intelligence**:
  - Detailed student scorecard breakdown, runtime/memory telemetry, testcase statuses, and PDF export.
  - **Individual Candidate AI Review Modal**: Code quality analysis, logical bug diagnosis, and personalized learning roadmaps.
  - **AI Cohort Performance Analysis & Institutional Intelligence Suite**:
    - Filter-scoped cohort intelligence (Exam, Technology, Batch, Gender, Result Status).
    - Batch-by-Batch and Technology comparative performance tables.
    - Talent Readiness Matrix (Ready for Placement vs. Remediation Required).
    - At-Risk Remediation Roster for students scoring below benchmark.
    - **100% Local Ephemeral Privacy & Data-Cut Mechanism**: On-premise processing with instant data purge.
    - **Institutional Accreditation Print Dossier**: Formal printable dossier with executive summaries and sign-off blocks (HOD, Dean, IQAC).
- **Troubleshooting & FAQs**: Solutions for common client and administrative scenarios.

---

### 2. [Developer Architecture Bible & Codebase Book](file:///c:/Users/vansh/OneDrive/Desktop/CDT-Production/documents/DEVELOPER_ARCHITECTURE_AND_CODEBASE_BOOK.md)
**Target Audience**: Software Engineers, System Architects, DevOps Engineers, and Open-Source Contributors.
- **Core System Architecture**: Micro-services/monolith hybrid architecture, zero-trust execution, and asynchronous evaluation pipeline.
- **Complete Technology Stack**: Node.js, Express, React, Vite, Tailwind CSS, Monaco Editor, MongoDB/Mongoose, Redis BullMQ, Docker Engine, Socket.io, and Local Ollama LLM.
- **Global Directory Map**: Complete filesystem layout of the backend, frontend, docker sandboxes, and documentation.
- **Backend Codebase (Exhaustive File-by-File Breakdown)**:
  - Entry points: `server.js` and `socket.js` (WebSockets & real-time proctoring).
  - Config files: `db.js` and `index.js`.
  - 13 Mongoose Database Models: `User`, `Exam`, `ExamAttempt`, `Question`, `TestCase`, `Submission`, `SubmissionResult`, `ExecutionJob`, `Organization`, `Technology`, `Batch`, `AuditLog`, `RefreshToken`.
  - 11 Controllers: Detailed function signatures and operational responsibilities (including `aiController.js`, `adminController.js`, `examController.js`, `resultController.js`, etc.).
  - 10 Business Services: In-depth logic analysis (including `ollamaService.js`, `examService.js`, `questionService.js`, `resultService.js`, `adminService.js`, etc.).
  - Docker Sandbox Execution Engine: `DockerExecutionService.js`, container pre-warming pool, and all 6 language Dockerfiles (C, C++, Java, Python, JavaScript, SQL).
  - Background Evaluation Subsystem: Redis BullMQ queues (`queueManager.js`) and worker thread (`evaluationWorker.js`).
  - Middlewares: JWT authentication, role guards (`requireAdmin`, `requireFaculty`), rate limiters, multer uploads, schema validators, and global error handlers.
  - Express API Routes: Complete endpoint map across `/api/auth`, `/api/admin`, `/api/exams`, `/api/questions`, `/api/results`, `/api/users`.
  - Database seeders, utilities, output comparators, and language templates.
- **Frontend Codebase (Exhaustive Breakdown)**:
  - React application core, route configuration in `App.jsx`, and route guard wrappers.
  - Context Providers: `AuthContext.jsx` (2-hour inactivity monitor & active exam lock), `ModalContext.jsx`, `SocketContext.jsx`, `ThemeContext.jsx`.
  - Global Axios client (`axios.js`) with automatic JWT refresh and global HTTP error modal dispatchers.
  - Layout wrappers: `AdminLayout.jsx`, `UserLayout.jsx`, `ExamLayout.jsx`.
  - All 11 Candidate Pages and all 15 Administrator/Faculty Pages.
  - All Admin UI Modals: `AiResultsAnalysisModal.jsx`, `AiCandidateReviewModal.jsx`, `AiCodingQuestionModal.jsx`, `AiMcqQuestionModal.jsx`, `AiGenerationProgress.jsx`, `OllamaGuideCard.jsx`.
  - Frontend utilities: `resultPdfGenerator.js`, `imageUrl.js`, and `ErrorBoundary.jsx`.
- **Local Ollama AI Engine Architecture**:
  - Local daemon communication protocol (`http://127.0.0.1:11434`).
  - Resilient `tryRepairJson` parser repairing unquoted keys, single quotes, and truncated braces from small local models.
  - Automatic language normalizer preventing unsupported AI languages.
  - 10-Minute timeout architecture and real-time generation progress estimation.
  - Ephemeral in-memory privacy guarantee and data-cut mechanism.
- **Persistent Exam Session & Lockdown Architecture**:
  - Active session detection on login and route changes (`/api/exams/active-session`).
  - Front-end route locking in `App.jsx` preventing student navigation away from ongoing exams.
  - Browser navigation interception (`popstate`, `beforeunload`, `localStorage` autosave, `/api/exams/:id/save-progress`).
- **Multi-Language Docker Sandbox Engine**: Container security flags, timeout enforcement, memory limits, and STDOUT/STDERR isolation.
- **Developer Extension Playbook**:
  - How to add a new programming language (e.g., Go, Rust).
  - How to add a new question type.
  - How to configure local or remote Ollama models.
  - How to modify grading algorithms and partial scoring rules.
  - Full Ubuntu 22.04+ Production VPS Deployment Guide.

---

## Quick Reference Document Index

| Volume | File Path | Focus Area | Primary Audience |
| :--- | :--- | :--- | :--- |
| **Master User Manual** | [`USER_MANUAL_ALL_DASHBOARDS.md`](file:///c:/Users/vansh/OneDrive/Desktop/CDT-Production/documents/USER_MANUAL_ALL_DASHBOARDS.md) | Operations, exam creation, AI generation, proctoring, scorecards, and institutional accreditation dossiers. | Instructors, Students, Academic Admins, Faculty |
| **Developer Architecture Book** | [`DEVELOPER_ARCHITECTURE_AND_CODEBASE_BOOK.md`](file:///c:/Users/vansh/OneDrive/Desktop/CDT-Production/documents/DEVELOPER_ARCHITECTURE_AND_CODEBASE_BOOK.md) | Technical architecture, file-by-file code tour, AI subsystem, Docker sandbox, and extension playbook. | Software Engineers, Architects, DevOps |

---

*Ducat Assessment Tool (CDT) &bull; Production Enterprise Release Documentation*
