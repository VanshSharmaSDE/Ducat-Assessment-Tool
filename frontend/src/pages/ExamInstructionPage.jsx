import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import {
  ShieldAlert,
  Clock,
  Code2,
  Award,
  AlertTriangle,
  CheckSquare,
  Square,
  ArrowRight,
  ChevronLeft,
  Laptop,
  Smartphone,
  CheckCircle2,
} from 'lucide-react';

export default function ExamInstructionPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [activeAttempt, setActiveAttempt] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  const isPractice = Boolean(exam?.isPractice);
  const isLimitReached = isPractice && activeAttempt?.status === 'LIMIT_REACHED';
  const isAlreadyTaken = !isPractice && ['SUBMITTED', 'EVALUATING', 'EVALUATED', 'COMPLETED', 'TERMINATED', 'EXPIRED'].includes(
    activeAttempt?.status
  );

  useEffect(() => {
    const evaluateScreen = () => {
      const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const screenWidth = typeof window !== 'undefined' ? (window.screen?.width || window.innerWidth || 0) : 0;
      const windowWidth = typeof window !== 'undefined' ? (window.innerWidth || 0) : 0;
      const small = isMobileUA || (screenWidth > 0 && screenWidth < 1024) || (windowWidth > 0 && windowWidth < 1024);
      setIsSmallScreen(small);
    };

    evaluateScreen();
    window.addEventListener('resize', evaluateScreen);
    return () => window.removeEventListener('resize', evaluateScreen);
  }, []);

  useEffect(() => {
    async function loadExam() {
      try {
        const res = await api.get(`/exams/${id}`);
        setExam(res.data.data.exam);
        setActiveAttempt(res.data.data.activeAttempt);
      } catch (err) {
        setError('Failed to load examination details.');
      } finally {
        setLoading(false);
      }
    }
    loadExam();
  }, [id]);

  const handleStartExam = async () => {
    if (!agreed || isAlreadyTaken || isLimitReached) return;

    if (exam?.restrictToLaptop && isSmallScreen) {
      setError('This exam is restricted to laptop/desktop screens only (width ≥ 1024px). Please open on a laptop or maximize your browser window.');
      return;
    }

    setStarting(true);
    setError('');

    // Force automatic fullscreen entry on user click gesture
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
    } catch (fsErr) {
      console.warn('Fullscreen entry deferred by browser:', fsErr);
    }

    try {
      const isMobileUA = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const deviceInfo = {
        screenWidth: window.screen?.width || window.innerWidth || 0,
        screenHeight: window.screen?.height || window.innerHeight || 0,
        windowWidth: window.innerWidth || 0,
        windowHeight: window.innerHeight || 0,
        isMobile: isMobileUA || window.innerWidth < 1024,
      };

      await api.post(`/exams/${id}/start`, { deviceInfo });
      navigate(`/exams/${id}/take`);
    } catch (err) {
      try {
        if (document.fullscreenElement) {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
          else if (document.msExitFullscreen) await document.msExitFullscreen();
        }
      } catch (e) {}

      const msg = err.response?.data?.message || '';
      if (msg.toLowerCase().includes('already') || err.response?.data?.errorCode === 'ALREADY_SUBMITTED') {
        setError('You already gave this exam. Please refresh your browser or check your assessment results.');
      } else {
        setError(msg || 'Failed to start exam. Check availability or existing attempts.');
      }
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        <p>Examination not found.</p>
        <Link to="/exams" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block font-medium">Return to exams</Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Title & Navigation */}
      <div>
        <Link
          to={isPractice ? "/practice" : "/exams"}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> Back to {isPractice ? 'Practice Tests' : 'Assessments'}
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">{exam.title}</h1>
          {isPractice && (
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              PRACTICE SANDBOX
            </span>
          )}
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">{exam.description}</p>
      </div>

      {/* Daily Practice Limit Reached Banner */}
      {isLimitReached && (
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
            <span>Daily Practice Limit Reached (2 / 2 Attempts Used Today)</span>
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400 leading-relaxed">
            To preserve server Docker execution resources, each practice test is limited to 2 sessions per calendar day. You can take this test again tomorrow, or practice another test!
          </p>
          <div className="pt-1">
            <Link
              to="/practice"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-sm"
            >
              Browse Other Practice Tests &rarr;
            </Link>
          </div>
        </div>
      )}

      {isAlreadyTaken && (
        <div className="p-5 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">You have already completed this examination</h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1 leading-relaxed">
                Our system recorded an existing completed or submitted attempt for your account. If your browser displays an outdated state or you recently finished, please refresh your browser.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/15 transition-all cursor-pointer"
            >
              Refresh Browser
            </button>
            {activeAttempt?._id && (
              <Link
                to={`/results/${activeAttempt._id}`}
                className="px-4 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs rounded-xl transition-colors shadow-sm"
              >
                View Assessment Results &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-rose-100 dark:bg-rose-900/60 hover:bg-rose-200 dark:hover:bg-rose-800 text-rose-700 dark:text-rose-200 text-xs font-semibold rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Refresh Browser
          </button>
        </div>
      )}

      {/* Laptop Only Mode Requirement Banner (Shown before instructions) */}
      {exam.restrictToLaptop && (
        <div
          className={`p-5 rounded-3xl border transition-all ${
            isSmallScreen
              ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-100'
              : 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-100'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-2xl shrink-0 ${
                isSmallScreen
                  ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300'
                  : 'bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300'
              }`}
            >
              <Laptop className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-800 dark:text-slate-100">
                  {isSmallScreen
                    ? 'Laptop / Desktop Required — Small Screen Detected'
                    : 'Laptop / Desktop Only Mode Active'}
                </h3>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    isSmallScreen
                      ? 'bg-rose-100 dark:bg-rose-900/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  }`}
                >
                  {isSmallScreen ? 'Access Blocked' : 'Screen Verified'}
                </span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {isSmallScreen
                  ? 'The examiner has configured this assessment to strictly require a laptop or desktop computer (viewport width ≥ 1024px). Mobile devices and small screens are blocked. Please open this assessment on a laptop or maximize your browser window to start.'
                  : 'This assessment requires a laptop or desktop computer. Your current screen resolution satisfies the requirements.'}
              </p>
              {isSmallScreen && (
                <div className="mt-2.5 flex items-center gap-4 text-xs font-mono">
                  <span className="text-slate-600 dark:text-slate-400">
                    Detected Width: <strong className="text-rose-600 dark:text-rose-400">{typeof window !== 'undefined' ? (window.innerWidth || window.screen?.width || 0) : 0}px</strong>
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600 dark:text-slate-400">
                    Minimum Required: <strong className="text-emerald-600 dark:text-emerald-400">≥ 1024px</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Assessment Specifications */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Clock className="w-4 h-4 text-[#4f6bf7]" /> Duration
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">{exam.duration} Minutes</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Strict server countdown</p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Code2 className="w-4 h-4 text-[#4f6bf7]" /> Problems
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">{exam.questions?.length || 0} Questions</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Multiple test suites</p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Award className="w-4 h-4 text-[#4f6bf7]" /> Total Marks
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">{exam.totalMarks} Marks</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Automated scoring</p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold">
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Passing Mark
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-2">{exam.passingMarks} Marks</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Minimum threshold</p>
        </div>
      </div>

      {/* Rules & Warnings */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#4f6bf7]" />
          Mandatory Examination Rules & Guidelines
        </h2>

        <div className="space-y-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300 pl-1">
            <li><strong className="text-slate-800 dark:text-slate-100">Timer Control:</strong> The timer is locked and calculated on the server. Navigating away, reloading, or closing your browser will NOT pause your timer.</li>
            <li><strong className="text-slate-800 dark:text-slate-100">Mandatory Fullscreen:</strong> The assessment runs strictly in full-screen mode. Attempting to exit or minimize fullscreen triggers an immediate proctoring violation and locks the assessment until fullscreen is restored.</li>
            <li><strong className="text-slate-800 dark:text-slate-100">Anti-Cheating Monitoring:</strong> Switching browser tabs, minimizing the window, or losing window focus is automatically tracked. Exceeding {exam.maxViolations || 5} violations will immediately terminate your attempt.</li>
            <li><strong className="text-slate-800 dark:text-slate-100">Supported Runtimes:</strong> Java 17, Python 3, JavaScript (Node.js), C, C++, and SQL (SQLite). Switch between languages in the editor as needed.</li>
            <li><strong className="text-slate-800 dark:text-slate-100">Single Attempt Rule:</strong> You cannot retake or restart an examination once submitted or expired.</li>
            <li><strong className="text-slate-800 dark:text-slate-100">Auto-Submit on Time Expiry:</strong> When the countdown reaches zero, all solutions written so far will be submitted automatically.</li>
          </ul>
        </div>
      </div>

      {/* Agreement & Action */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        <label
          onClick={() => setAgreed(!agreed)}
          className="flex items-start gap-3 cursor-pointer group"
        >
          <div className="mt-0.5 text-[#4f6bf7]">
            {agreed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300" />}
          </div>
          <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-200 select-none">
            I have carefully read and understood all the assessment rules, guidelines, and proctoring constraints.
          </span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to={isPractice ? "/practice" : "/exams"}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            Back to {isPractice ? 'Practice Tests' : 'Exams'}
          </Link>

          {isAlreadyTaken ? (
            <Link
              to={activeAttempt?._id ? `/results/${activeAttempt._id}` : '/results'}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <span>View Examination Results</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : isLimitReached ? (
            <button
              disabled
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-xs font-bold cursor-not-allowed"
            >
              Daily Limit Reached (2/2 Used)
            </button>
          ) : (
            <button
              onClick={handleStartExam}
              disabled={!agreed || starting || (exam?.restrictToLaptop && isSmallScreen)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#4f6bf7] hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-[#4f6bf7]/20 transition-all cursor-pointer"
            >
              {starting
                ? 'Initiating Exam Environment...'
                : exam?.restrictToLaptop && isSmallScreen
                ? 'Laptop Screen Required to Start'
                : isPractice
                ? 'I Agree & Start Practice Test'
                : 'I Agree & Start Exam'}
              {!starting && !(exam?.restrictToLaptop && isSmallScreen) && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
