import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
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
      alert(err.response?.data?.message || 'Failed to duplicate exam');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete/archive this exam?')) return;
    try {
      setActionLoading(true);
      await api.delete(`/admin/exams/${id}`);
      await loadExams();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete exam');
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
      alert(err.response?.data?.message || 'Failed to update exam status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportExamExcel = async (exam) => {
    try {
      setActionLoading(true);
      const response = await api.get(`/admin/exams/${exam._id}/export-excel`, {
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
      alert('Failed to download exam report.');
    } finally {
      setActionLoading(false);
    }
  };

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
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isAdmin ? 'Examinations Manager' : 'My Examinations'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin 
              ? 'View all assessments created by faculty & administrators with full attribution' 
              : 'Configure, schedule, publish, and duplicate your personal examinations'}
          </p>
        </div>

        <Link
          to="/admin/exams/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Examination</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <FileCheck2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No examinations found</h3>
          <p className="text-xs text-slate-400 mt-1">Click "Create Examination" to build your first assessment.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Title</th>
                  {isAdmin && <th className="py-3.5 px-4 font-semibold">Created By (Faculty)</th>}
                  <th className="py-3.5 px-4 font-semibold">Questions</th>
                  <th className="py-3.5 px-4 font-semibold">Duration</th>
                  <th className="py-3.5 px-4 font-semibold">Marks</th>
                  <th className="py-3.5 px-4 font-semibold">Schedule</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {exams.map((exam) => (
                  <tr key={exam._id} className="text-slate-300 hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white text-sm">{exam.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{exam.description || 'No description provided'}</p>
                    </td>

                    {isAdmin && (
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                            exam.createdBy?.role === 'FACULTY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {exam.createdBy?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{exam.createdBy?.name || 'Administrator'}</p>
                            <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                              exam.createdBy?.role === 'FACULTY' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}>
                              {exam.createdBy?.role || 'ADMIN'}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-3.5 px-4 font-mono font-medium">{exam.questionCount || exam.questions?.length || 0} Qs</td>
                    <td className="py-3.5 px-4 font-mono">{exam.duration}m</td>
                    <td className="py-3.5 px-4 font-mono">{exam.totalMarks} (Pass: {exam.passingMarks})</td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(exam.startDate).toLocaleDateString()} - {new Date(exam.endDate).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleTogglePublish(exam)}
                        disabled={actionLoading}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                          exam.isPublished
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-rose-500/10 hover:text-rose-400'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-emerald-500/10 hover:text-emerald-400'
                        }`}
                      >
                        {exam.isPublished ? '● PUBLISHED' : '○ DRAFT'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleExportExamExcel(exam)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                          title="Export Exam Results (.xlsx)"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          to={`/admin/exams/${exam._id}/edit`}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Edit Exam"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(exam._id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Duplicate Exam"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(exam._id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete / Archive Exam"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
  );
}
