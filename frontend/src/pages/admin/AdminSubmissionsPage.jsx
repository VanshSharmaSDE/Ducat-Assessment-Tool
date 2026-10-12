import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import {
  FileText,
  Download,
  ChevronRight,
  ArrowLeft,
  User,
  Award,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  Copy,
  Check,
  Search,
  Calendar,
  Layers,
  Code2,
  ExternalLink,
  Trash2
} from 'lucide-react';

export default function AdminSubmissionsPage() {
  const { showAlert, showConfirm } = useModal();
  // Navigation level: 'EXAMS' | 'STUDENTS' | 'DETAIL'
  const [currentLevel, setCurrentLevel] = useState('EXAMS');

  // Bulk Selection States
  const [selectedExams, setSelectedExams] = useState([]);
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  // Hierarchy Data States
  const [exams, setExams] = useState([]);
  const [selectedExam, setSelectedExam] = useState(null);

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const [detailData, setDetailData] = useState(null);

  // Loading and Search states
  const [loading, setLoading] = useState(true);
  const [downloadingDocx, setDownloadingDocx] = useState(false);
  const [copiedCodeId, setCopiedCodeId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Fetch Exams (Level 1)
  const loadExamsHierarchy = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/submissions/hierarchy/exams');
      setExams(res.data.data.exams || []);
    } catch (err) {
      console.error('Failed to load exams hierarchy', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamsHierarchy();
  }, []);

  // 2. Select Exam -> Load Students (Level 2)
  const handleSelectExam = async (exam) => {
    setSelectedExam(exam);
    setSelectedStudent(null);
    setDetailData(null);
    setSearchTerm('');
    try {
      setLoading(true);
      const res = await api.get(`/admin/submissions/hierarchy/exams/${exam._id}/students`);
      setStudents(res.data.data.students || []);
      setCurrentLevel('STUDENTS');
    } catch (err) {
      await showAlert({
        title: 'Loading Failed',
        message: err.response?.data?.message || 'Failed to load students for exam',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // 3. Select Student -> Load Detailed Submissions (Level 3)
  const handleSelectStudent = async (studentItem) => {
    if (!studentItem?.user?._id) return;
    setSelectedStudent(studentItem);
    try {
      setLoading(true);
      const res = await api.get(
        `/admin/submissions/hierarchy/exams/${selectedExam._id}/students/${studentItem.user._id}`
      );
      setDetailData(res.data.data);
      setCurrentLevel('DETAIL');
    } catch (err) {
      await showAlert({
        title: 'Loading Failed',
        message: err.response?.data?.message || 'Failed to load student submissions',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // Export DOCX Helper
  const handleExportDocx = async (examId, userId = null, filename = 'submissions.docx') => {
    try {
      setDownloadingDocx(true);
      let query = `?examId=${examId}`;
      if (userId) query += `&userId=${userId}`;

      const response = await api.get(`/admin/submissions/export-docx${query}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert({
        title: 'Export Failed',
        message: err.response?.data?.message || 'Failed to export Word (.docx) document',
        type: 'error',
      });
    } finally {
      setDownloadingDocx(false);
    }
  };

  const handleCopyCode = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  // Navigation Breadcrumb Handlers
  const handleBackToExams = () => {
    setCurrentLevel('EXAMS');
    setSelectedExam(null);
    setSelectedStudent(null);
    setDetailData(null);
    setSearchTerm('');
    setSelectedSubmissions([]);
  };

  const handleBackToStudents = () => {
    setCurrentLevel('STUDENTS');
    setSelectedStudent(null);
    setDetailData(null);
    setSearchTerm('');
    setSelectedSubmissions([]);
  };

  // Level 1: Exam Selection & Bulk Delete Handlers
  const handleSelectAllExams = (e) => {
    if (e.target.checked) {
      setSelectedExams(exams.map((ex) => ex._id));
    } else {
      setSelectedExams([]);
    }
  };

  const handleToggleSelectExam = (id) => {
    setSelectedExams((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteExams = async () => {
    if (selectedExams.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Exams',
      message: `Are you sure you want to permanently delete ${selectedExams.length} selected examination(s) and their student submissions?`,
      confirmText: `Delete ${selectedExams.length} Exams`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post('/admin/exams/bulk-delete', { examIds: selectedExams });
      await showAlert({
        title: 'Exams Deleted',
        message: `Successfully deleted ${selectedExams.length} exam(s).`,
        type: 'success',
      });
      setSelectedExams([]);
      loadExamsHierarchy();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected exams',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Level 2: Student Submission Selection & Bulk Delete Handlers
  const handleSelectAllSubmissions = (e) => {
    if (e.target.checked) {
      setSelectedSubmissions(students.map((s) => s.attemptId).filter(Boolean));
    } else {
      setSelectedSubmissions([]);
    }
  };

  const handleToggleSelectSubmission = (attemptId) => {
    setSelectedSubmissions((prev) =>
      prev.includes(attemptId) ? prev.filter((item) => item !== attemptId) : [...prev, attemptId]
    );
  };

  const handleBulkDeleteSubmissions = async () => {
    if (selectedSubmissions.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Submissions',
      message: `Are you sure you want to permanently delete ${selectedSubmissions.length} selected candidate submission(s)? All recorded answers and evaluation records will be removed.`,
      confirmText: `Delete ${selectedSubmissions.length} Submissions`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post('/admin/results/bulk-delete', { attemptIds: selectedSubmissions });
      await showAlert({
        title: 'Submissions Deleted',
        message: `Successfully deleted ${selectedSubmissions.length} candidate submission(s).`,
        type: 'success',
      });
      setSelectedSubmissions([]);
      const res = await api.get(`/admin/submissions/hierarchy/exams/${selectedExam._id}/students`);
      setStudents(res.data.data.students || []);
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected submissions',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubmission = async (attemptId, studentName) => {
    const confirmed = await showConfirm({
      title: 'Delete Candidate Submission',
      message: `Are you sure you want to delete the submission for "${studentName || 'Candidate'}"? This action cannot be undone.`,
      confirmText: 'Delete Submission',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/results/${attemptId}`);
      await showAlert({
        title: 'Submission Deleted',
        message: 'Submission deleted successfully!',
        type: 'success',
      });
      const res = await api.get(`/admin/submissions/hierarchy/exams/${selectedExam._id}/students`);
      setStudents(res.data.data.students || []);
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete submission',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Page Header & Breadcrumb */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Raw Submissions & Code Archive</h1>
            <p className="text-sm text-slate-400 mt-1">
              Hierarchical examination audit log with live code inspection and Word (.docx) reports
            </p>
          </div>

          {currentLevel === 'STUDENTS' && selectedExam && (
            <button
              onClick={() =>
                handleExportDocx(
                  selectedExam._id,
                  null,
                  `Exam_${selectedExam.title.replace(/\s+/g, '_')}_All_Submissions.docx`
                )
              }
              disabled={downloadingDocx}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingDocx ? 'Generating Word File...' : 'Download Exam Submissions (.docx)'}</span>
            </button>
          )}

          {currentLevel === 'DETAIL' && selectedExam && selectedStudent && (
            <button
              onClick={() =>
                handleExportDocx(
                  selectedExam._id,
                  selectedStudent.user._id,
                  `Candidate_${(selectedStudent.user.name || 'Student').replace(/\s+/g, '_')}_${selectedExam.title.replace(/\s+/g, '_')}.docx`
                )
              }
              disabled={downloadingDocx}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingDocx ? 'Generating Word File...' : 'Download Student Report (.docx)'}</span>
            </button>
          )}
        </div>

        {/* Hierarchical Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
          <button
            onClick={handleBackToExams}
            className={`hover:text-amber-400 transition-colors flex items-center gap-1.5 ${
              currentLevel === 'EXAMS' ? 'text-amber-400 font-bold' : ''
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Exams</span>
          </button>

          {selectedExam && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <button
                onClick={handleBackToStudents}
                className={`hover:text-amber-400 transition-colors max-w-[200px] truncate ${
                  currentLevel === 'STUDENTS' ? 'text-amber-400 font-bold' : ''
                }`}
              >
                {selectedExam.title}
              </button>
            </>
          )}

          {selectedStudent && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="text-amber-400 font-bold max-w-[200px] truncate">
                {selectedStudent.user?.name || 'Candidate Solutions'}
              </span>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-16">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ======================================================== */}
          {/* LEVEL 1: EXAMS LIST                                      */}
          {/* ======================================================== */}
          {currentLevel === 'EXAMS' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative max-w-sm w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search examinations..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="flex items-center gap-3">
                  {selectedExams.length > 0 && (
                    <button
                      onClick={handleBulkDeleteExams}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Selected Exams ({selectedExams.length})</span>
                    </button>
                  )}
                  <span className="text-xs text-slate-400">Total Exams: {exams.length}</span>
                </div>
              </div>

              {exams.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                  <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                  <h3 className="text-base font-semibold text-white">No examinations found</h3>
                  <p className="text-xs text-slate-400 mt-1">Create an exam to start accepting student submissions.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                          <th className="py-3.5 px-4 w-10">
                            <input
                              type="checkbox"
                              checked={exams.length > 0 && selectedExams.length === exams.length}
                              onChange={handleSelectAllExams}
                              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="py-3.5 px-4 font-semibold">Exam Title</th>
                          <th className="py-3.5 px-4 font-semibold">Duration</th>
                          <th className="py-3.5 px-4 font-semibold">Total Marks</th>
                          <th className="py-3.5 px-4 font-semibold">Passing</th>
                          <th className="py-3.5 px-4 font-semibold">Attempts</th>
                          <th className="py-3.5 px-4 font-semibold">Status</th>
                          <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {exams
                          .filter((e) =>
                            searchTerm ? e.title?.toLowerCase().includes(searchTerm.toLowerCase()) : true
                          )
                          .map((exam) => {
                            const isSelected = selectedExams.includes(exam._id);
                            return (
                            <tr key={exam._id} className={`text-slate-300 hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}>
                              <td className="py-3.5 px-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectExam(exam._id)}
                                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-white text-sm">{exam.title}</p>
                                <p className="text-[11px] text-slate-500">ID: {exam._id}</p>
                              </td>
                              <td className="py-3.5 px-4 font-mono">{exam.duration} mins</td>
                              <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{exam.totalMarks}</td>
                              <td className="py-3.5 px-4 font-mono text-slate-400">{exam.passingMarks}</td>
                              <td className="py-3.5 px-4">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 font-mono text-[11px]">
                                  <strong>{exam.completedCount || 0}</strong> completed / {exam.attemptCount || 0} started
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    exam.status === 'PUBLISHED'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-slate-500/10 text-slate-400 border border-slate-700'
                                  }`}
                                >
                                  {exam.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() =>
                                      handleExportDocx(
                                        exam._id,
                                        null,
                                        `Exam_${exam.title.replace(/\s+/g, '_')}_Submissions.docx`
                                      )
                                    }
                                    title="Export all submissions to Word (.docx)"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleSelectExam(exam)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors"
                                  >
                                    <span>View Candidates</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* LEVEL 2: STUDENTS IN SELECTED EXAM                       */}
          {/* ======================================================== */}
          {currentLevel === 'STUDENTS' && selectedExam && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleBackToExams}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Exam List</span>
                  </button>

                  {selectedSubmissions.length > 0 && (
                    <button
                      onClick={handleBulkDeleteSubmissions}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Selected Submissions ({selectedSubmissions.length})</span>
                    </button>
                  )}
                </div>

                <div className="relative max-w-sm w-full">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search candidate name, email, roll no..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {students.length === 0 ? (
                <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
                  <User className="w-12 h-12 mx-auto text-slate-600 mb-3" />
                  <h3 className="text-base font-semibold text-white">No attempts recorded</h3>
                  <p className="text-xs text-slate-400 mt-1">No candidate has attempted this examination yet.</p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                          <th className="py-3.5 px-4 w-10">
                            <input
                              type="checkbox"
                              checked={students.length > 0 && selectedSubmissions.length === students.length}
                              onChange={handleSelectAllSubmissions}
                              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                            />
                          </th>
                          <th className="py-3.5 px-4 font-semibold">Candidate</th>
                          <th className="py-3.5 px-4 font-semibold">Roll No & Batch</th>
                          <th className="py-3.5 px-4 font-semibold">Status</th>
                          <th className="py-3.5 px-4 font-semibold">Score</th>
                          <th className="py-3.5 px-4 font-semibold">Percentage</th>
                          <th className="py-3.5 px-4 font-semibold">Violations</th>
                          <th className="py-3.5 px-4 font-semibold">Submitted At</th>
                          <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {students
                          .filter((item) => {
                            if (!searchTerm) return true;
                            const term = searchTerm.toLowerCase();
                            return (
                              item.user?.name?.toLowerCase().includes(term) ||
                              item.user?.email?.toLowerCase().includes(term) ||
                              item.user?.rollNumber?.toLowerCase().includes(term) ||
                              item.user?.batch?.toLowerCase().includes(term)
                            );
                          })
                          .map((item) => {
                            const isSelected = selectedSubmissions.includes(item.attemptId);
                            return (
                            <tr key={item.attemptId} className={`text-slate-300 hover:bg-slate-800/40 transition-colors ${isSelected ? 'bg-amber-500/5' : ''}`}>
                              <td className="py-3.5 px-4">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectSubmission(item.attemptId)}
                                  className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 cursor-pointer"
                                />
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-bold text-white text-sm">{item.user?.name || 'Candidate'}</p>
                                <p className="text-[11px] text-slate-400">{item.user?.email}</p>
                              </td>
                              <td className="py-3.5 px-4">
                                <p className="font-mono text-slate-200">{item.user?.rollNumber || '-'}</p>
                                <p className="text-[11px] text-slate-500">{item.user?.batch || 'General'}</p>
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    item.status === 'COMPLETED' || item.status === 'EVALUATED'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  }`}
                                >
                                  {item.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 font-mono font-bold text-white">
                                {item.totalScore} / {selectedExam.totalMarks}
                              </td>
                              <td className="py-3.5 px-4">
                                <span
                                  className={`font-mono font-bold ${
                                    item.passed ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {(item.percentage || 0).toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                {item.violationCount > 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono text-[11px]">
                                    <ShieldAlert className="w-3 h-3" />
                                    <span>{item.violationCount}</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-400 text-xs">0</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-slate-500">
                                {item.submittedAt ? new Date(item.submittedAt).toLocaleString() : '-'}
                              </td>
                              <td className="py-3.5 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {item.user?._id && (
                                    <button
                                      onClick={() =>
                                        handleExportDocx(
                                          selectedExam._id,
                                          item.user._id,
                                          `Candidate_${(item.user.name || 'Student').replace(/\s+/g, '_')}.docx`
                                        )
                                      }
                                      title="Export Candidate Solutions to Word (.docx)"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleSelectStudent(item)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors"
                                  >
                                    <span>View Solutions</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubmission(item.attemptId, item.user?.name)}
                                    disabled={actionLoading}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                    title="Delete Submission"
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
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* LEVEL 3: DETAILED CANDIDATE SUBMISSION VIEW              */}
          {/* ======================================================== */}
          {currentLevel === 'DETAIL' && detailData && (
            <div className="space-y-6">
              <button
                onClick={handleBackToStudents}
                className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Candidate List</span>
              </button>

              {/* Candidate Info Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
                      {detailData.student?.name?.[0] || 'C'}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">{detailData.student?.name}</h2>
                      <p className="text-xs text-slate-400">{detailData.student?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        detailData.attempt?.passed
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {detailData.attempt?.passed ? 'PASSED' : 'FAILED'}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-slate-800 text-slate-200">
                      Score: {detailData.attempt?.totalScore} / {detailData.exam?.totalMarks} (
                      {(detailData.attempt?.percentage || 0).toFixed(1)}%)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block">Roll Number</span>
                    <span className="font-mono text-slate-200 font-semibold">{detailData.student?.rollNumber || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Batch & Gender</span>
                    <span className="text-slate-200 font-semibold">
                      {detailData.student?.batch || 'Default'} ({detailData.student?.gender || 'N/A'}, Age: {detailData.student?.age || '-'})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Violations Logged</span>
                    <span className="font-mono text-rose-400 font-semibold">{detailData.attempt?.violationCount || 0} alerts</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Submitted Time</span>
                    <span className="text-slate-200 font-semibold">
                      {detailData.attempt?.submittedAt ? new Date(detailData.attempt.submittedAt).toLocaleTimeString() : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Submissions List per Question */}
              <div className="space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-amber-400" />
                  <span>Submitted Solutions ({detailData.submissions?.length || 0})</span>
                </h3>

                {detailData.submissions?.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-xs">
                    No solutions submitted for this exam attempt.
                  </div>
                ) : (
                  detailData.submissions.map((sub, index) => (
                    <div
                      key={sub._id || index}
                      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-4 p-5"
                    >
                      {/* Question Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-400 font-bold text-xs">Q{index + 1}.</span>
                            <h4 className="text-sm font-bold text-white">{sub.questionId?.title || 'Coding Problem'}</h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300">
                              {sub.questionId?.marks || 10} Marks
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-mono text-[10px] uppercase font-bold">
                            {sub.language}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sub.status === 'ACCEPTED'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          >
                            {sub.status}
                          </span>
                        </div>
                      </div>

                      {/* Source Code Section */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span className="font-semibold flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5 text-slate-500" />
                            <span>Submitted Source Code</span>
                          </span>
                          <button
                            onClick={() => handleCopyCode(sub._id, sub.sourceCode)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                          >
                            {copiedCodeId === sub._id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Code</span>
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-80">
                          {sub.sourceCode}
                        </pre>
                      </div>

                      {/* Test Cases Results */}
                      {sub.result?.testCases && sub.result.testCases.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/60">
                          <h5 className="text-xs font-semibold text-slate-300">
                            Test Cases Suite Results ({sub.result.testCases.filter((tc) => tc.passed).length} / {sub.result.testCases.length} Passed)
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                            {sub.result.testCases.map((tc, tcIdx) => (
                              <div
                                key={tcIdx}
                                className={`p-2.5 rounded-xl border text-[11px] flex items-center justify-between ${
                                  tc.passed
                                    ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                                    : 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                                }`}
                              >
                                <span className="font-semibold">Test Case #{tcIdx + 1} {tc.isHidden ? '(Hidden)' : '(Sample)'}</span>
                                <span className="font-mono font-bold">
                                  {tc.passed ? 'PASSED' : 'FAILED'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
