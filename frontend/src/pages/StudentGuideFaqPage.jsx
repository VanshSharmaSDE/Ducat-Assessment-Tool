import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle,
  Laptop,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Terminal,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from 'lucide-react';

export default function StudentGuideFaqPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'RULES' | 'GUIDE' | 'FAQ'
  const [openFaqIndex, setOpenFaqIndex] = useState(null);

  const toggleFaq = (idx) => {
    setOpenFaqIndex(openFaqIndex === idx ? null : idx);
  };

  const faqList = [
    {
      category: 'Exam & Proctoring',
      question: 'What happens if my internet connection drops during an active exam?',
      answer:
        'Your code and answered MCQs are autosaved in real-time. If your connection temporarily drops, do NOT panic. Simply restore your network connection, refresh the browser window, and re-enter fullscreen mode before the countdown timer expires. Your session and saved progress will resume automatically.',
    },
    {
      category: 'Exam & Proctoring',
      question: 'Why was my exam attempt marked as TERMINATED instead of FAIL?',
      answer:
        'An exam attempt is stamped as TERMINATED when the proctoring security system records violations exceeding the allowed limit (e.g. repeated tab switching, leaving fullscreen mode, opening developer tools) or when an administrator manually terminates the session. When terminated, the candidate is locked out immediately and the termination reason is logged permanently in the performance report.',
    },
    {
      category: 'Exam & Proctoring',
      question: 'Can I retake an exam if I was terminated or faced a technical glitch?',
      answer:
        'Yes, but retakes require administrative authorization. Your faculty instructor or exam administrator can review your evaluation dossier and grant an official "Allow Retake" permission from the Admin Control Center. Once authorized, the assessment becomes active again in your Available Exams tab.',
    },
    {
      category: 'Exam & Proctoring',
      question: 'Can I use a second monitor, external display, or split screens during the test?',
      answer:
        'No. Dual monitors and split-window configurations are strictly prohibited by our proctoring rules. The exam must be taken in dedicated fullscreen mode on a single primary monitor. The browser monitors screen dimensions and window focus; moving your cursor or focus outside the exam window logs a proctoring violation.',
    },
    {
      category: 'Exam & Proctoring',
      question: 'Can I take the exam on a mobile phone or tablet?',
      answer:
        'No. CodeAssess is an enterprise-grade programming evaluation environment. Assessments require an interactive code editor, multi-language compilers, keyboard shortcuts, and secure fullscreen proctoring. A laptop or desktop computer with a display width of at least 1024px is mandatory.',
    },
    {
      category: 'Code Execution & Grading',
      question: 'How are my coding solutions evaluated and graded?',
      answer:
        'When you submit a coding solution, it is transferred into an isolated, secure Docker execution container. Your code is compiled and tested against both public sample test cases and private evaluation test cases. Points are awarded proportionally based on the number of passed test cases, test case weightages, and execution constraints.',
    },
    {
      category: 'Code Execution & Grading',
      question: 'What is the difference between "Run Code" and "Submit Solution"?',
      answer:
        '"Run Code" runs your program against the visible sample test cases and allows you to test with custom input. It does NOT finalize your score. "Submit Solution" permanently packages your code, tests it against all hidden validation suites in Docker, and records your score on the server.',
    },
    {
      category: 'Code Execution & Grading',
      question: 'What does "Time Limit Exceeded (TLE)" mean?',
      answer:
        'TLE occurs when your algorithm takes longer to run than the allocated time limit (typically 2 to 5 seconds depending on language). This indicates that your algorithm has an inefficient time complexity (e.g., O(N^2) instead of O(N log N)) or contains an infinite loop. Optimize your data structures and iteration loops.',
    },
    {
      category: 'Code Execution & Grading',
      question: 'Can I switch programming languages midway through solving a question?',
      answer:
        'Yes. You can select your preferred language (Python, Java, C, C++, JavaScript, or SQL) from the language selector dropdown in the code editor. Each language maintains its own starter template. Be sure to test your code before switching questions.',
    },
    {
      category: 'Dashboard & Navigation',
      question: 'Where can I review the code I wrote in previous examinations?',
      answer:
        'Navigate to "My Results" in the sidebar, select any completed or evaluated exam, and scroll down to the "Question-Wise Evaluation Breakdown". Click the "View Code" button next to any coding problem to open the code modal with your exact submitted code and test case outcomes.',
    },
    {
      category: 'Dashboard & Navigation',
      question: 'What does "Automated Docker Evaluation in Progress" mean on the results page?',
      answer:
        'Immediately after submitting, your attempt status transitions to "EVALUATING". In the background, worker queues dispatch your code to sandboxed Docker containers. The page uses real-time WebSockets to update scores and test statuses automatically as soon as Docker finishes execution.',
    },
    {
      category: 'Dashboard & Navigation',
      question: 'How do I update my profile picture or account credentials?',
      answer:
        'Go to the "Profile" tab in the left sidebar. You can upload a new profile avatar image, inspect your assigned batch, student ID/roll number, registered email, and performance statistics. If your name or batch is incorrect, contact your department faculty.',
    },
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqList;
    const q = searchQuery.toLowerCase();
    return faqList.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [searchQuery, faqList]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header - Consistent with all other portal pages */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Instructions & FAQ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Examination guidelines, proctoring integrity policies, and student dashboard documentation
          </p>
        </div>

        {/* Quick Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search instructions or FAQ..."
            className="w-full pl-10 pr-8 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] shadow-sm transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Filter Category Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-[#4f6bf7] text-white shadow-sm shadow-[#4f6bf7]/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          All Topics
        </button>
        <button
          onClick={() => setActiveTab('RULES')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'RULES'
              ? 'bg-[#4f6bf7] text-white shadow-sm shadow-[#4f6bf7]/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Exam Rules & Proctoring
        </button>
        <button
          onClick={() => setActiveTab('GUIDE')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'GUIDE'
              ? 'bg-[#4f6bf7] text-white shadow-sm shadow-[#4f6bf7]/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Dashboard Walkthrough
        </button>
        <button
          onClick={() => setActiveTab('FAQ')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'FAQ'
              ? 'bg-[#4f6bf7] text-white shadow-sm shadow-[#4f6bf7]/25'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          Frequently Asked Questions ({filteredFaqs.length})
        </button>
      </div>

      {/* SECTION 1: CRITICAL EXAM RULES & PROCTORING POLICIES */}
      {(activeTab === 'ALL' || activeTab === 'RULES') && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Examination Instructions & Proctoring Policies
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strict adherence to these rules is mandatory. Violations result in automatic session termination.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Rule Card 1: Hardware & Display */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Laptop / Desktop Requirement
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                All examinations must be taken on a physical laptop or desktop workstation with a display width of at least <strong className="font-mono text-slate-800 dark:text-slate-100">1024px</strong>. Mobile phones and tablets are blocked by proctoring policies.
              </p>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Google Chrome, Edge, or Firefox</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Single primary monitor only</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Stable network connection</span>
                </li>
              </ul>
            </div>

            {/* Rule Card 2: Fullscreen & Tab Switching */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Fullscreen Lockdown & Anti-Switching
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                The exam immediately requests fullscreen upon start. The proctoring system continuously listens for window blur, tab switching, minimizing, or exiting fullscreen mode.
              </p>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Alt+Tab / App switching triggers a violation</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Exiting fullscreen records an infraction</span>
                </li>
                <li className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Right-click & Developer Tools are blocked</span>
                </li>
              </ul>
            </div>

            {/* Rule Card 3: Instant Termination */}
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Violation Limit & Instant Termination
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Each exam has a configured violation threshold (e.g. 3 violations). If you exceed the maximum threshold, your attempt is <strong className="text-rose-600 dark:text-rose-400">INSTANTLY TERMINATED</strong> without second chances.
              </p>
              <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Status permanently marked TERMINATED</span>
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>All code inputs locked immediately</span>
                </li>
                <li className="flex items-center gap-2">
                  <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span>Violations logged in candidate dossier</span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 2: DASHBOARD WALKTHROUGH & HOW TO USE */}
      {(activeTab === 'ALL' || activeTab === 'GUIDE') && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Dashboard Walkthrough & Features
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Step-by-step guidance on how to navigate the candidate portal and complete your assessments.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-[#4f6bf7] font-mono font-bold text-xs flex items-center justify-center">
                  01
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Before Exam</span>
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Finding & Registering for Exams
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Click on <strong>Available Exams</strong> in the sidebar. Assessments assigned to your batch appear with their start time, duration, and question count. Click <em>View Instructions</em> to verify hardware compatibility.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-[#4f6bf7] font-mono font-bold text-xs flex items-center justify-center">
                  02
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">In Exam</span>
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Fullscreen Coding Workspace
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Review instructions, agree to proctoring terms, and enter fullscreen. Use the left question palette to navigate between MCQs and coding challenges. The top header shows live countdown time.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-[#4f6bf7] font-mono font-bold text-xs flex items-center justify-center">
                  03
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Testing</span>
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Monaco Editor & Run Code
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Select Python, Java, C++, C, or JavaScript. Click <strong>Run Code</strong> to test against sample test cases and custom stdin. Click <strong>Submit Solution</strong> to test against hidden validation test cases.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/70 text-[#4f6bf7] font-mono font-bold text-xs flex items-center justify-center">
                  04
                </span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">After Exam</span>
              </div>
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">
                Performance Reports & Results
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Visit <strong>My Results</strong> to view pass/fail outcome, score percentage, breakdown of each test case passed, and inspect your submitted code files.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 3: CODE EXECUTION & TEST CASE SCORING DETAILS */}
      {(activeTab === 'ALL' || activeTab === 'RULES') && (
        <section className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Automated Docker Sandboxing & Scoring Engine
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Understand how your submissions are evaluated to avoid common compiler errors.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                PASSED (Full Marks)
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Your code successfully passed all sample and private validation test cases within memory and CPU time thresholds.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                PARTIAL (Weighted Score)
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Your solution passed a subset of the test cases (e.g. edge cases failed). Points are awarded proportionally.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-rose-500" />
                WRONG ANSWER (0 Marks)
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                The program printed an unexpected output string or formatting mismatch compared to standard test case expectations.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Terminal className="w-4 h-4 text-purple-500" />
                COMPILE ERROR
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Syntax or type errors prevented compilation (e.g., missing semicolons, undefined symbols). Always test with "Run Code" first.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-orange-500" />
                TIME LIMIT EXCEEDED (TLE)
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Algorithm exceeded execution limit. Eliminate nested loops or optimize recursive calls with dynamic programming.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
              <span className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                RUNTIME ERROR (SIGSEGV / OOM)
              </span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Null pointer dereference, array index out of bounds, stack overflow, or memory exhaustion occurred during execution.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* SECTION 4: FREQUENTLY ASKED QUESTIONS (FAQ) */}
      {(activeTab === 'ALL' || activeTab === 'FAQ') && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
              Frequently Asked Questions ({filteredFaqs.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Click any question below to expand its detailed explanation.
            </p>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500">
              <Search className="w-8 h-8 mx-auto text-slate-400 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No matching instructions or FAQs found
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Try searching with different keywords like "termination", "fullscreen", "laptop", or "retake".
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs transition-all"
                  >
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#4f6bf7] shrink-0 border border-blue-200 dark:border-blue-800">
                          {faq.category}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {faq.question}
                        </h4>
                      </div>
                      <div className="shrink-0 text-slate-400">
                        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </div>
                    </button>

                    {isOpen && (
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Assistance & Quick Links Footer Card */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
            Have questions not answered in the FAQ?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
            Reach out directly to your assigned faculty instructor or campus examination coordinator. For technical proctoring errors, ensure you take note of the timestamp and error code displayed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/dashboard"
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs transition-colors"
          >
            Dashboard
          </Link>
          <Link
            to="/exams"
            className="px-4 py-2.5 rounded-xl bg-[#4f6bf7] hover:bg-[#3b5bf6] text-white text-xs font-semibold shadow-sm shadow-[#4f6bf7]/25 transition-colors flex items-center gap-1.5"
          >
            <span>Browse Available Exams</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
