import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import {
  GraduationCap,
  Plus,
  Users,
  Search,
  Edit,
  Trash2,
  X,
  Layers,
  Building2,
  UserPlus,
  UserMinus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function AdminBatchesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { showConfirm, showAlert } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const [batches, setBatches] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [technologies, setTechnologies] = useState([]);
  const [selectedBatches, setSelectedBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [selectedOrgFilter, setSelectedOrgFilter] = useState(searchParams.get('organization') || '');
  const [selectedTechFilter, setSelectedTechFilter] = useState(searchParams.get('technology') || '');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    technology: '',
    description: '',
  });
  const [formTechnologies, setFormTechnologies] = useState([]);
  const [loadingFormTechs, setLoadingFormTechs] = useState(false);

  // Manage students modal
  const [showManageStudentsModal, setShowManageStudentsModal] = useState(false);
  const [batchStudents, setBatchStudents] = useState([]);
  const [allAvailableStudents, setAllAvailableStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [enrolledSearch, setEnrolledSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [activeTab, setActiveTab] = useState('enrolled'); // 'enrolled' or 'add'
  const [loadingStudents, setLoadingStudents] = useState(false);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/admin/organizations');
      const orgList = res.data?.data?.organizations || [];
      setOrganizations(orgList);
      if (!selectedOrgFilter && orgList.length > 0 && !isAdmin) {
        setSelectedOrgFilter(user?.organization || orgList[0]?.name || '');
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    }
  };

  // Load filter technologies based on selected organization
  const loadFilterTechnologies = async (orgName) => {
    try {
      if (!orgName || orgName === '__ALL__') {
        const res = await api.get('/admin/technologies');
        setTechnologies(res.data?.data?.technologies || []);
      } else {
        const res = await api.get(`/admin/technologies?organization=${encodeURIComponent(orgName)}`);
        setTechnologies(res.data?.data?.technologies || []);
      }
    } catch (err) {
      console.error('Failed to load filter technologies:', err);
    }
  };

  const loadBatches = async () => {
    try {
      setLoading(true);
      const params = [];
      if (selectedOrgFilter && selectedOrgFilter !== '__ALL__') {
        params.push(`organization=${encodeURIComponent(selectedOrgFilter)}`);
      }
      if (selectedTechFilter && selectedTechFilter !== '__ALL__') {
        params.push(`technology=${encodeURIComponent(selectedTechFilter)}`);
      }
      if (searchTerm) {
        params.push(`search=${encodeURIComponent(searchTerm)}`);
      }
      const query = params.length > 0 ? `?${params.join('&')}` : '';

      const res = await api.get(`/admin/batches${query}`);
      setBatches(res.data?.data?.batches || []);
    } catch (err) {
      console.error('Failed to fetch batches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    const org = selectedOrgFilter || (user?.role === 'FACULTY' ? user.organization : '');
    loadFilterTechnologies(org);
  }, [selectedOrgFilter, user]);

  useEffect(() => {
    loadBatches();
  }, [selectedOrgFilter, selectedTechFilter, searchTerm]);

  // Load technologies for create/edit form when organization changes
  const loadTechnologiesForOrg = async (orgName) => {
    if (!orgName) {
      setFormTechnologies([]);
      return;
    }
    try {
      setLoadingFormTechs(true);
      const res = await api.get(`/admin/technologies?organization=${encodeURIComponent(orgName)}`);
      const list = res.data?.data?.technologies || [];
      setFormTechnologies(list);
    } catch (err) {
      console.error('Failed to load form technologies:', err);
      setFormTechnologies([]);
    } finally {
      setLoadingFormTechs(false);
    }
  };

  // Selection handlers
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

  const handleBulkDelete = async () => {
    if (selectedBatches.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Batches',
      message: `Are you sure you want to permanently delete ${selectedBatches.length} selected batch(es)? Students enrolled in these batches will have their batch affiliation unlinked.`,
      confirmText: `Delete ${selectedBatches.length} Batches`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/batches/bulk-delete', {
        ids: selectedBatches,
      });
      await showAlert({
        title: 'Batches Deleted',
        message: res.data?.message || `Successfully deleted ${selectedBatches.length} batch(es).`,
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

  const handleOpenCreate = () => {
    const defaultOrg = user?.role === 'FACULTY'
      ? (user.organization || '')
      : (selectedOrgFilter && selectedOrgFilter !== '__ALL__' ? selectedOrgFilter : (organizations[0]?.name || ''));

    setFormData({
      name: '',
      organization: defaultOrg,
      technology: selectedTechFilter && selectedTechFilter !== '__ALL__' ? selectedTechFilter : '',
      description: '',
    });

    if (defaultOrg) {
      loadTechnologiesForOrg(defaultOrg);
    }

    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      await showAlert({
        title: 'Validation Error',
        message: 'Batch name is required.',
        type: 'error',
      });
      return;
    }

    const org = user?.role === 'FACULTY' ? user.organization : formData.organization;
    if (!org) {
      await showAlert({
        title: 'Validation Error',
        message: 'Organization is mandatory. Please select an organization.',
        type: 'error',
      });
      return;
    }

    if (!formData.technology) {
      await showAlert({
        title: 'Validation Error',
        message: 'Technology track is mandatory. Please select a technology.',
        type: 'error',
      });
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/admin/batches', {
        name: formData.name.trim(),
        organization: org.trim(),
        technology: formData.technology.trim(),
        description: formData.description?.trim() || '',
      });
      setShowCreateModal(false);
      setFormData({ name: '', organization: '', technology: '', description: '' });
      await showAlert({
        title: 'Batch Created',
        message: `Batch "${formData.name.trim()}" created successfully!`,
        type: 'success',
      });
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Failed to create batch',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = async (b) => {
    setSelectedBatch(b);
    setFormData({
      name: b.name,
      organization: b.organization || '',
      technology: b.technology || '',
      description: b.description || '',
    });
    await loadTechnologiesForOrg(b.organization);
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatch) return;

    if (!formData.name.trim()) {
      await showAlert({
        title: 'Validation Error',
        message: 'Batch name is required.',
        type: 'error',
      });
      return;
    }

    if (!formData.technology) {
      await showAlert({
        title: 'Validation Error',
        message: 'Technology track is mandatory.',
        type: 'error',
      });
      return;
    }

    try {
      setActionLoading(true);
      await api.put(`/admin/batches/${selectedBatch._id}`, {
        name: formData.name.trim(),
        organization: formData.organization.trim(),
        technology: formData.technology.trim(),
        description: formData.description?.trim() || '',
      });
      setShowEditModal(false);
      setSelectedBatch(null);
      await showAlert({
        title: 'Batch Updated',
        message: `Batch "${formData.name.trim()}" updated successfully!`,
        type: 'success',
      });
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update batch',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (b) => {
    const confirmed = await showConfirm({
      title: 'Delete Batch',
      message: `Are you sure you want to delete batch "${b.name}"? Enrolled students will have their batch affiliation cleared.`,
      confirmText: 'Delete Batch',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/batches/${b._id}`);
      await showAlert({
        title: 'Batch Deleted',
        message: `Batch "${b.name}" has been deleted.`,
        type: 'success',
      });
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete batch',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Manage students in batch
  const handleOpenManageStudents = async (b) => {
    setSelectedBatch(b);
    setActiveTab('enrolled');
    setSelectedStudentIds([]);
    setStudentSearch('');
    setEnrolledSearch('');
    setShowManageStudentsModal(true);
    setLoadingStudents(true);

    try {
      const res = await api.get(`/admin/batches/${b._id}`);
      setBatchStudents(res.data?.data?.batch?.students || []);

      // Load all available students to add
      const usersRes = await api.get('/admin/users?limit=200');
      const users = usersRes.data?.data?.users || [];
      const enrolledIds = new Set((res.data?.data?.batch?.students || []).map((s) => s._id));
      setAllAvailableStudents(users.filter((u) => !enrolledIds.has(u._id)));
    } catch (err) {
      console.error('Failed to load batch students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAddStudentsSubmit = async () => {
    if (selectedStudentIds.length === 0) {
      await showAlert({
        title: 'Selection Required',
        message: 'Please select at least one student to add to this batch.',
        type: 'warning',
      });
      return;
    }

    try {
      setActionLoading(true);
      await api.post(`/admin/batches/${selectedBatch._id}/students`, {
        studentIds: selectedStudentIds,
      });
      await showAlert({
        title: 'Students Added',
        message: `Successfully added ${selectedStudentIds.length} student(s) to "${selectedBatch.name}".`,
        type: 'success',
      });
      await handleOpenManageStudents(selectedBatch);
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Failed to Add Students',
        message: err.response?.data?.message || 'Failed to add students to batch',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId, studentName) => {
    const confirmed = await showConfirm({
      title: 'Remove Student',
      message: `Remove "${studentName}" from batch "${selectedBatch.name}"?`,
      confirmText: 'Remove Student',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/batches/${selectedBatch._id}/remove-student`, { studentId });
      await showAlert({
        title: 'Student Removed',
        message: `Removed "${studentName}" from batch.`,
        type: 'success',
      });
      await handleOpenManageStudents(selectedBatch);
      await loadBatches();
    } catch (err) {
      await showAlert({
        title: 'Failed to Remove',
        message: err.response?.data?.message || 'Failed to remove student',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && organizations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const filteredEnrolledStudents = batchStudents.filter((stu) => {
    if (!enrolledSearch) return true;
    const term = enrolledSearch.toLowerCase();
    return (
      stu.name?.toLowerCase().includes(term) ||
      stu.studentId?.toLowerCase().includes(term) ||
      stu.rollNumber?.toLowerCase().includes(term) ||
      stu.email?.toLowerCase().includes(term)
    );
  });

  const filteredAvailableStudents = allAvailableStudents.filter((s) => {
    if (!studentSearch) return true;
    const term = studentSearch.toLowerCase();
    return (
      s.name?.toLowerCase().includes(term) ||
      s.studentId?.toLowerCase().includes(term) ||
      s.rollNumber?.toLowerCase().includes(term) ||
      s.email?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <span>{isAdmin ? 'Batch Management' : 'My Batches'}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Organize student cohorts into focused batches within technology specializations and institutional organizations
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedBatches.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedBatches.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Batch</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search batches..."
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[240px]"
          />
        </div>

        {/* Organization Filter */}
        {isAdmin && (
          <select
            value={selectedOrgFilter}
            onChange={(e) => {
              setSelectedOrgFilter(e.target.value);
              setSelectedTechFilter('');
            }}
            className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org._id || org.name} value={org.name}>
                {org.name}
              </option>
            ))}
          </select>
        )}

        {!isAdmin && user?.organization && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl text-xs font-semibold text-blue-700">
            <Building2 className="w-3.5 h-3.5" />
            <span>{user.organization}</span>
          </span>
        )}

        {/* Technology Filter (dependent on Organization) */}
        <select
          value={selectedTechFilter}
          onChange={(e) => setSelectedTechFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
        >
          <option value="">All Technologies</option>
          {technologies.map((t) => (
            <option key={t._id || t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>

        {selectedBatches.length > 0 ? (
          <span className="text-xs text-slate-500 font-medium ml-auto">
            {selectedBatches.length} of {batches.length} selected
          </span>
        ) : (
          <span className="text-xs text-slate-500 font-medium ml-auto">
            Showing <strong>{batches.length}</strong> batches
          </span>
        )}
      </div>

      {/* Batches Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : batches.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 shadow-sm">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No batches found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || selectedOrgFilter || selectedTechFilter
              ? 'No batches match your selected criteria. Try adjusting your filters.'
              : 'Click "Create Batch" to create your first cohort batch inside a technology track.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={batches.length > 0 && selectedBatches.length === batches.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                      title="Select All Batches"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">Batch Name</th>
                  <th className="py-3 px-4 font-semibold">Technology Track</th>
                  <th className="py-3 px-4 font-semibold">Organization</th>
                  <th className="py-3 px-4 font-semibold">Students Enrolled</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Created By</th>
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => {
                  const isSelected = selectedBatches.includes(batch._id);
                  return (
                    <tr
                      key={batch._id}
                      className={`text-slate-600 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(batch._id)}
                          className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                            <GraduationCap className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{batch.name}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium text-xs">
                          <Layers className="w-3.5 h-3.5" />
                          <span>{batch.technology || 'General'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium text-xs">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{batch.organization || 'Unassigned'}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenManageStudents(batch)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                          title="Manage Enrolled Students"
                        >
                          <Users className="w-3.5 h-3.5 text-blue-600" />
                          <span>{batch.studentCount || 0} Students</span>
                        </button>
                      </td>

                      <td
                        className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap max-w-[220px] truncate"
                        title={batch.description || ''}
                      >
                        {batch.description || '—'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">
                            {batch.createdBy?.name || 'Administrator'}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              batch.createdBy?.role === 'FACULTY'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-blue-50 text-blue-600 border border-blue-200'
                            }`}
                          >
                            {batch.createdBy?.role || 'ADMIN'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(batch.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenManageStudents(batch)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                            title="Manage Enrolled Students"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Enroll</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(batch)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Edit Batch"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(batch)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Delete Batch"
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

      {/* CREATE BATCH MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Create New Batch</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              {/* Organization */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned Organization <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                {isAdmin ? (
                  <select
                    required
                    value={formData.organization}
                    onChange={(e) => {
                      const newOrg = e.target.value;
                      setFormData({ ...formData, organization: newOrg, technology: '' });
                      loadTechnologiesForOrg(newOrg);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map((org) => (
                      <option key={org._id || org.name} value={org.name}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={user?.organization || 'Assigned Organization'}
                    className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-not-allowed"
                  />
                )}
              </div>

              {/* Technology */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Technology Track <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  required
                  disabled={loadingFormTechs || (!formData.organization && isAdmin)}
                  value={formData.technology}
                  onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">
                    {loadingFormTechs
                      ? 'Loading technologies...'
                      : !formData.organization && isAdmin
                        ? 'Select an organization first'
                        : formTechnologies.length === 0
                          ? 'No technologies found for this org'
                          : 'Select Technology'}
                  </option>
                  {formTechnologies.map((t) => (
                    <option key={t._id || t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                {formTechnologies.length === 0 && formData.organization && !loadingFormTechs && (
                  <p className="text-[11px] text-amber-600 mt-1">
                    No technologies found for {formData.organization}. Please create a technology in the Technologies tab first.
                  </p>
                )}
              </div>

              {/* Batch Name */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Batch Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Batch-1, Morning-Cohort, Python-2026A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Schedule, notes, or classroom details..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading || formTechnologies.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/15 transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BATCH MODAL */}
      {showEditModal && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Edit Batch: {selectedBatch.name}</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned Organization <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                {isAdmin ? (
                  <select
                    required
                    value={formData.organization}
                    onChange={(e) => {
                      const newOrg = e.target.value;
                      setFormData({ ...formData, organization: newOrg, technology: '' });
                      loadTechnologiesForOrg(newOrg);
                    }}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {organizations.map((org) => (
                      <option key={org._id || org.name} value={org.name}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={formData.organization}
                    className="w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl font-medium text-slate-600 cursor-not-allowed"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Technology Track <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  required
                  value={formData.technology}
                  onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Technology</option>
                  {formTechnologies.map((t) => (
                    <option key={t._id || t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Batch Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/15 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE STUDENTS IN BATCH MODAL */}
      {showManageStudentsModal && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>Manage Batch Students: {selectedBatch.name}</span>
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                    <Layers className="w-3 h-3" />
                    {selectedBatch.technology}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    <Building2 className="w-3 h-3" />
                    {selectedBatch.organization}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowManageStudentsModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="px-6 pt-3 flex gap-2 border-b border-slate-100 shrink-0 bg-slate-50/50">
              <button
                onClick={() => setActiveTab('enrolled')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'enrolled'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Enrolled Candidates ({batchStudents.length})
              </button>
              <button
                onClick={() => setActiveTab('add')}
                className={`pb-3 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'add'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Enroll New Candidates ({allAvailableStudents.length} available)
              </button>
            </div>

            {/* Content */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Tab 1: Enrolled */}
              {activeTab === 'enrolled' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search enrolled students..."
                      value={enrolledSearch}
                      onChange={(e) => setEnrolledSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {loadingStudents ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : filteredEnrolledStudents.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                      {batchStudents.length === 0
                        ? 'No students currently assigned to this batch. Click "Enroll New Candidates" to add candidates.'
                        : 'No enrolled students match your search term.'}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredEnrolledStudents.map((stu) => (
                        <div
                          key={stu._id}
                          className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors shadow-2xs"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0 text-xs">
                              {stu.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 text-xs">{stu.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                                <span>ID: {stu.studentId || stu.rollNumber || 'N/A'}</span>
                                {stu.email && <span className="text-slate-400">• {stu.email}</span>}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveStudent(stu._id, stu.name)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Add Students */}
              {activeTab === 'add' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search candidates by name, student ID, roll number, or email..."
                      value={studentSearch}
                      onChange={(e) => setStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {filteredAvailableStudents.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-400 text-xs">
                      No candidates available to enroll.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                      {filteredAvailableStudents.map((s) => {
                        const isSelected = selectedStudentIds.includes(s._id);
                        return (
                          <div
                            key={s._id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedStudentIds(selectedStudentIds.filter((id) => id !== s._id));
                              } else {
                                setSelectedStudentIds([...selectedStudentIds, s._id]);
                              }
                            }}
                            className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-xs'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer pointer-events-none"
                              />
                              <div>
                                <div className="font-bold text-xs">{s.name}</div>
                                <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                                  <span>ID: {s.studentId || s.rollNumber || 'N/A'}</span>
                                  {s.technology && <span className="text-indigo-600">• Tech: {s.technology}</span>}
                                  {s.email && <span className="text-slate-400">• {s.email}</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500 font-medium">
                {activeTab === 'add' ? `${selectedStudentIds.length} candidate(s) selected` : `${batchStudents.length} candidate(s) enrolled`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManageStudentsModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                {activeTab === 'add' && (
                  <button
                    onClick={handleAddStudentsSubmit}
                    disabled={actionLoading || selectedStudentIds.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Enroll Selected ({selectedStudentIds.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
