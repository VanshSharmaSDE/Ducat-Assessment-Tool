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
  const { showConfirm, showAlert } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const [batches, setBatches] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const loadBatches = async () => {
    try {
      const res = await api.get(`/admin/batches${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`);
      setBatches(res.data.data.batches || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
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
      setShowCreateModal(false);
      setFormData({ name: '', department: '', description: '' });
      await showAlert({
        title: 'Technology Created',
        message: `Technology "${formData.name}" created successfully!`,
        type: 'success',
      });
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Failed to create technology',
        type: 'error',
      });
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
      setShowEditModal(false);
      setSelectedBatch(null);
      await showAlert({
        title: 'Technology Updated',
        message: `Technology "${formData.name}" updated successfully!`,
        type: 'success',
      });
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update technology',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBatch = async (b) => {
    const confirmed = await showConfirm({
      title: 'Delete Technology',
      message: `Are you sure you want to delete technology "${b.name}"? Assigned students will have their technology unassigned.`,
      confirmText: 'Delete Technology',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/batches/${b._id}`);
      setSelectedBatches((prev) => prev.filter((id) => id !== b._id));
      await showAlert({
        title: 'Technology Deleted',
        message: `Technology "${b.name}" deleted successfully!`,
        type: 'success',
      });
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete technology',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedBatches(batches.map((b) => b._id));
    } else {
      setSelectedBatches([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedBatches((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDeleteBatches = async () => {
    if (selectedBatches.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Batches',
      message: `Are you sure you want to delete ${selectedBatches.length} batch(es)? Students enrolled in these batches will have their batch affiliation reset.`,
      confirmText: `Delete ${selectedBatches.length} Batches`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/batches/bulk-delete', {
        ids: selectedBatches,
        batchIds: selectedBatches,
      });
      await showAlert({
        title: 'Batches Deleted',
        message: res.data?.message || `Successfully deleted ${selectedBatches.length} batch(es)!`,
        type: 'success',
      });
      setSelectedBatches([]);
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected batches',
        type: 'error',
      });
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
      await showAlert({
        title: 'Loading Failed',
        message: 'Failed to load technology students',
        type: 'error',
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleRemoveStudent = async (studentId) => {
    if (!selectedBatch) return;
    const confirmed = await showConfirm({
      title: 'Remove Candidate from Technology',
      message: `Are you sure you want to remove this candidate from technology "${selectedBatch.name}"?`,
      confirmText: 'Remove Candidate',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/batches/${selectedBatch._id}/remove-student`, { studentId });
      setBatchStudents((prev) => prev.filter((s) => s._id !== studentId));
      await showAlert({
        title: 'Candidate Removed',
        message: 'Candidate was successfully removed from technology.',
        type: 'success',
      });
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Action Failed',
        message: err.response?.data?.message || 'Failed to remove candidate',
        type: 'error',
      });
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
      await showAlert({
        title: 'Candidates Added',
        message: res.data?.message || 'Candidates assigned to technology successfully!',
        type: 'success',
      });
      setSelectedStudentIds([]);
      // Reload batch students
      const batchRes = await api.get(`/admin/batches/${selectedBatch._id}`);
      setBatchStudents(batchRes.data.data.batch.students || []);
      setActiveTab('enrolled');
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Action Failed',
        message: err.response?.data?.message || 'Failed to add candidates',
        type: 'error',
      });
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
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-blue-600" />
            {isAdmin ? 'Technology Management' : 'My Technologies'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Organize students into technologies, track faculty attribution, and bulk manage enrollments'
              : 'Create cohorts for your students and assign candidates into dedicated technologies'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedBatches.length > 0 && (
            <button
              onClick={handleBulkDeleteBatches}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedBatches.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setFormData({ name: '', department: '', description: '' });
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/15 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Technology</span>
          </button>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search technologies by name, department, or description..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Batches Table */}
      {batches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 shadow-sm">
          <Layers className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No technologies created yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Click "Create New Technology" to set up your first student technology or cohort.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={batches.length > 0 && selectedBatches.length === batches.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                      title="Select All Technologies"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">Technology Name</th>
                  <th className="py-3 px-4 font-semibold">Department</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Students Enrolled</th>
                  {isAdmin && <th className="py-3 px-4 font-semibold">Created By</th>}
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((b) => {
                  const isSelected = selectedBatches.includes(b._id);
                  return (
                  <tr key={b._id} className={`text-slate-600 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(b._id)}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                        {b.name}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-600 whitespace-nowrap">
                      {b.department || <span className="text-slate-400 italic">General</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate whitespace-nowrap" title={b.description || ''}>
                      {b.description || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <button
                        onClick={() => openManageStudents(b)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors font-semibold cursor-pointer"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>{b.studentCount || 0} Students</span>
                      </button>
                    </td>

                    {isAdmin && (
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">{b.createdBy?.name || 'Administrator'}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            b.createdBy?.role === 'FACULTY'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {b.createdBy?.role || 'ADMIN'}
                          </span>
                        </div>
                      </td>
                    )}

                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openManageStudents(b)}
                          className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                          title="Manage Enrolled Students"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </button>
                        <button
                          onClick={() => handleOpenEdit(b)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Edit Technology"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBatch(b)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Technology"
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

      {/* Create Technology Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6 text-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                Create New Technology
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Technology Name / Identifier <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Java Full Stack, React, Python, Data Science"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">This will be assigned to students as their technology identifier.</p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Department / Branch
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Computer Science, Information Tech"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Description / Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Optional notes or details regarding this technology..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 shadow-md shadow-blue-600/15 transition-all"
                >
                  {actionLoading ? 'Creating...' : 'Create Technology'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Technology Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6 text-slate-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                Edit Technology Details
              </h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Technology Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">Renaming will automatically update all enrolled students.</p>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-700 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 shadow-md shadow-blue-600/15 transition-all"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-3xl p-6 text-slate-700 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-200 shrink-0">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Manage Students: <span className="text-blue-600">{selectedBatch.name}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {batchStudents.length} student(s) currently enrolled in this technology
                </p>
              </div>
              <button
                onClick={() => setShowManageStudentsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 mt-4 shrink-0">
              <button
                onClick={() => setActiveTab('enrolled')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'enrolled'
                     ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Enrolled Students ({batchStudents.length})
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'add'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                + Add Students to Technology
              </button>
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto py-4">
              {loadingStudents ? (
                <div className="flex items-center justify-center p-8">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : activeTab === 'enrolled' ? (
                <div>
                  {batchStudents.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <Users className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                      <p className="text-xs">No students currently enrolled in this technology.</p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="mt-3 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                      >
                        Enroll Students Now
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                            <th className="py-2.5 px-3 font-semibold">Student Name</th>
                            <th className="py-2.5 px-3 font-semibold">Email</th>
                            <th className="py-2.5 px-3 font-semibold">Roll Number</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {batchStudents.map((s) => (
                            <tr key={s._id} className="text-slate-600 hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-slate-800">{s.name}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{s.email}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-600">{s.rollNumber || '-'}</td>
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  onClick={() => handleRemoveStudent(s._id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 text-[11px] font-semibold flex items-center gap-1 ml-auto cursor-pointer transition-colors"
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
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      placeholder="Search students to add by name, email, or roll..."
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {candidatePool.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      No matching unenrolled students found.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50">
                      {candidatePool.map((cand) => {
                        const isSelected = selectedStudentIds.includes(cand._id);
                        return (
                          <div
                            key={cand._id}
                            onClick={() => toggleSelectStudent(cand._id)}
                            className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                              isSelected ? 'bg-blue-50' : 'hover:bg-white'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded text-blue-600 bg-white border-slate-300 accent-blue-600 pointer-events-none"
                              />
                              <div>
                                <p className="font-semibold text-slate-800 text-xs">{cand.name}</p>
                                <p className="text-[11px] text-slate-500 font-mono">
                                  {cand.email} {cand.rollNumber ? `• Roll: ${cand.rollNumber}` : ''}
                                  {cand.batch ? ` (Current: ${cand.batch})` : ''}
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              {cand.gender || 'Student'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-slate-500">
                      {selectedStudentIds.length} candidate(s) selected
                    </span>
                    <button
                      onClick={handleAddStudents}
                      disabled={actionLoading || selectedStudentIds.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40 shadow-md shadow-blue-600/15 transition-all"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{actionLoading ? 'Assigning...' : `Add Selected to Technology`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-200 shrink-0">
              <button
                onClick={() => setShowManageStudentsModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
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
