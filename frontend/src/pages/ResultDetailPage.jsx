import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import {
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Code2,
  ChevronLeft,
  Loader2,
  Terminal,
  ShieldCheck,
  Eye,
  FileCode,
  Check,
  X
} from 'lucide-react';

export default function ResultDetailPage() {
  const { id } = useParams();
  const { socket } = useSocket();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [activeCodeModal, setActiveCodeModal] = useState(null);

  const fetchResult = async () => {
    try {
      setErrorMsg(null);
      const res = await api.get(`/results/${id}`);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to load result', err);
      setErrorMsg(err.response?.data?.message || 'Result not found or access unauthorized.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResult();
  }, [id]);

  // Ensure normal screen mode when viewing results
  useEffect(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  // Socket and Polling for live evaluation status
  useEffect(() => {
    if (!socket) return;

    socket.emit('join-attempt', id);

    const handleCompleted = () => {
      fetchResult();
    };

    const handleSubmissionStatus = () => {
      fetchResult();
    };

    socket.on('attempt:completed', handleCompleted);
    socket.on('submission:status', handleSubmissionStatus);

    // Fallback polling if attempt is EVALUATING
    const pollInterval = setInterval(() => {
      if (data?.attempt?.status === 'EVALUATING') {
        fetchResult();
      }
    }, 3000);

    return () => {
      socket.emit('leave-attempt', id);
      socket.off('attempt:completed', handleCompleted);
      socket.off('submission:status', handleSubmissionStatus);
      clearInterval(pollInterval);
    };
  }, [socket, id, data?.attempt?.status]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.attempt) {
    return (
      <div className="p-8 text-center text-slate-500 max-w-md mx-auto my-16 bg-white border border-slate-200 rounded-2xl shadow-md">
        <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-800 mb-1">Result Not Available</h3>
        <p className="text-xs text-slate-500 mb-6">{errorMsg || 'Result not found or access unauthorized.'}</p>
        <Link to="/results" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold inline-block shadow-sm transition-colors">
          Return to Results
        </Link>
      </div>
    );
  }

  const { attempt, questionBreakdown } = data;
  const isEvaluating = attempt.status === 'EVALUATING';
  const isPass = attempt.resultStatus === 'PASS';

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      <div>
        <Link
          to="/results"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" /> Back to My Results
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          {attempt.exam?.title || 'Examination'} — Performance Report
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Submitted on {new Date(attempt.submittedAt || attempt.startedAt).toLocaleString()}
        </p>
      </div>

      {/* Evaluating Banner if still running in Docker */}
      {isEvaluating && (
        <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-4">
          <Loader2 className="w-6 h-6 animate-spin shrink-0 text-blue-600" />
          <div>
            <h4 className="font-bold text-sm text-blue-900">Automated Code Evaluation in Progress</h4>
            <p className="text-xs text-blue-700 mt-0.5">
              Isolated Docker containers are compiling and testing your code against private test suites. Results update automatically in real-time.
            </p>
          </div>
        </div>
      )}

      {/* Score Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Candidate Score</span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-slate-800 font-mono">{attempt.totalScore}</span>
              <span className="text-xl font-medium text-slate-500 font-mono">/ {attempt.maxScore}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Passing threshold: {attempt.exam?.passingMarks || 0} Marks</p>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isPass
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-rose-50 text-rose-600 border-rose-200'
              }`}
            >
              {isPass ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {attempt.resultStatus} ({attempt.percentage}%)
            </span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attempt Status</span>
          <p className="text-xl font-bold text-slate-800 mt-2 font-mono">{attempt.status}</p>
          <span className="text-xs text-slate-400">Auto-calculated</span>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proctoring Log</span>
          <p className="text-xl font-bold text-slate-800 mt-2 font-mono">{attempt.violationCount || 0} Violations</p>
          <span className="text-xs text-emerald-600">Integrity verified</span>
        </div>
      </div>

      {/* Question-by-Question Breakdown */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Code2 className="w-5 h-5 text-blue-600" />
          Question-Wise Evaluation Breakdown
        </h2>

        <div className="space-y-4">
          {questionBreakdown.map((item, idx) => {
            const res = item.result;
            const status = res ? res.status : 'PENDING';

            const statusColors = {
              PASSED: 'bg-emerald-50 text-emerald-600 border-emerald-200',
              PARTIAL: 'bg-amber-50 text-amber-600 border-amber-200',
              WRONG_ANSWER: 'bg-rose-50 text-rose-600 border-rose-200',
              COMPILE_ERROR: 'bg-purple-50 text-purple-600 border-purple-200',
              TIME_LIMIT_EXCEEDED: 'bg-orange-50 text-orange-600 border-orange-200',
              RUNTIME_ERROR: 'bg-red-50 text-red-600 border-red-200',
              PENDING: 'bg-slate-100 text-slate-600 border-slate-200',
              NOT_SUBMITTED: 'bg-slate-100 text-slate-600 border-slate-200',
            };

            return (
              <div
                key={item.questionId}
                className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                      Q{idx + 1}
                    </span>
                    <h3 className="font-bold text-base text-slate-800">{item.questionTitle}</h3>
                    <span className="text-[11px] font-semibold text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                      {(item.language || 'code').toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                        statusColors[status] || statusColors.PENDING
                      }`}
                    >
                      {status.replace('_', ' ')}
                    </span>

                    <button
                      onClick={() => setActiveCodeModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg border border-slate-200 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Code</span>
                    </button>
                  </div>
                </div>

                {/* Question Score & Test Case Counts */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Score Earned:</span>
                    <span className="text-slate-800 font-bold font-mono text-sm">
                      {res ? res.score : 0} / {item.maxMarks}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Tests Passed:</span>
                    <span className="text-slate-800 font-bold font-mono text-sm">
                      {res ? `${res.passedTests} / ${res.totalTests}` : '0 / 0'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Max Exec Time:</span>
                    <span className="text-slate-800 font-bold font-mono text-sm">
                      {res ? `${res.executionTime}s` : '0s'}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-slate-500 block">Status:</span>
                    <span className="text-slate-800 font-bold font-mono text-sm">
                      {item.submissionStatus}
                    </span>
                  </div>
                </div>

                {/* Compilation Error Output (if any) */}
                {res?.compileOutput && (
                  <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-xs font-mono text-purple-800">
                    <p className="font-bold text-purple-700 mb-1 flex items-center gap-1.5">
                      <Terminal className="w-4 h-4" /> Compiler Diagnostics:
                    </p>
                    <pre className="whitespace-pre-wrap">{res.compileOutput}</pre>
                  </div>
                )}

                {/* Test Cases List (Protected: Hidden test inputs never shown!) */}
                {res?.testResults?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Test Suite Results
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {res.testResults.map((tc, tcIdx) => (
                        <div
                          key={tcIdx}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            {tc.passed ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <X className="w-4 h-4 text-rose-600" />
                            )}
                            <span className="font-medium text-slate-700">
                              {tc.isHidden ? `Hidden Test #${tcIdx + 1}` : `Public Example #${tcIdx + 1}`}
                            </span>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              tc.passed
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-rose-50 text-rose-600 border-rose-200'
                            }`}
                          >
                            {tc.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Inspection Modal */}
      {activeCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-base">
                  Submitted Solution: {activeCodeModal.questionTitle} ({activeCodeModal.language})
                </h3>
              </div>
              <button
                onClick={() => setActiveCodeModal(null)}
                className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800">
              <pre className="whitespace-pre-wrap">{activeCodeModal.submittedCode}</pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveCodeModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
