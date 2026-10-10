import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  Award,
  ChevronLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  ShieldAlert,
  User,
  Eye,
  FileCode,
  Check,
  X
} from 'lucide-react';

export default function AdminResultDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeCodeModal, setActiveCodeModal] = useState(null);

  useEffect(() => {
    async function loadResult() {
      try {
        const res = await api.get(`/admin/results/${id}`);
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to load result', err);
      } finally {
        setLoading(false);
      }
    }
    loadResult();
  }, [id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.attempt) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Result not found.</p>
        <Link to="/admin/results" className="text-amber-400 mt-2 inline-block">Return to Results</Link>
      </div>
    );
  }

  const { attempt, questionBreakdown } = data;
  const isPass = attempt.resultStatus === 'PASS';

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
      <div>
        <Link
          to="/admin/results"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Candidate Results
        </Link>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Comprehensive Candidate Evaluation Dossier
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Automated Docker execution report and proctoring audit log
        </p>
      </div>

      {/* Candidate & Assessment Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <User className="w-4 h-4 text-sky-400" /> Candidate Profile
          </div>
          <div>
            <p className="text-lg font-bold text-white">{attempt.user?.name || 'Anonymous'}</p>
            <p className="text-xs text-slate-400 font-mono">{attempt.user?.email}</p>
            {attempt.user?.phone && <p className="text-xs text-slate-500 mt-0.5">{attempt.user?.phone}</p>}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-400" /> Assessment Details
          </div>
          <div>
            <p className="text-lg font-bold text-white">{attempt.exam?.title}</p>
            <p className="text-xs text-slate-400">
              Duration: {attempt.exam?.duration}m • Total: {attempt.maxScore} Marks
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Passing Mark: {attempt.exam?.passingMarks || 0}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outcome</span>
            <div className="text-3xl font-extrabold text-white font-mono mt-1">
              {attempt.totalScore} / {attempt.maxScore}
            </div>
            <p className="text-xs text-amber-400 font-bold font-mono">{attempt.percentage}%</p>
          </div>

          <div>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                isPass
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {attempt.resultStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Proctoring Violation Event Log */}
      {attempt.events?.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Proctoring Violations Log ({attempt.events.length})
            </h3>
            <span className="text-xs font-mono font-bold text-rose-300">
              Violations: {attempt.violationCount}
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {attempt.events.map((ev, idx) => (
              <div key={idx} className="p-2 bg-slate-950/60 rounded-lg text-xs font-mono text-slate-300 flex justify-between">
                <span>⚠️ [{ev.type}] {ev.details}</span>
                <span className="text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Results Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-base font-bold text-white">Problem Evaluation Breakdown</h3>

        <div className="space-y-4">
          {questionBreakdown.map((item, idx) => {
            const res = item.result;
            const status = res ? res.status : 'PENDING';

            return (
              <div key={item.questionId} className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-amber-400">#{idx + 1}</span>
                    <span className="font-bold text-white text-base">{item.questionTitle}</span>
                    <span className="text-xs font-mono uppercase text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">
                      {item.language}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200">
                      {status}
                    </span>
                    <button
                      onClick={() => setActiveCodeModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Code
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 bg-slate-900 rounded-lg">
                    <span className="text-slate-500 block">Score:</span>
                    <span className="text-white font-mono font-bold">{res?.score || 0} / {item.maxMarks}</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg">
                    <span className="text-slate-500 block">Tests Passed:</span>
                    <span className="text-white font-mono font-bold">{res?.passedTests || 0} / {res?.totalTests || 0}</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg">
                    <span className="text-slate-500 block">Execution Time:</span>
                    <span className="text-white font-mono font-bold">{res?.executionTime || 0}s</span>
                  </div>
                  <div className="p-2.5 bg-slate-900 rounded-lg">
                    <span className="text-slate-500 block">Memory Used:</span>
                    <span className="text-white font-mono font-bold">{res?.memoryUsed || 0} MB</span>
                  </div>
                </div>

                {/* Compiler Output if any */}
                {res?.compileOutput && (
                  <div className="p-3 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs font-mono text-purple-300">
                    <p className="font-bold text-purple-400 mb-1">Compilation Output:</p>
                    <pre className="whitespace-pre-wrap">{res.compileOutput}</pre>
                  </div>
                )}

                {/* Admin view: Full test case execution breakdown (including hidden) */}
                {res?.testResults?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      All Test Cases (Admin Full View)
                    </h5>
                    <div className="space-y-2">
                      {res.testResults.map((tc, tcIdx) => (
                        <div
                          key={tcIdx}
                          className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {tc.passed ? <Check className="w-4 h-4 text-emerald-400" /> : <X className="w-4 h-4 text-rose-400" />}
                              <span className="font-semibold text-white">
                                Test Case #{tcIdx + 1} {tc.isHidden ? '(Hidden)' : '(Public)'}
                              </span>
                            </div>
                            <span className="font-mono text-slate-400 font-bold">{tc.status}</span>
                          </div>

                          {tc.input && (
                            <div className="text-[11px] font-mono text-slate-400">
                              <span>Input: </span><code className="text-slate-300">{tc.input}</code>
                            </div>
                          )}
                          {tc.expectedOutput && (
                            <div className="text-[11px] font-mono text-slate-400">
                              <span>Expected: </span><code className="text-emerald-400">{tc.expectedOutput}</code>
                            </div>
                          )}
                          {tc.actualOutput && (
                            <div className="text-[11px] font-mono text-slate-400">
                              <span>Actual: </span><code className="text-slate-300">{tc.actualOutput}</code>
                            </div>
                          )}
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

      {/* Code Modal */}
      {activeCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                Submitted Code: {activeCodeModal.questionTitle} ({activeCodeModal.language})
              </h3>
              <button
                onClick={() => setActiveCodeModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-slate-200">
              <pre className="whitespace-pre-wrap">{activeCodeModal.submittedCode}</pre>
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setActiveCodeModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
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
