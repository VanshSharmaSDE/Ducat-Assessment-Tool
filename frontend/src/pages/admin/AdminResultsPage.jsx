import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import {
  Award,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  ArrowRight,
  Download,
  FileSpreadsheet,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react';

export default function AdminResultsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const { socket } = useSocket();
  const [results, setResults] = useState([]);
  const [resultStatusFilter, setResultStatusFilter] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const [availableExams, setAvailableExams] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableGenders, setAvailableGenders] = useState([]);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadResults = async () => {
    try {
      let query = `?page=${page}&limit=20`;
      if (resultStatusFilter) query += `&resultStatus=${resultStatusFilter}`;
      if (examFilter) query += `&examId=${examFilter}`;
      if (batchFilter) query += `&batch=${encodeURIComponent(batchFilter)}`;
      if (genderFilter) query += `&gender=${encodeURIComponent(genderFilter)}`;
      if (languageFilter) query += `&language=${encodeURIComponent(languageFilter)}`;

      const res = await api.get(`/admin/results${query}`);
      setResults(res.data.data.results || []);
      setPagination(res.data.data.pagination || { total: 0, pages: 1 });
      if (res.data.data.availableExams) setAvailableExams(res.data.data.availableExams);
      if (res.data.data.availableBatches) setAvailableBatches(res.data.data.availableBatches);
      if (res.data.data.availableGenders) setAvailableGenders(res.data.data.availableGenders);
    } catch (err) {
      console.error('Failed to load results', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time proctoring listener to update violation counts live
  useEffect(() => {
    if (!socket) return;
    const handleViolation = (data) => {
      setResults((prev) =>
        prev.map((r) => {
          if (r._id === data.attemptId) {
            return {
              ...r,
              violationCount: data.violationCount,
              status: data.terminated ? 'TERMINATED' : r.status,
            };
          }
          return r;
        })
      );
    };

    socket.on('proctoring:violation', handleViolation);
    return () => socket.off('proctoring:violation', handleViolation);
  }, [socket]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      let query = '';
      if (examFilter) query += `&examId=${examFilter}`;
      if (batchFilter) query += `&batch=${encodeURIComponent(batchFilter)}`;
      if (genderFilter) query += `&gender=${encodeURIComponent(genderFilter)}`;
      if (languageFilter) query += `&language=${encodeURIComponent(languageFilter)}`;
      if (query.startsWith('&')) query = '?' + query.slice(1);

      const response = await api.get(`/admin/results/export-excel${query}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const targetExam = availableExams.find((e) => e._id === examFilter);
      const filename = targetExam
        ? `${targetExam.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Results.xlsx`
        : 'Students_Exam_Results.xlsx';
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to download Excel report.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [page, resultStatusFilter, examFilter, batchFilter, genderFilter, languageFilter]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Award className="w-6 h-6 text-amber-400" />
            {isAdmin ? 'Assessment Results & Reports' : 'My Student Results'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin 
              ? 'Review candidate test attempts across all faculties with faculty attribution' 
              : 'Review test attempts and evaluation outcomes for your enrolled students'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : examFilter ? 'Export This Exam (Excel)' : 'Export All Results (Excel)'}
          </button>

          <select
            value={examFilter}
            onChange={(e) => {
              setExamFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Examinations</option>
            {availableExams.map((ex) => (
              <option key={ex._id} value={ex._id}>{ex.title}</option>
            ))}
          </select>

          <select
            value={resultStatusFilter}
            onChange={(e) => {
              setResultStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Outcomes</option>
            <option value="PASS">Passed Candidates</option>
            <option value="FAIL">Failed Candidates</option>
            <option value="PENDING">Pending Evaluation</option>
          </select>

          <select
            value={batchFilter}
            onChange={(e) => {
              setBatchFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Batches</option>
            {availableBatches.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => {
              setGenderFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={languageFilter}
            onChange={(e) => {
              setLanguageFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">All Languages</option>
            <option value="java">Java</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Award className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No evaluation results found</h3>
          <p className="text-xs text-slate-400 mt-1">Candidate attempts matching criteria will appear here.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Candidate</th>
                  {isAdmin && <th className="py-3.5 px-4 font-semibold">Faculty / Added By</th>}
                  <th className="py-3.5 px-4 font-semibold">Examination</th>
                  <th className="py-3.5 px-4 font-semibold">Batch</th>
                  <th className="py-3.5 px-4 font-semibold">Gender</th>
                  <th className="py-3.5 px-4 font-semibold">Language(s)</th>
                  <th className="py-3.5 px-4 font-semibold">Violations</th>
                  <th className="py-3.5 px-4 font-semibold">Score</th>
                  <th className="py-3.5 px-4 font-semibold">Percentage</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Submitted Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {results.map((att) => (
                  <tr key={att._id} className="text-slate-300 hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white text-sm">{att.userId?.name || 'Anonymous'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{att.userId?.email}</p>
                    </td>

                    {isAdmin && (
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-200">
                            {att.userId?.createdBy?.name || 'Admin / Direct'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            att.userId?.createdBy?.role === 'FACULTY' ? 'text-emerald-400 bg-emerald-500/10' : 'text-slate-400 bg-slate-800'
                          }`}>
                            {att.userId?.createdBy?.role || 'SYSTEM'}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="py-3.5 px-4 font-semibold text-slate-200">{att.examId?.title || 'Exam'}</td>
                    <td className="py-3.5 px-4 text-indigo-300 font-medium">{att.userId?.batch || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{att.userId?.gender || '-'}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {(att.languagesUsed && att.languagesUsed.length > 0) ? (
                          att.languagesUsed.map((lang) => (
                            <span key={lang} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-sky-300">
                              {lang}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 font-mono text-[10px]">-</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          (att.violationCount || 0) > 0
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        <ShieldAlert className="w-3 h-3" />
                        {att.violationCount || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {att.totalScore} / {att.maxScore}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                      {att.percentage}%
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          att.resultStatus === 'PASS'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : att.resultStatus === 'FAIL'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {att.resultStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(att.submittedAt || att.startedAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to={`/admin/results/${att._id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.pages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Showing Page {page} of {pagination.pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
