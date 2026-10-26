import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import {
  Award,
  Search,
  Eye,
  ArrowRight,
  Download,
  ShieldAlert,
  Trash2,
  Users,
  RotateCcw,
  FileText,
  Ban,
  Radio,
} from 'lucide-react';

export default function AdminResultsPage() {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const { socket } = useSocket();
  const [results, setResults] = useState([]);
  const [selectedResults, setSelectedResults] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filters
  const [candidateSearch, setCandidateSearch] = useState('');
  const [resultStatusFilter, setResultStatusFilter] = useState('');
  const [examFilter, setExamFilter] = useState('');
  const [technologyFilter, setTechnologyFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');

  const [availableExams, setAvailableExams] = useState([]);
  const [availableTechnologies, setAvailableTechnologies] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableGenders, setAvailableGenders] = useState([]);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  const loadResults = async () => {
    try {
      let query = `?page=${page}&limit=20`;
      if (resultStatusFilter) query += `&resultStatus=${resultStatusFilter}`;
      if (examFilter) query += `&examId=${examFilter}`;
      if (technologyFilter) query += `&technology=${encodeURIComponent(technologyFilter)}`;
      if (batchFilter) query += `&batch=${encodeURIComponent(batchFilter)}`;
      if (genderFilter) query += `&gender=${encodeURIComponent(genderFilter)}`;
      if (languageFilter) query += `&language=${encodeURIComponent(languageFilter)}`;

      const res = await api.get(`/admin/results${query}`);
      setResults(res.data.data.results || []);
      setPagination(res.data.data.pagination || { total: 0, pages: 1 });
      if (res.data.data.availableExams) setAvailableExams(res.data.data.availableExams);
      if (res.data.data.availableTechnologies) setAvailableTechnologies(res.data.data.availableTechnologies);
      if (res.data.data.availableBatches) setAvailableBatches(res.data.data.availableBatches);
      if (res.data.data.availableGenders) setAvailableGenders(res.data.data.availableGenders);
    } catch (err) {
      console.error('Failed to load results', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time proctoring listener to update violation counts live & track started/terminated exams
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
              resultStatus: data.terminated ? 'TERMINATED' : r.resultStatus,
              terminationReason: data.terminationReason || r.terminationReason,
            };
          }
          return r;
        })
      );
    };

    const handleAttemptStarted = () => {
      // Reload results when a student begins an exam so they appear as ONGOING live
      loadResults();
    };

    const handleExamTerminated = (data) => {
      setResults((prev) =>
        prev.map((r) => {
          if (r._id === data.attemptId) {
            return {
              ...r,
              status: 'TERMINATED',
              resultStatus: 'TERMINATED',
              terminationReason: data.reason || r.terminationReason,
            };
          }
          return r;
        })
      );
    };

    socket.on('proctoring:violation', handleViolation);
    socket.on('attempt:started', handleAttemptStarted);
    socket.on('exam:terminated', handleExamTerminated);

    return () => {
      socket.off('proctoring:violation', handleViolation);
      socket.off('attempt:started', handleAttemptStarted);
      socket.off('exam:terminated', handleExamTerminated);
    };
  }, [socket]);

  useEffect(() => {
    loadResults();
  }, [page, resultStatusFilter, examFilter, technologyFilter, batchFilter, genderFilter, languageFilter]);

  const handleExportExcel = async () => {
    try {
      setExporting(true);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const params = [`timezone=${encodeURIComponent(tz)}`];
      if (examFilter) params.push(`examId=${examFilter}`);
      if (resultStatusFilter) params.push(`resultStatus=${encodeURIComponent(resultStatusFilter)}`);
      if (technologyFilter) params.push(`technology=${encodeURIComponent(technologyFilter)}`);
      if (batchFilter) params.push(`batch=${encodeURIComponent(batchFilter)}`);
      if (genderFilter) params.push(`gender=${encodeURIComponent(genderFilter)}`);
      if (languageFilter) params.push(`language=${encodeURIComponent(languageFilter)}`);
      if (candidateSearch && candidateSearch.trim()) params.push(`search=${encodeURIComponent(candidateSearch.trim())}`);
      if (selectedResults && selectedResults.length > 0) params.push(`attemptIds=${encodeURIComponent(selectedResults.join(','))}`);
      const query = `?${params.join('&')}`;

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

  const handleExportDocx = async (specificExamId = null, specificUserId = null) => {
    try {
      setExportingDocx(true);
      const targetExamId = specificExamId || examFilter;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const params = [`timezone=${encodeURIComponent(tz)}`];
      if (targetExamId) params.push(`examId=${targetExamId}`);
      if (specificUserId) params.push(`userId=${specificUserId}`);
      const query = `?${params.join('&')}`;

      const response = await api.get(`/admin/submissions/export-docx${query}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const targetExam = availableExams.find((e) => e._id === targetExamId);
      const filename = specificUserId
        ? `Candidate_Submission_${Date.now()}.docx`
        : (targetExam
          ? `Exam_${targetExam.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_All_Submissions.docx`
          : 'All_Exams_Submissions.docx');
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX Export error:', err);
      let errMsg = 'Failed to download Word (.docx) document.';
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
      setExportingDocx(false);
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

  const handleAllowRetake = async (att) => {
    const studentName = att.userId?.name || 'this candidate';
    const examTitle = att.examId?.title || 'this exam';

    const confirmed = await showConfirm({
      title: 'Allow Exam Retake',
      message: `Are you sure you want to allow ${studentName} to retake "${examTitle}"? Their previous attempt, score, violations, and submitted code will be deleted automatically so they can take the examination fresh.`,
      confirmText: 'Allow Retake',
      isDanger: false,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/admin/results/${att._id}/allow-retake`);
      await showAlert({
        title: 'Retake Granted',
        message: res.data?.message || 'Retake allowed successfully. The student can now take the exam again.',
        type: 'success',
      });
      setSelectedResults((prev) => prev.filter((id) => id !== att._id));
      await loadResults();
    } catch (err) {
      await showAlert({
        title: 'Retake Action Failed',
        message: err.response?.data?.message || 'Failed to grant retake for this candidate.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTerminateAttempt = async (att) => {
    const studentName = att.userId?.name || 'this candidate';
    const examTitle = att.examId?.title || 'the exam';

    const reason = window.prompt(
      `Terminate ${studentName}'s exam for "${examTitle}" immediately?\n\nEnter termination reason:`,
      'Administrative termination for proctoring/policy non-compliance'
    );
    if (reason === null) return; // User pressed Cancel

    const finalReason = reason.trim() || 'Terminated by examination proctor/administrator';

    try {
      setActionLoading(true);
      const res = await api.post(`/admin/results/${att._id}/terminate`, { reason: finalReason });
      await showAlert({
        title: 'Attempt Terminated',
        message: res.data?.message || 'Candidate attempt has been terminated.',
        type: 'warning',
      });
      await loadResults();
    } catch (err) {
      await showAlert({
        title: 'Termination Failed',
        message: err.response?.data?.message || 'Failed to terminate candidate attempt.',
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

  // Filter candidate results
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            {isAdmin ? 'Assessment Results & Reports' : 'My Student Results'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            All individual student attempts across examinations.
          </p>
        </div>

        {/* Header Right Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Bulk delete when candidate rows are selected */}
          {selectedResults.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/15 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedResults.length})</span>
            </button>
          )}

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/15 transition-all shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {exporting
              ? 'Exporting...'
              : examFilter
              ? 'Export Selected Exam (Excel)'
              : 'Export All Results (Excel)'}
          </button>

          {/* Export Word Doc Button */}
          <button
            onClick={() => handleExportDocx()}
            disabled={exportingDocx}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/15 transition-all shrink-0 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {exportingDocx
              ? 'Exporting Word...'
              : examFilter
              ? 'Export Selected Exam (Word)'
              : 'Export All (Word)'}
          </button>
        </div>
      </div>

      {/* Candidate Evaluation Results Table Section */}
      <div className="space-y-4">
        {/* Filter Toolbar */}
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Candidate Search */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name, email, or roll number..."
              value={candidateSearch}
              onChange={(e) => setCandidateSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Exam dropdown */}
            <select
              value={examFilter}
              onChange={(e) => {
                setExamFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Examinations</option>
              {availableExams.map((ex) => (
                <option key={ex._id} value={ex._id}>
                  {ex.title}
                </option>
              ))}
            </select>

            {/* Outcome filter */}
            <select
              value={resultStatusFilter}
              onChange={(e) => {
                setResultStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Outcomes</option>
              <option value="PASS">Passed Candidates</option>
              <option value="FAIL">Failed Candidates</option>
              <option value="TERMINATED">Terminated Candidates</option>
              <option value="ONGOING">Ongoing / Taking Exam</option>
              <option value="PENDING">Pending Evaluation</option>
            </select>

            {/* Technology filter */}
            <select
              value={technologyFilter}
              onChange={(e) => {
                setTechnologyFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Technologies</option>
              {availableTechnologies.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Batch filter */}
            <select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
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
              className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="">All Languages</option>
              <option value="java">Java</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>
        </div>

        {filteredCandidates.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm">
            <Award className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500 mb-3" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">No candidate evaluation results found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Candidate attempts matching criteria will appear here.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1550px] text-left text-xs whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={filteredCandidates.length > 0 && filteredCandidates.every((att) => selectedResults.includes(att._id))}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4 font-semibold">Candidate</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Roll Number</th>
                    {isAdmin && <th className="py-3 px-4 font-semibold">Faculty / Added By</th>}
                    <th className="py-3 px-4 font-semibold">Examination</th>
                    <th className="py-3 px-4 font-semibold">Technology</th>
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredCandidates.map((att) => {
                    const isSelected = selectedResults.includes(att._id);
                    return (
                      <tr
                        key={att._id}
                        className={`text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                          isSelected ? 'bg-blue-50/50 dark:bg-blue-950/40' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(att._id)}
                            className="w-4 h-4 rounded bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                              {att.userId?.name?.charAt(0) || 'U'}
                            </div>
                            <span className="font-bold">{att.userId?.name || 'Anonymous'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {att.userId?.email || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {att.userId?.rollNumber || '—'}
                        </td>

                        {isAdmin && (
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {att.userId?.createdBy?.name || 'Admin / Direct'}
                              </span>
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                  att.userId?.createdBy?.role === 'FACULTY'
                                    ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800'
                                    : 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                                }`}
                              >
                                {att.userId?.createdBy?.role || 'SYSTEM'}
                              </span>
                            </div>
                          </td>
                        )}

                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap max-w-xs truncate" title={att.examId?.title}>
                          {att.examId?.title || 'Exam'}
                        </td>

                        <td className="py-3 px-4 text-blue-700 dark:text-blue-400 font-medium whitespace-nowrap">
                          {att.userId?.technology || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                          {att.userId?.batch || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {att.userId?.gender || '—'}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            {att.languagesUsed && att.languagesUsed.length > 0 ? (
                              att.languagesUsed.map((lang) => (
                                <span
                                  key={lang}
                                  className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono text-blue-700 dark:text-blue-400 border border-slate-200 dark:border-slate-700"
                                >
                                  {lang}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px]">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              (att.violationCount || 0) > 0
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            }`}
                          >
                            <ShieldAlert className="w-3 h-3" />
                            {att.violationCount || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                          {att.status === 'IN_PROGRESS' || att.resultStatus === 'ONGOING' ? (
                            <span className="text-blue-600 dark:text-blue-400 font-semibold italic text-xs">In Progress</span>
                          ) : (
                            `${att.totalScore} / ${att.maxScore}`
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                          {att.status === 'IN_PROGRESS' || att.resultStatus === 'ONGOING' ? (
                            <span className="text-slate-400 dark:text-slate-500 font-normal">—</span>
                          ) : (
                            `${att.percentage}%`
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {att.resultStatus === 'TERMINATED' ? (
                            <div className="flex flex-col gap-0.5 max-w-[220px]">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 w-fit">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                                TERMINATED
                              </span>
                              {att.terminationReason && (
                                <span className="text-[10px] text-rose-600 dark:text-rose-400 truncate font-medium" title={att.terminationReason}>
                                  Reason: {att.terminationReason}
                                </span>
                              )}
                            </div>
                          ) : att.resultStatus === 'ONGOING' || att.status === 'IN_PROGRESS' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
                              ONGOING
                            </span>
                          ) : att.resultStatus === 'PASS' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                              PASS
                            </span>
                          ) : att.resultStatus === 'FAIL' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                              FAIL
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800">
                              {att.resultStatus || 'PENDING'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                          {att.status === 'IN_PROGRESS' || att.resultStatus === 'ONGOING' ? (
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              Started: {new Date(att.startedAt || att.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          ) : (
                            new Date(att.submittedAt || att.startedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {att.status === 'IN_PROGRESS' && (
                              <button
                                onClick={() => handleTerminateAttempt(att)}
                                disabled={actionLoading}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold transition-colors cursor-pointer"
                                title="Terminate Candidate's Live Exam Session"
                              >
                                <Ban className="w-3.5 h-3.5" />
                                <span>Terminate</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleAllowRetake(att)}
                              disabled={actionLoading}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-semibold transition-colors cursor-pointer"
                              title="Allow Student to Retake Exam (resets prior attempt)"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Allow Retake</span>
                            </button>
                            <Link
                              to={`/admin/results/${att._id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                              title="Inspect Attempt Details"
                            >
                              <span>Inspect</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleExportDocx(att.examId?._id, att.userId?._id)}
                              disabled={exportingDocx}
                              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
                              title="Download Candidate Word (.docx) Dossier"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSingleResult(att._id)}
                              disabled={actionLoading}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
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
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  Showing Page {page} of {pagination.pages}
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= pagination.pages}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
