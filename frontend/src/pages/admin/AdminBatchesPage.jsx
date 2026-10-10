import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import {
  Layers,
  Plus,
  Users,
  Search,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  UserMinus,
  GraduationCap,
  Calendar,
  Building
} from 'lucide-react';

export default function AdminBatchesPage() {
  const { user } = useAuth();
  const { showConfirm } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    department: '',
    description: '',
  });

  // Manage students modal
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [batchStudents, setBatchStudents] = useState([]);
  const [allAvailableStudents, setAllAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [activeTab, setActiveTab] = useState('enrolled'); // 'enrolled' or 'add'
  const [loadingStudents, setLoadingStudents] = useState(false);

  const showBanner = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadBatches = async () => {
    try {
      const res = await api.get(`/admin/batches${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      setBatches(res.data.data.batches || []);
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to fetch batches', true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [searchTerm]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.post('/admin/batches', formData);
      showBanner(`Batch "${formData.name}" created successfully!`);
      setShowCreateModal(false);
      setFormData({ name: '', department: '', description: '' });
      await loadBatches();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to create batch', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (b) => {
    setSelectedBatch(b);
    setFormData({
      name: b.name,
      department: b.department || '',
      description: b.description || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;
    try {
      setActionLoading(true);
      await api.put(`/admin/batches/${selectedBatch._id}`, formData);
      showBanner(`Batch "${formData.name}" updated successfully!`);
      setShowEditModal(false);
      setSelectedBatch(null);
      await loadBatches();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to update batch', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBatch = async (b) => {
    const confirmed = await showConfirm({
      title: 'Delete Batch',
      message: `Are you sure you want to delete batch "${b.name}"? Assigned students will have their batch cleared.`,
      confirmText: 'Delete Batch',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/batches/${b._id}`);
      showBanner(`Batch "${b.name}" deleted successfully!`);
      await loadBatches();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete batch', true);
    } finally {
      setActionLoading(false);
    }
  };

  const openManageStudents = async (b) => {
    setSelectedBatch(b);
    setActiveTab('enrolled');
    setSelectedStudentIds([]);
    setStudentSearch('');
    setShowManageStudentsModal(true);
    setLoadingStudents(true);

    try {
      // 1. Fetch current students in this batch
      const batchRes = await api.get(`/admin/batches/${b._id}`);
      setBatchStudents(batchRes.data.data.batch.students || []);

      // 2. Fetch candidate pool (all students this user can manage)
      const usersRes = await api.get('/admin/users?limit=100');
      setAllAvailableStudents(usersRes.data.data.users || []);
    } catch (err) {
      showBanner('Failed to load batch students', true);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!selectedBatch) return;
    try {
      setActionLoading(true);
      await api.post(`/admin/batches/${selectedBatch._id}/remove-student`, { studentId });
      setBatchStudents((prev) => prev.filter((s) => s._id !== studentId));
      showBanner('Student removed from batch');
      await loadBatches();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to remove student', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddStudents = async () => {
    if (!selectedBatch || selectedStudentIds.length === 0) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/batches/${selectedBatch._id}/students`, {
        studentIds: selectedStudentIds,
      });
      showBanner(res.data.message || 'Students added successfully!');
      setSelectedStudentIds([]);
      // Reload batch students
      const batchRes = await api.get(`/admin/batches/${selectedBatch._id}`);
      setBatchStudents(batchRes.data.data.batch.students || []);
      setActiveTab('enrolled');
      await loadBatches();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to add students', true);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const candidatePool = allAvailableStudents.filter((s) => {
    const isAlreadyEnrolled = batchStudents.some((bs) => bs._id === s._id);
    if (isAlreadyEnrolled) return false;
    if (!studentSearch) return true;
    const match = s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                  s.email?.toLowerCase().includes(studentSearch.toLowerCase()) ||
                  s.rollNumber?.toLowerCase().includes(studentSearch.toLowerCase());
    return match;
  });

  const totalStudentsEnrolled = batches.reduce((acc, b) => acc + (b.studentCount || 0), 0);

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
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-400" />
            {isAdmin ? 'Batch Management' : 'My Batches'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin
              ? 'Organize students into batches, track faculty attribution, and bulk manage enrollments'
              : 'Create cohorts for your students and assign candidates into dedicated batches'}
          </p>
        </div>

        <button
          onClick={() => {
            setFormData({ name: '', department: '', description: '' });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Batch</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-2 ${
            notification.isError
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
          }`}
        >
          {notification.isError ? (
            <AlertCircle className="w-4 h-4 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          )}
          <span>{notification.msg}</span>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Batches</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{batches.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Active student sections / cohorts</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-indigo-400">{totalStudentsEnrolled}</div>
          <p className="text-[11px] text-slate-500 mt-1">Assigned to your batches</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Role Scope</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-lg font-bold text-emerald-400">
            {isAdmin ? 'System Administrator' : 'Faculty Instructor'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {isAdmin ? 'Full system visibility across all faculties' : 'Private cohorts isolated to your students'}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search batches by name, department, or description..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Batches Table */}
      {batches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Layers className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No batches created yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Click "Create New Batch" to set up your first student batch or cohort.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Batch Name</th>
                  <th className="py-3.5 px-4 font-semibold">Department</th>
                  <th className="py-3.5 px-4 font-semibold">Description</th>
                  <th className="py-3.5 px-4 font-semibold">Students Enrolled</th>
                  {isAdmin && <th className="py-3.5 px-4 font-semibold">Created By (Faculty)</th>}
                  <th className="py-3.5 px-4 font-semibold">Created Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {batches.map((b) => (
                  <tr key={b._id} className="text-slate-300 hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                          {b.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-300">
                      {b.department || <span className="text-slate-500 italic">General</span>}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                      {b.description || '-'}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => openManageStudents(b)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors font-semibold cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{b.studentCount || 0} Students</span>
                      </button>
                    </td>

                    {isAdmin && (
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                            b.createdBy?.role === 'FACULTY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {b.createdBy?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{b.createdBy?.name || 'Administrator'}</p>
                            <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              b.createdBy?.role === 'FACULTY' ? 'text-emerald-400' : 'text-amber-400'
                            }`}>
                              {b.createdBy?.role || 'ADMIN'}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openManageStudents(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                          title="Manage Enrolled Students"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors cursor-pointer"
                          title="Edit Batch"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(b)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                          title="Delete Batch"
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

      {/* Create Batch Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                Create New Batch
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Batch Name / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. 2026-CSE-Section-A"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">This will be assigned to students as their batch identifier.</p>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Department / Branch
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Computer Science, Information Tech"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes or details regarding this cohort..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Batch Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                Edit Batch Details
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Batch Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Renaming will automatically update all enrolled students.</p>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Students in Batch Modal */}
      {showManageStudentsModal && selectedBatch && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl p-6 text-slate-200 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  Manage Students: <span className="text-amber-400">{selectedBatch.name}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {batchStudents.length} student(s) currently enrolled in this batch
                </p>
              </div>
              <button
                onClick={() => setShowManageStudentsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 mt-4 shrink-0">
              <button
                onClick={() => setActiveTab('enrolled')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'enrolled'
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Enrolled Students ({batchStudents.length})
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'add'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                + Add Students to Batch
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto py-4">
              {loadingStudents ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeTab === 'enrolled' ? (
                <div>
                  {batchStudents.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">
                      <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                      <p className="text-xs">No students currently enrolled in this batch.</p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="mt-3 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Enroll Students Now
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                            <th className="py-2.5 px-3 font-semibold">Student Name</th>
                            <th className="py-2.5 px-3 font-semibold">Email</th>
                            <th className="py-2.5 px-3 font-semibold">Roll Number</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {batchStudents.map((s) => (
                            <tr key={s._id} className="text-slate-300 hover:bg-slate-800/40">
                              <td className="py-2.5 px-3 font-semibold text-white">{s.name}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">{s.email}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-300">{s.rollNumber || '-'}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleRemoveStudent(s._id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-[11px] font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search students to add by name, email, or roll..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {candidatePool.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      No matching unenrolled students found.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-slate-800 rounded-xl divide-y divide-slate-800/60 bg-slate-950">
                      {candidatePool.map((cand) => {
                        const isSelected = selectedStudentIds.includes(cand._id);
                        return (
                          <div
                            key={cand._id}
                            onClick={() => toggleSelectStudent(cand._id)}
                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? 'bg-amber-500/10' : 'hover:bg-slate-900'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 pointer-events-none"
                              />
                              <div>
                                <p className="font-semibold text-white text-xs">{cand.name}</p>
                                <p className="text-[11px] text-slate-400 font-mono">
                                  {cand.email} {cand.rollNumber ? `• Roll: ${cand.rollNumber}` : ''}
                                  {cand.batch ? ` (Current: ${cand.batch})` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                              {cand.gender || 'Student'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-slate-400">
                      {selectedStudentIds.length} candidate(s) selected
                    </span>
                    <button
                      onClick={handleAddStudents}
                      disabled={actionLoading || selectedStudentIds.length === 0}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{actionLoading ? 'Assigning...' : `Add Selected to Batch`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setShowManageStudentsModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 cursor-pointer"
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
