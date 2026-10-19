import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import {
  Layers,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  Building2,
  Users,
  GraduationCap,
  ExternalLink,
} from 'lucide-react';

export default function AdminTechnologiesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showConfirm, showAlert } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const [technologies, setTechnologies] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgFilter, setSelectedOrgFilter] = useState('');
  const [selectedTechs, setSelectedTechs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTech, setSelectedTech] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    organization: '',
    description: '',
  });

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

  const loadTechnologies = async () => {
    try {
      setLoading(true);
      let query = '';
      const params = [];
      if (selectedOrgFilter && selectedOrgFilter !== '__ALL__') {
        params.push(`organization=${encodeURIComponent(selectedOrgFilter)}`);
      }
      if (searchTerm) {
        params.push(`search=${encodeURIComponent(searchTerm)}`);
      }
      if (params.length > 0) query = `?${params.join('&')}`;

      const res = await api.get(`/admin/technologies${query}`);
      setTechnologies(res.data?.data?.technologies || []);
    } catch (err) {
      console.error('Failed to load technologies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    loadTechnologies();
  }, [selectedOrgFilter, searchTerm]);

  // Selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedTechs(technologies.map((t) => t._id));
    } else {
      setSelectedTechs([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedTechs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedTechs.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Technologies',
      message: `Are you sure you want to permanently delete ${selectedTechs.length} selected technology track(s)? Batches and exams linked to them may also be impacted.`,
      confirmText: `Delete ${selectedTechs.length} Technologies`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/technologies/bulk-delete', {
        ids: selectedTechs,
      });
      await showAlert({
        title: 'Technologies Deleted',
        message: res.data?.message || `Successfully deleted ${selectedTechs.length} technology track(s).`,
        type: 'success',
      });
      setSelectedTechs([]);
      await loadTechnologies();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected technologies',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      organization:
        user?.role === 'FACULTY'
          ? (user.organization || '')
          : (selectedOrgFilter && selectedOrgFilter !== '__ALL__'
              ? selectedOrgFilter
              : (organizations[0]?.name || '')),
      description: '',
    });
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      await showAlert({
        title: 'Validation Error',
        message: 'Technology name is required.',
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

    try {
      setActionLoading(true);
      await api.post('/admin/technologies', {
        name: formData.name.trim(),
        organization: org.trim(),
        description: formData.description?.trim() || '',
      });
      setShowCreateModal(false);
      setFormData({ name: '', organization: '', description: '' });
      await showAlert({
        title: 'Technology Created',
        message: `Technology "${formData.name.trim()}" created successfully!`,
        type: 'success',
      });
      await loadTechnologies();
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

  const handleOpenEdit = (tech) => {
    setSelectedTech(tech);
    setFormData({
      name: tech.name,
      organization: tech.organization,
      description: tech.description || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTech) return;

    if (!formData.name.trim()) {
      await showAlert({
        title: 'Validation Error',
        message: 'Technology name is required.',
        type: 'error',
      });
      return;
    }

    try {
      setActionLoading(true);
      await api.put(`/admin/technologies/${selectedTech._id}`, {
        name: formData.name.trim(),
        organization: formData.organization.trim(),
        description: formData.description?.trim() || '',
      });
      setShowEditModal(false);
      setSelectedTech(null);
      await showAlert({
        title: 'Technology Updated',
        message: `Technology "${formData.name.trim()}" updated successfully!`,
        type: 'success',
      });
      await loadTechnologies();
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

  const handleDelete = async (tech) => {
    const confirmed = await showConfirm({
      title: 'Delete Technology',
      message: `Are you sure you want to delete technology "${tech.name}" from "${tech.organization}"? Batches and students under this technology may lose their track association.`,
      confirmText: 'Delete Technology',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/technologies/${tech._id}`);
      await showAlert({
        title: 'Technology Deleted',
        message: `Technology "${tech.name}" has been deleted.`,
        type: 'success',
      });
      await loadTechnologies();
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

  if (loading && organizations.length === 0) {
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
            <span>{isAdmin ? 'Technology Management' : 'My Technologies'}</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Define and govern institutional technology tracks, organize cohort curricula, and categorize student specializations
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedTechs.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedTechs.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Technology</span>
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
            placeholder="Search technologies by name or description..."
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[280px]"
          />
        </div>

        {isAdmin && (
          <select
            value={selectedOrgFilter}
            onChange={(e) => setSelectedOrgFilter(e.target.value)}
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

        {selectedTechs.length > 0 ? (
          <span className="text-xs text-slate-500 font-medium ml-auto">
            {selectedTechs.length} of {technologies.length} selected
          </span>
        ) : (
          <span className="text-xs text-slate-500 font-medium ml-auto">
            Showing <strong>{technologies.length}</strong> technologies
          </span>
        )}
      </div>

      {/* Technologies Table */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white border border-slate-200 rounded-2xl shadow-sm">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : technologies.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 shadow-sm">
          <Layers className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No technologies found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchTerm || selectedOrgFilter
              ? 'No technologies match the selected filters. Try adjusting your search query.'
              : 'Click "Create Technology" to define your first specialization track.'}
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
                      checked={technologies.length > 0 && selectedTechs.length === technologies.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                      title="Select All Technologies"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">Technology Name</th>
                  <th className="py-3 px-4 font-semibold">Organization</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Batches</th>
                  <th className="py-3 px-4 font-semibold">Students</th>
                  <th className="py-3 px-4 font-semibold">Created By</th>
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technologies.map((tech) => {
                  const isSelected = selectedTechs.includes(tech._id);
                  return (
                    <tr
                      key={tech._id}
                      className={`text-slate-600 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(tech._id)}
                          className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 font-bold flex items-center justify-center shrink-0">
                            <Layers className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{tech.name}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-medium text-xs">
                          <Building2 className="w-3.5 h-3.5" />
                          <span>{tech.organization || 'Unassigned'}</span>
                        </span>
                      </td>

                      <td
                        className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap max-w-[240px] truncate"
                        title={tech.description || ''}
                      >
                        {tech.description || '—'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <Link
                          to={`/admin/batches?organization=${encodeURIComponent(tech.organization)}&technology=${encodeURIComponent(tech.name)}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-semibold transition-colors"
                          title="View Batches in this Technology"
                        >
                          <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                          <span>{tech.batchCount || 0} Batches</span>
                        </Link>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold">
                          <Users className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{tech.studentCount || 0} Students</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-700">
                            {tech.createdBy?.name || 'Administrator'}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              tech.createdBy?.role === 'FACULTY'
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                : 'bg-blue-50 text-blue-600 border border-blue-200'
                            }`}
                          >
                            {tech.createdBy?.role || 'ADMIN'}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {new Date(tech.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(tech)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                            title="Edit Technology"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(tech)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
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

      {/* CREATE TECHNOLOGY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Create New Technology</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned Organization <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                {isAdmin ? (
                  <select
                    required
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
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

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Technology Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Python, React, Java Fullstack"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows="3"
                  placeholder="Outline syllabus, objectives, or track scope..."
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
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/15 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Create Technology'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT TECHNOLOGY MODAL */}
      {showEditModal && selectedTech && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden animate-in fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Edit Technology</h3>
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
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
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
                  Technology Name <span className="text-red-500 font-bold ml-0.5">*</span>
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
    </div>
  );
}
