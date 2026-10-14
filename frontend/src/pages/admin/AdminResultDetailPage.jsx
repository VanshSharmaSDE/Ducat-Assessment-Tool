import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
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
  X,
  RotateCcw,
} from 'lucide-react';

export default function AdminResultDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [retakeLoading, setRetakeLoading] = useState(false);
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data?.attempt) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Result not found.</p>
        <Link to="/admin/results" className="text-blue-600 hover:text-blue-700 mt-2 inline-block font-semibold">Return to Results</Link>
      </div>
    );
  }

  const { attempt, questionBreakdown } = data;
  const isPass = attempt.resultStatus === 'PASS';

  const handleAllowRetake = async () => {
    const studentName = attempt.user?.name || 'this candidate';
    const examTitle = attempt.exam?.title || 'this exam';

    const confirmed = await showConfirm({
      title: 'Allow Exam Retake',
      message: `Are you sure you want to allow ${studentName} to retake "${examTitle}"? Their previous attempt, score, violations, and submitted code will be permanently deleted so they can take the examination fresh.`,
      confirmText: 'Allow Retake',
      isDanger: false,
    });
    if (!confirmed) return;

    try {
      setRetakeLoading(true);
      const res = await api.post(`/admin/results/${id}/allow-retake`);
      await showAlert({
        title: 'Retake Granted',
        message: res.data?.message || 'Retake granted successfully. The candidate can now attempt the exam fresh.',
        type: 'success',
      });
      navigate('/admin/results', { replace: true });
    } catch (err) {
      await showAlert({
        title: 'Retake Action Failed',
        message: err.response?.data?.message || 'Failed to grant retake for this candidate.',
        type: 'error',
      });
    } finally {
      setRetakeLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/admin/results"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors mb-3"
          >
            <ChevronLeft className="w-4 h-4" /> Back to Candidate Results
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Comprehensive Candidate Evaluation Dossier
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Automated Docker execution report and proctoring audit log
          </p>
        </div>
        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={handleAllowRetake}
            disabled={retakeLoading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50"
            title="Allow Candidate to Retake Exam"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Allow Candidate to Retake</span>
          </button>
        </div>
      </div>

      {/* Candidate & Assessment Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <User className="w-4 h-4 text-blue-600" /> Candidate Profile
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{attempt.user?.name || 'Anonymous'}</p>
            <p className="text-xs text-slate-500 font-mono">{attempt.user?.email}</p>
            {attempt.user?.phone && <p className="text-xs text-slate-400 mt-0.5">{attempt.user?.phone}</p>}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-blue-600" /> Assessment Details
          </div>
          <div>
            <p className="text-lg font-bold text-slate-800">{attempt.exam?.title}</p>
            <p className="text-xs text-slate-500">
              Duration: {attempt.exam?.duration}m • Total: {attempt.maxScore} Marks
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Passing Mark: {attempt.exam?.passingMarks || 0}
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Outcome</span>
            <div className="text-3xl font-extrabold text-slate-800 font-mono mt-1">
              {attempt.totalScore} / {attempt.maxScore}
            </div>
            <p className="text-xs text-blue-600 font-bold font-mono">{attempt.percentage}%</p>
          </div>

          <div>
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                isPass
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {attempt.resultStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Proctoring Violation Event Log */}
      {attempt.events?.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Proctoring Violations Log ({attempt.events.length})
            </h3>
            <span className="text-xs font-mono font-bold text-rose-700 dark:text-rose-400">
              Violations: {attempt.violationCount}
            </span>
          </div>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {attempt.events.map((ev, idx) => (
              <div key={idx} className="p-2 bg-white dark:bg-slate-900 border border-rose-100 dark:border-rose-900/40 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 flex justify-between shadow-xs">
                <span>⚠️ [{ev.type}] {ev.details}</span>
                <span className="text-slate-400 dark:text-slate-500">{new Date(ev.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Question Results Table */}
      <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Problem Evaluation Breakdown</h3>

        <div className="space-y-4">
          {questionBreakdown.map((item, idx) => {
            const res = item.result;
            const status = res ? res.status : 'PENDING';
            const isMcq = item.questionType === 'MCQ';

            return (
              <div key={item.questionId} className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-700 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-blue-600 dark:text-blue-400">#{idx + 1}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                        isMcq
                          ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      }`}
                    >
                      {isMcq ? 'MCQ' : 'Coding'}
                    </span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-base">{item.questionTitle}</span>
                    {!isMcq && (
                      <span className="text-xs font-mono uppercase text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/70 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                        {item.language}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        isMcq
                          ? status === 'PASSED'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                            : status === 'WRONG_ANSWER'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {isMcq ? (status === 'PASSED' ? 'CORRECT' : status === 'WRONG_ANSWER' ? 'INCORRECT' : status) : status}
                    </span>
                    {!isMcq && (
                      <button
                        onClick={() => setActiveCodeModal(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-lg transition-colors shadow-xs cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" /> Inspect Code
                      </button>
                    )}
                  </div>
                </div>

                {/* MCQ Question View */}
                {isMcq ? (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                        <span className="text-slate-500 dark:text-slate-400 block">Score:</span>
                        <span className="text-slate-800 dark:text-slate-100 font-mono font-bold">
                          {res?.score || 0} / {item.maxMarks}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                        <span className="text-slate-500 dark:text-slate-400 block">Candidate Answer:</span>
                        <span className="text-slate-800 dark:text-slate-100 font-mono font-bold">
                          {item.selectedOption !== null && item.selectedOption !== undefined
                            ? `Option ${String.fromCharCode(65 + Number(item.selectedOption))}`
                            : 'No Selection'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                        <span className="text-slate-500 dark:text-slate-400 block">Correct Answer:</span>
                        <span className="text-emerald-700 dark:text-emerald-300 font-mono font-bold">
                          {item.correctAnswer !== null && item.correctAnswer !== undefined
                            ? `Option ${String.fromCharCode(65 + Number(item.correctAnswer))}`
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                        <span className="text-slate-500 dark:text-slate-400 block">Evaluation:</span>
                        <span className={`font-mono font-bold ${status === 'PASSED' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {status === 'PASSED' ? 'Passed (+Full Marks)' : 'Wrong (0 Marks)'}
                        </span>
                      </div>
                    </div>

                    {/* Options list showing candidate selection & correct answer */}
                    {item.options?.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Options & Evaluation Breakdown
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {item.options.map((opt, oIdx) => {
                            const isSelected = item.selectedOption === oIdx;
                            const isCorrect = item.correctAnswer === oIdx;

                            let borderStyle = 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300';
                            if (isCorrect) {
                              borderStyle = 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60 text-emerald-950 dark:text-emerald-200 font-medium';
                            } else if (isSelected && !isCorrect) {
                              borderStyle = 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700/60 text-rose-950 dark:text-rose-200 font-medium';
                            }

                            return (
                              <div
                                key={oIdx}
                                className={`p-3 rounded-xl border text-xs flex items-center justify-between shadow-xs ${borderStyle}`}
                              >
                                <div className="flex items-center gap-2.5">
                                  <span
                                    className={`w-6 h-6 rounded flex items-center justify-center font-bold text-xs ${
                                      isCorrect
                                        ? 'bg-emerald-600 text-white'
                                        : isSelected
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'
                                    }`}
                                  >
                                    {String.fromCharCode(65 + oIdx)}
                                  </span>
                                  <span>{opt.text}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {isCorrect && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      <Check className="w-3 h-3 text-emerald-700 dark:text-emerald-400" /> Correct Answer
                                    </span>
                                  )}
                                  {isSelected && (
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                        isCorrect
                                          ? 'bg-emerald-200 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700'
                                          : 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                      }`}
                                    >
                                      Candidate Selected
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Explanation */}
                    {item.explanation && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs space-y-1">
                        <span className="font-bold text-blue-900 dark:text-blue-300 block">Explanation / Rationale:</span>
                        <p className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">{item.explanation}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Coding Question View */
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                        <span className="text-slate-500 dark:text-slate-400 block">Score:</span>
                        <span className="text-slate-800 dark:text-slate-100 font-mono font-bold">{res?.score || 0} / {item.maxMarks}</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                        <span className="text-slate-500 dark:text-slate-400 block">Tests Passed:</span>
                        <span className="text-slate-800 dark:text-slate-100 font-mono font-bold">{res?.passedTests || 0} / {res?.totalTests || 0}</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                        <span className="text-slate-500 dark:text-slate-400 block">Execution Time:</span>
                        <span className="text-slate-800 dark:text-slate-100 font-mono font-bold">{res?.executionTime || 0}s</span>
                      </div>
                      <div className="p-2.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xs">
                        <span className="text-slate-500 dark:text-slate-400 block">Memory Used:</span>
                        <span className="text-slate-800 dark:text-slate-100 font-mono font-bold">{res?.memoryUsed || 0} MB</span>
                      </div>
                    </div>

                    {/* Compiler Output if any */}
                    {res?.compileOutput && (
                      <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs font-mono text-purple-900 dark:text-purple-300">
                        <p className="font-bold text-purple-700 dark:text-purple-300 mb-1">Compilation Output:</p>
                        <pre className="whitespace-pre-wrap">{res.compileOutput}</pre>
                      </div>
                    )}

                    {/* Admin view: Full test case execution breakdown (including hidden) */}
                    {res?.testResults?.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          All Test Cases (Admin Full View)
                        </h5>
                        <div className="space-y-2">
                          {res.testResults.map((tc, tcIdx) => (
                            <div
                              key={tcIdx}
                              className="p-3 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs space-y-1.5 shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {tc.passed ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <X className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                                  <span className="font-semibold text-slate-800 dark:text-slate-100">
                                    Test Case #{tcIdx + 1} {tc.isHidden ? '(Hidden)' : '(Public)'}
                                  </span>
                                </div>
                                <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">{tc.status}</span>
                              </div>

                              {tc.input && (
                                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  <span>Input: </span><code className="text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">{tc.input}</code>
                                </div>
                              )}
                              {tc.expectedOutput && (
                                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  <span>Expected: </span><code className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1 py-0.5 rounded">{tc.expectedOutput}</code>
                                </div>
                              )}
                              {tc.actualOutput && (
                                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  <span>Actual: </span><code className="text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">{tc.actualOutput}</code>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Code Modal */}
      {activeCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-4 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="font-bold text-slate-800 text-base">
                Submitted Code: {activeCodeModal.questionTitle} ({activeCodeModal.language})
              </h3>
              <button
                onClick={() => setActiveCodeModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
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
