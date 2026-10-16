import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import {
  FileCheck2,
  Plus,
  Copy,
  Trash2,
  Edit,
  Clock,
  Award,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  Download,
  UserCheck
} from 'lucide-react';

export default function AdminExamsPage() {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadExams = async () => {
    try {
      const res = await api.get('/admin/exams');
      setExams(res.data.data.exams || []);
    } catch (err) {
      setError('Failed to fetch exams.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  const handleDuplicate = async (id) => {
    try {
      setActionLoading(true);
      await api.post(`/admin/exams/${id}/duplicate`);
      await loadExams();
    } catch (err) {
      await showAlert({
        title: 'Duplicate Failed',
        message: err.response?.data?.message || 'Failed to duplicate exam',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Examination',
      message: 'Are you sure you want to delete/archive this exam?',
      confirmText: 'Delete Exam',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/exams/${id}`);
      setSelectedExams((prev) => prev.filter((item) => item !== id));
      await loadExams();
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete exam',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePublish = async (exam) => {
    try {
      setActionLoading(true);
      await api.put(`/admin/exams/${exam._id}`, {
        isPublished: !exam.isPublished,
        status: !exam.isPublished ? 'ACTIVE' : 'DRAFT',
      });
      await loadExams();
    } catch (err) {
      await showAlert({
        title: 'Status Update Failed',
        message: err.response?.data?.message || 'Failed to update exam status',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExamExcel = async (exam) => {
    try {
      setActionLoading(true);
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const response = await api.get(`/admin/exams/${exam._id}/export-excel?timezone=${encodeURIComponent(tz)}`, {
        responseType: 'blob',
      });
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${exam.title.replace(/[^a-zA-Z0-9_\-]/g, '_')}_Results.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert({
        title: 'Export Failed',
        message: 'Failed to download exam report.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const [selectedExams, setSelectedExams] = useState([]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedExams(exams.map((ex) => ex._id));
    } else {
      setSelectedExams([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedExams((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedExams.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Examinations',
      message: `Are you sure you want to permanently delete ${selectedExams.length} selected examination(s)? This will also delete all candidate submissions and attempts associated with them.`,
      confirmText: `Delete ${selectedExams.length} Exams`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/exams/bulk-delete', {
        ids: selectedExams,
        examIds: selectedExams,
      });
      await showAlert({
        title: 'Exams Deleted',
        message: res.data?.message || `Successfully deleted ${selectedExams.length} examination(s).`,
        type: 'success',
      });
      setSelectedExams([]);
      await loadExams();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected exams.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {isAdmin ? 'Examinations Manager' : 'My Examinations'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin 
              ? 'View all assessments created by faculty & administrators with full attribution' 
              : 'Configure, schedule, publish, and duplicate your personal examinations'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedExams.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/15 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedExams.length})</span>
            </button>
          )}

          <Link
            to="/admin/exams/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm shadow-blue-600/15 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Examination</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 shadow-sm">
          <FileCheck2 className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No examinations found</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Create Examination" to build your first assessment.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1300px] text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={exams.length > 0 && selectedExams.length === exams.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">Examination</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold">Created By</th>}
                  <th className="py-3 px-4 font-semibold">Questions</th>
                  <th className="py-3 px-4 font-semibold">Duration</th>
                  <th className="py-3 px-4 font-semibold">Total Marks</th>
                  <th className="py-3 px-4 font-semibold">Pass Marks</th>
                  <th className="py-3 px-4 font-semibold">Start Time</th>
                  <th className="py-3 px-4 font-semibold">Expire Time</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {exams.map((exam) => {
                  const isSelected = selectedExams.includes(exam._id);
                  return (
                    <tr
                      key={exam._id}
                      className={`text-slate-600 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(exam._id)}
                          className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-800 text-xs truncate" title={exam.title}>
                            {exam.title}
                          </span>
                          {((exam.targetTechnologies?.length > 0 ? exam.targetTechnologies : (exam.technology ? [exam.technology] : []))).length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {((exam.targetTechnologies?.length > 0 ? exam.targetTechnologies : [exam.technology])).slice(0, 3).map((tech) => (
                                <span key={tech} className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  {tech}
                                </span>
                              ))}
                              {((exam.targetTechnologies?.length > 0 ? exam.targetTechnologies : [exam.technology])).length > 3 && (
                                <span className="text-[9px] text-slate-400">
                                  +{((exam.targetTechnologies?.length > 0 ? exam.targetTechnologies : [exam.technology])).length - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {exam.targetBatches && exam.targetBatches.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1">
                              {exam.targetBatches.slice(0, 3).map((batch) => (
                                <span key={batch} className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  {batch}
                                </span>
                              ))}
                              {exam.targetBatches.length > 3 && (
                                <span className="text-[9px] text-slate-400">
                                  +{exam.targetBatches.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap max-w-[220px] truncate" title={exam.description || ''}>
                        {exam.description || '—'}
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-700">
                              {exam.createdBy?.name || 'Administrator'}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                exam.createdBy?.role === 'FACULTY'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                  : 'bg-blue-50 text-blue-600 border border-blue-200'
                              }`}
                            >
                              {exam.createdBy?.role || 'ADMIN'}
                            </span>
                          </div>
                        </td>
                      )}

                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {exam.questionCount || exam.questions?.length || 0} Qs
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {exam.duration}m
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {exam.totalMarks}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-600">
                        {exam.passingMarks}
                      </td>
                      <td className="py-3 px-4 font-mono text-emerald-600 text-[11px] whitespace-nowrap">
                        {exam.startDate ? new Date(exam.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="py-3 px-4 font-mono text-rose-600 text-[11px] whitespace-nowrap">
                        {exam.endDate ? new Date(exam.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleTogglePublish(exam)}
                          disabled={actionLoading}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                            exam.isPublished
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200'
                          }`}
                        >
                          {exam.isPublished ? '● PUBLISHED' : '○ DRAFT'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleExportExamExcel(exam)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Export Exam Results (.xlsx)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            to={`/admin/exams/${exam._id}/edit`}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit Exam"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDuplicate(exam._id)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Duplicate Exam"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exam._id)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete Exam"
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
  );
}
