import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
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
  AlertTriangle,
  Trash2,
  ChevronLeft,
  BookOpen,
  Users,
  Layers,
  GraduationCap,
  Calendar,
  Check,
  TrendingUp,
} from 'lucide-react';

export default function AdminResultsPage() {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const { socket } = useSocket();
  const [results, setResults] = useState([]);
  const [examsSummary, setExamsSummary] = useState([]);
  const [selectedResults, setSelectedResults] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // View mode: 'by-exam' (default, grouped by exam) or 'flat-candidates'
  const [viewMode, setViewMode] = useState('by-exam');
  const [selectedExam, setSelectedExam] = useState(null); // When set, drills down into this exam's candidates

  // Search & Filters
  const [examSearch, setExamSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
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
      if (res.data.data.examsSummary) setExamsSummary(res.data.data.examsSummary);
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

  useEffect(() => {
    loadResults();
  }, [page, resultStatusFilter, examFilter, batchFilter, genderFilter, languageFilter]);

  const handleExportExcel = async (specificExamId = null) => {
    try {
      setExporting(true);
      const targetId = specificExamId || examFilter || (selectedExam ? selectedExam._id : '');
      let query = '';
      if (targetId) query += `&examId=${targetId}`;
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
      const targetExam =
        availableExams.find((e) => e._id === targetId) ||
        examsSummary.find((e) => e._id === targetId) ||
        (selectedExam?._id === targetId ? selectedExam : null);
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
      let errMsg = 'Failed to download Excel report.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) errMsg = parsed.message;
        } catch (_) {}
      } else if (err.response?.data?.message) {
        errMsg = err.response.data.message;
      }
      showAlert({
        title: 'Export Failed',
        message: errMsg,
        type: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const idsToAdd = filteredCandidates.map((r) => r._id);
      setSelectedResults((prev) => Array.from(new Set([...prev, ...idsToAdd])));
    } else {
      const idsToRemove = new Set(filteredCandidates.map((r) => r._id));
      setSelectedResults((prev) => prev.filter((id) => !idsToRemove.has(id)));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedResults((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSingleResult = async (attemptId) => {
    const confirmed = await showConfirm({
      title: 'Delete Result Attempt',
      message: 'Are you sure you want to permanently delete this candidate attempt and its submission record?',
      confirmText: 'Delete Result',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/results/${attemptId}`);
      await showAlert({
        title: 'Result Deleted',
        message: 'Exam result deleted successfully.',
        type: 'success',
      });
      setSelectedResults((prev) => prev.filter((id) => id !== attemptId));
      await loadResults();
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete result record.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedResults.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Results',
      message: `Are you sure you want to delete ${selectedResults.length} selected exam attempt(s)? All submitted code and evaluation records will be permanently removed.`,
      confirmText: `Delete ${selectedResults.length} Results`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/results/bulk-delete', {
        ids: selectedResults,
        attemptIds: selectedResults,
        resultIds: selectedResults,
      });
      await showAlert({
        title: 'Results Deleted',
        message: res.data?.message || `Successfully deleted ${selectedResults.length} results.`,
        type: 'success',
      });
      setSelectedResults([]);
      await loadResults();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected results.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDrillIntoExam = (exam) => {
    setSelectedExam(exam);
    setExamFilter(exam._id);
    setPage(1);
    setSelectedResults([]);
  };

  const handleBackToExamsList = () => {
    setSelectedExam(null);
    setExamFilter('');
    setPage(1);
    setSelectedResults([]);
    setResultStatusFilter('');
    setBatchFilter('');
    setGenderFilter('');
    setLanguageFilter('');
    setCandidateSearch('');
  };

  // Filter exams summary by search term
  const filteredExamsSummary = examsSummary.filter((ex) => {
    if (!examSearch.trim()) return true;
    const term = examSearch.toLowerCase();
    const title = ex.title?.toLowerCase() || '';
    const creator = ex.createdBy?.name?.toLowerCase() || '';
    return title.includes(term) || creator.includes(term);
  });

  // Filter candidate results when inside an exam
  const filteredCandidates = results.filter((att) => {
    if (!candidateSearch.trim()) return true;
    const term = candidateSearch.toLowerCase();
    const name = att.userId?.name?.toLowerCase() || '';
    const email = att.userId?.email?.toLowerCase() || '';
    const roll = att.userId?.rollNumber?.toLowerCase() || '';
    const batch = att.userId?.batch?.toLowerCase() || '';
    return name.includes(term) || email.includes(term) || roll.includes(term) || batch.includes(term);
  });

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {selectedExam ? (
            <div>
              <button
                type="button"
                onClick={handleBackToExamsList}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors mb-2 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Back to All Examinations
              </button>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-amber-400" />
                {selectedExam.title}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Candidate performance results • Total Marks: {selectedExam.totalMarks} • Passing: {selectedExam.passingMarks}
              </p>
            </div>
          ) : (
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                {isAdmin ? 'Assessment Results & Reports' : 'My Student Results'}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {viewMode === 'by-exam'
                  ? 'Browse test outcomes organized by examination. Select an exam to view candidate scores.'
                  : 'All individual student attempts across examinations.'}
              </p>
            </div>
          )}
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View mode toggle (when not drilled down) */}
          {!selectedExam && (
            <div className="inline-flex rounded-xl bg-slate-900 p-1 border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setViewMode('by-exam')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'by-exam'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Browse by Exam
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat-candidates')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === 'flat-candidates'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                All Candidates
              </button>
            </div>
          )}

          {/* Bulk delete when candidate rows are selected */}
          {selectedResults.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedResults.length})</span>
            </button>
          )}

          {/* Export Excel Button */}
          <button
            onClick={() => handleExportExcel(selectedExam?._id)}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exporting
              ? 'Exporting...'
              : selectedExam
              ? 'Export This Exam (Excel)'
              : 'Export All Results (Excel)'}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW MODE 1: EXAMINATIONS OVERVIEW (Default)              */}
      {/* ======================================================== */}
      {viewMode === 'by-exam' && !selectedExam && (
        <div className="space-y-4">
          {/* Search bar for exams */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search examination by title or instructor..."
                value={examSearch}
                onChange={(e) => setExamSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing {filteredExamsSummary.length} of {examsSummary.length} examinations
            </div>
          </div>

          {filteredExamsSummary.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
              <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-white">No examinations found</h3>
              <p className="text-xs text-slate-400 mt-1">
                {examSearch ? 'No examinations match your search query.' : 'Created examinations will appear here.'}
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1350px] text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-4 font-semibold">Examination</th>
                      <th className="py-3 px-4 font-semibold">Difficulty</th>
                      <th className="py-3 px-4 font-semibold">Created Date</th>
                      {isAdmin && <th className="py-3 px-4 font-semibold">Instructor</th>}
                      <th className="py-3 px-4 font-semibold">Duration</th>
                      <th className="py-3 px-4 font-semibold">Total Marks</th>
                      <th className="py-3 px-4 font-semibold">Pass Marks</th>
                      <th className="py-3 px-4 font-semibold">Attempted</th>
                      <th className="py-3 px-4 font-semibold">Passed</th>
                      <th className="py-3 px-4 font-semibold">Failed</th>
                      <th className="py-3 px-4 font-semibold">Avg Score</th>
                      <th className="py-3 px-4 font-semibold">Avg %</th>
                      <th className="py-3 px-4 font-semibold">Highest Score</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredExamsSummary.map((ex) => (
                      <tr
                        key={ex._id}
                        className="text-slate-300 hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onClick={() => handleDrillIntoExam(ex)}
                      >
                        <td className="py-3 px-4 max-w-xs truncate" title={ex.title}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                            </div>
                            <span className="font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                              {ex.title}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700/60">
                            {ex.difficulty || 'INTERMEDIATE'}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-400 text-xs whitespace-nowrap">
                          {new Date(ex.createdAt).toLocaleDateString()}
                        </td>

                        {isAdmin && (
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-200">
                                {ex.createdBy?.name || 'Administrator'}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  ex.createdBy?.role === 'FACULTY'
                                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                    : 'text-slate-400 bg-slate-800 border border-slate-700'
                                }`}
                              >
                                {ex.createdBy?.role || 'ADMIN'}
                              </span>
                            </div>
                          </td>
                        )}

                        <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                          {ex.duration}m
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                          {ex.totalMarks}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {ex.passingMarks}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30 font-mono">
                            <Users className="w-3 h-3" />
                            {ex.totalAttempts || 0}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {ex.passedCount || 0}
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-rose-400 whitespace-nowrap">
                          {ex.failedCount || 0}
                        </td>

                        <td className="py-3 px-4 font-mono text-slate-200 whitespace-nowrap">
                          {ex.avgScore || 0} <span className="text-slate-500">/ {ex.totalMarks}</span>
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                          {ex.avgPercentage || 0}%
                        </td>

                        <td className="py-3 px-4 font-mono font-bold text-emerald-400 whitespace-nowrap">
                          {ex.highestScore || 0} <span className="text-slate-500 font-normal">/ {ex.totalMarks}</span>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDrillIntoExam(ex)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-sm shadow-amber-500/20 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Results</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExportExcel(ex._id)}
                              className="p-1.5 rounded-xl bg-slate-800 hover:bg-emerald-600 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="Download Exam Excel"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW MODE 2: CANDIDATE ATTEMPTS TABLE (Filtered by Exam)   */}
      {/* ======================================================== */}
      {(viewMode === 'flat-candidates' || selectedExam) && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Candidate Search */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search candidate name, email, or roll number..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Exam dropdown (only in flat-candidates mode) */}
              {!selectedExam && (
                <select
                  value={examFilter}
                  onChange={(e) => {
                    setExamFilter(e.target.value);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="">All Examinations</option>
                  {availableExams.map((ex) => (
                    <option key={ex._id} value={ex._id}>
                      {ex.title}
                    </option>
                  ))}
                </select>
              )}

              {/* Outcome filter */}
              <select
                value={resultStatusFilter}
                onChange={(e) => {
                  setResultStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">All Outcomes</option>
                <option value="PASS">Passed Candidates</option>
                <option value="FAIL">Failed Candidates</option>
                <option value="PENDING">Pending Evaluation</option>
              </select>

              {/* Batch filter */}
              <select
                value={batchFilter}
                onChange={(e) => {
                  setBatchFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">All Batches</option>
                {availableBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              {/* Gender filter */}
              <select
                value={genderFilter}
                onChange={(e) => {
                  setGenderFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>

              {/* Language filter */}
              <select
                value={languageFilter}
                onChange={(e) => {
                  setLanguageFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">All Languages</option>
                <option value="java">Java</option>
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
          </div>

          {filteredCandidates.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
              <Award className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-white">No candidate evaluation results found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Candidate attempts matching criteria will appear here.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1550px] text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={filteredCandidates.length > 0 && filteredCandidates.every((att) => selectedResults.includes(att._id))}
                          onChange={handleSelectAll}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold">Candidate</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Roll Number</th>
                      {isAdmin && <th className="py-3 px-4 font-semibold">Faculty / Added By</th>}
                      {!selectedExam && <th className="py-3 px-4 font-semibold">Examination</th>}
                      <th className="py-3 px-4 font-semibold">Batch</th>
                      <th className="py-3 px-4 font-semibold">Gender</th>
                      <th className="py-3 px-4 font-semibold">Language(s)</th>
                      <th className="py-3 px-4 font-semibold">Violations</th>
                      <th className="py-3 px-4 font-semibold">Score</th>
                      <th className="py-3 px-4 font-semibold">Percentage</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Submitted Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCandidates.map((att) => {
                      const isSelected = selectedResults.includes(att._id);
                      return (
                        <tr
                          key={att._id}
                          className={`text-slate-300 hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(att._id)}
                              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                {att.userId?.name?.charAt(0) || 'U'}
                              </div>
                              <span className="font-bold">{att.userId?.name || 'Anonymous'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                            {att.userId?.email || '—'}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">
                            {att.userId?.rollNumber || '—'}
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-slate-200">
                                  {att.userId?.createdBy?.name || 'Admin / Direct'}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                    att.userId?.createdBy?.role === 'FACULTY'
                                      ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                                      : 'text-slate-400 bg-slate-800 border border-slate-700'
                                  }`}
                                >
                                  {att.userId?.createdBy?.role || 'SYSTEM'}
                                </span>
                              </div>
                            </td>
                          )}

                          {!selectedExam && (
                            <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap max-w-xs truncate" title={att.examId?.title}>
                              {att.examId?.title || 'Exam'}
                            </td>
                          )}

                          <td className="py-3 px-4 text-indigo-300 font-medium whitespace-nowrap">
                            {att.userId?.batch || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                            {att.userId?.gender || '—'}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {att.languagesUsed && att.languagesUsed.length > 0 ? (
                                att.languagesUsed.map((lang) => (
                                  <span
                                    key={lang}
                                    className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-sky-300"
                                  >
                                    {lang}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-500 font-mono text-[10px]">—</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
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
                          <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                            {att.totalScore} / {att.maxScore}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                            {att.percentage}%
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
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
                          <td className="py-3 px-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(att.submittedAt || att.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </td>
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <Link
                                to={`/admin/results/${att._id}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                                title="Inspect Attempt Details"
                              >
                                <span>Inspect</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteSingleResult(att._id)}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Result"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {pagination.pages > 1 && (
                <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing Page {page} of {pagination.pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= pagination.pages}
                      onClick={() => setPage(page + 1)}
                      className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
