import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Award, Clock, ArrowRight, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function UserResultsPage() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchResults() {
      try {
        const res = await api.get('/results');
        setResults(res.data.data.results || []);
      } catch (err) {
        console.error('Failed to fetch results', err);
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, []);

  // Ensure normal screen mode when viewing results
  useEffect(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Examination Results</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review your performance scores and question evaluations</p>
      </div>

      {results.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm">
          <Award className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">No completed assessments yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Once you take an assessment and submit your solutions, the results will appear here.
          </p>
          <Link
            to="/exams"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-500 shadow-sm transition-colors"
          >
            Browse Available Exams &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((res) => {
            const isEvaluating = res.status === 'EVALUATING';
            const isTerminated = res.status === 'TERMINATED' || res.resultStatus === 'TERMINATED';
            const isOngoing = res.status === 'IN_PROGRESS' || res.resultStatus === 'ONGOING';
            const isPass = !isTerminated && res.resultStatus === 'PASS';

            return (
              <div
                key={res._id}
                className="flex flex-col justify-between rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isTerminated
                          ? 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                          : isOngoing
                          ? 'bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800'
                          : isEvaluating
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : isPass
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      }`}
                    >
                      {isTerminated
                        ? 'TERMINATED'
                        : isOngoing
                        ? 'ONGOING'
                        : isEvaluating
                        ? 'EVALUATING IN DOCKER'
                        : res.resultStatus}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(res.submittedAt || res.startedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 tracking-tight line-clamp-1">
                      {res.exam?.title || 'Examination'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {res.exam?.description}
                    </p>
                  </div>

                  {/* Termination reason pill */}
                  {isTerminated && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300">
                      <p className="font-bold">Terminated:</p>
                      <p className="text-[10px] mt-0.5">
                        {res.terminationReason || 'Terminated due to security policy or exceeding violation limit.'}
                      </p>
                    </div>
                  )}

                  {/* Score pill */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {isOngoing ? 'Status:' : 'Final Score:'}
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100 font-mono">
                      {isOngoing
                        ? 'Assessment In Progress'
                        : `${res.totalScore} / ${res.maxScore} (${res.percentage}%)`}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to={`/results/${res._id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
                  >
                    <span>Inspect Full Report</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
