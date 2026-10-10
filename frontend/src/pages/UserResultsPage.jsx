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
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Examination Results</h1>
        <p className="text-sm text-slate-400 mt-1">Review your performance scores and question evaluations</p>
      </div>

      {results.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Award className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No completed assessments yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Once you take an assessment and submit your solutions, the results will appear here.
          </p>
          <Link
            to="/exams"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold hover:bg-sky-500 transition-colors"
          >
            Browse Available Exams &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((res) => {
            const isEvaluating = res.status === 'EVALUATING';
            const isPass = res.resultStatus === 'PASS';

            return (
              <div
                key={res._id}
                className="flex flex-col justify-between rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 p-6 shadow-xl transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isEvaluating
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : isPass
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}
                    >
                      {isEvaluating ? 'EVALUATING IN DOCKER' : res.resultStatus}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(res.submittedAt || res.startedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-white tracking-tight line-clamp-1">
                      {res.exam?.title || 'Examination'}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {res.exam?.description}
                    </p>
                  </div>

                  {/* Score pill */}
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Final Score:</span>
                    <span className="text-sm font-bold text-white font-mono">
                      {res.totalScore} / {res.maxScore} ({res.percentage}%)
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  <Link
                    to={`/results/${res._id}`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all"
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
