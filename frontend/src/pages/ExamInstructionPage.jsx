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
  ChevronLeft
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

  const isAlreadyTaken = ['SUBMITTED', 'EVALUATING', 'EVALUATED', 'COMPLETED', 'TERMINATED', 'EXPIRED'].includes(
    activeAttempt?.status
  );

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
    if (!agreed || isAlreadyTaken) return;
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
      await api.post(`/exams/${id}/start`);
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
      <div className="p-8 text-center text-slate-500">
        <p>Examination not found.</p>
        <Link to="/exams" className="text-blue-600 hover:text-blue-700 mt-2 inline-block font-medium">Return to exams</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <Link to="/exams" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-4">
          <ChevronLeft className="w-4 h-4" /> Back to Assessments
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">{exam.title}</h1>
        <p className="text-sm text-slate-500 mt-1.5">{exam.description}</p>
      </div>

      {isAlreadyTaken && (
        <div className="p-5 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-800 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base text-slate-800">You have already completed this examination</h3>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
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
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold text-xs rounded-xl transition-colors shadow-sm"
              >
                View Assessment Results &rarr;
              </Link>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            Refresh Browser
          </button>
        </div>
      )}

      {/* Assessment Specifications */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Clock className="w-4 h-4 text-blue-600" /> Duration
          </div>
          <p className="text-xl font-bold text-slate-800 mt-2">{exam.duration} Minutes</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Strict server countdown</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Code2 className="w-4 h-4 text-blue-600" /> Problems
          </div>
          <p className="text-xl font-bold text-slate-800 mt-2">{exam.questions?.length || 0} Questions</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Multiple test suites</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Award className="w-4 h-4 text-blue-600" /> Total Marks
          </div>
          <p className="text-xl font-bold text-slate-800 mt-2">{exam.totalMarks} Marks</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Automated scoring</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
            <Award className="w-4 h-4 text-emerald-600" /> Passing Mark
          </div>
          <p className="text-xl font-bold text-slate-800 mt-2">{exam.passingMarks} Marks</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Minimum threshold</p>
        </div>
      </div>

      {/* Rules & Warnings */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-blue-600" />
          Mandatory Examination Rules & Guidelines
        </h2>

        <div className="space-y-3 text-xs sm:text-sm text-slate-600 leading-relaxed">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-start gap-3 font-medium">
            <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600 mt-0.5" />
            <div>
              <strong className="text-amber-900">IMPORTANT: NO "RUN CODE" FEATURE DURING ASSESSMENT</strong>
              <p className="mt-1 text-amber-700 text-xs">
                Code execution is not available during the examination. Your submitted code will be securely executed in isolated Docker containers against all hidden test cases only after final submission.
              </p>
            </div>
          </div>

          <ul className="list-disc list-inside space-y-2 text-slate-600 pl-1">
            <li><strong className="text-slate-800">Timer Control:</strong> The timer is locked and calculated on the server. Navigating away, reloading, or closing your browser will NOT pause your timer.</li>
            <li><strong className="text-slate-800">Mandatory Fullscreen:</strong> The assessment runs strictly in full-screen mode. Attempting to exit or minimize fullscreen triggers an immediate proctoring violation and locks the assessment until fullscreen is restored.</li>
            <li><strong className="text-slate-800">Anti-Cheating Monitoring:</strong> Switching browser tabs, minimizing the window, or losing window focus is automatically tracked. Exceeding {exam.maxViolations || 5} violations will immediately terminate your attempt.</li>
            <li><strong className="text-slate-800">Supported Runtimes:</strong> Java 17, Python 3, and JavaScript (Node.js). Switch between languages in the editor as needed.</li>
            <li><strong className="text-slate-800">Single Attempt Rule:</strong> You cannot retake or restart an examination once submitted or expired.</li>
            <li><strong className="text-slate-800">Auto-Submit on Time Expiry:</strong> When the countdown reaches zero, all solutions written so far will be submitted automatically.</li>
          </ul>
        </div>
      </div>

      {/* Agreement & Action */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
        <label
          onClick={() => setAgreed(!agreed)}
          className="flex items-start gap-3 cursor-pointer group"
        >
          <div className="mt-0.5 text-blue-600">
            {agreed ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />}
          </div>
          <span className="text-xs sm:text-sm text-slate-700 select-none">
            I have carefully read and understood all the assessment rules, constraints, and proctoring warnings. I understand that code execution will take place strictly upon final submission.
          </span>
        </label>

        <div className="flex justify-end gap-3 pt-2">
          <Link
            to="/exams"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold bg-white hover:bg-slate-50 transition-colors shadow-sm"
          >
            Back to Exams
          </Link>

          {isAlreadyTaken ? (
            <Link
              to={activeAttempt?._id ? `/results/${activeAttempt._id}` : '/results'}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <span>View Examination Results</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <button
              onClick={handleStartExam}
              disabled={!agreed || starting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              {starting ? 'Initiating Exam Environment...' : 'I Agree & Start Exam'}
              {!starting && <ArrowRight className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
