import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import {
  Building2,
  Plus,
  Users,
  Search,
  Edit,
  Trash2,
  X,
  GraduationCap,
  Layers,
  Globe,
  ExternalLink,
  ShieldCheck,
  Eye,
  Hash,
  UserPlus,
  UserMinus,
} from 'lucide-react';

export default function AdminOrganizationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showConfirm, showAlert } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    if (user && user.role === 'FACULTY') {
      navigate('/admin', { replace: true });
    }
  }, [user, navigate]);

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeOrg, setActiveOrg] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);
  const [membersTab, setMembersTab] = useState('faculty'); // 'faculty' or 'students'
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Organization Faculty Assignment State
  const [facultyViewMode, setFacultyViewMode] = useState('enrolled'); // 'enrolled' or 'assign'
  const [availableFaculty, setAvailableFaculty] = useState([]);
  const [loadingAvailableFaculty, setLoadingAvailableFaculty] = useState(false);
  const [selectedAssignFacultyIds, setSelectedAssignFacultyIds] = useState([]);
  const [availableFacultySearch, setAvailableFacultySearch] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    website: '',
    isActive: true,
  });

  const loadOrganizations = async () => {
    try {
      const res = await api.get(
        `/admin/organizations${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`
      );
      setOrganizations(res.data.data.organizations || []);
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, [searchTerm]);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      await showAlert({
        title: 'Validation Error',
        message: 'Organization name is required',
        type: 'error',
      });
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/admin/organizations', formData);
      setShowCreateModal(false);
      setFormData({ name: '', code: '', description: '', website: '', isActive: true });
      await showAlert({
        title: 'Organization Created',
        message: `Organization "${formData.name}" created successfully!`,
        type: 'success',
      });
      await loadOrganizations();
    } catch (err) {
      await showAlert({
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Failed to create organization',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (org) => {
    setActiveOrg(org);
    setFormData({
      name: org.name,
      code: org.code || '',
      description: org.description || '',
      website: org.website || '',
      isActive: org.isActive ?? true,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!activeOrg) return;

    try {
      setActionLoading(true);
      await api.put(`/admin/organizations/${activeOrg._id}`, formData);
      setShowEditModal(false);
      setActiveOrg(null);
      await showAlert({
        title: 'Organization Updated',
        message: `Organization "${formData.name}" updated successfully!`,
        type: 'success',
      });
      await loadOrganizations();
    } catch (err) {
      await showAlert({
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update organization',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteOrg = async (org) => {
    const confirmed = await showConfirm({
      title: 'Delete Organization',
      message: `Are you sure you want to permanently delete "${org.name}"? Faculty and students belonging to this organization will be detached.`,
      confirmText: 'Delete Organization',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/organizations/${org._id}`);
      setSelectedOrgs((prev) => prev.filter((id) => id !== org._id));
      await showAlert({
        title: 'Organization Deleted',
        message: `Organization "${org.name}" deleted successfully!`,
        type: 'success',
      });
      await loadOrganizations();
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete organization',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrgs(organizations.map((org) => org._id));
    } else {
      setSelectedOrgs([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedOrgs((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedOrgs.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Organizations',
      message: `Are you sure you want to delete ${selectedOrgs.length} organization(s)? This will remove these organizations from the system.`,
      confirmText: `Delete ${selectedOrgs.length} Organizations`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/organizations/bulk-delete', {
        ids: selectedOrgs,
        orgIds: selectedOrgs,
      });
      setSelectedOrgs([]);
      await showAlert({
        title: 'Organizations Deleted',
        message: res.data?.message || `Successfully deleted ${selectedOrgs.length} organization(s)!`,
        type: 'success',
      });
      await loadOrganizations();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected organizations',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewMembers = async (org) => {
    setActiveOrg(org);
    setShowMembersModal(true);
    setLoadingMembers(true);
    setMembersTab('faculty');
    setFacultyViewMode('enrolled');
    setSelectedAssignFacultyIds([]);
    setAvailableFacultySearch('');
    try {
      const res = await api.get(`/admin/organizations/${org._id}`);
      setOrgDetails(res.data.data.organization);
    } catch (err) {
      await showAlert({
        title: 'Load Failed',
        message: 'Failed to load organization members',
        type: 'error',
      });
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenAssignFaculty = async () => {
    if (!activeOrg) return;
    setFacultyViewMode('assign');
    setSelectedAssignFacultyIds([]);
    setAvailableFacultySearch('');
    setLoadingAvailableFaculty(true);
    try {
      const res = await api.get(`/admin/organizations/${activeOrg._id}/available-faculty`);
      setAvailableFaculty(res.data.data?.faculty || []);
    } catch (err) {
      await showAlert({
        title: 'Load Failed',
        message: err.response?.data?.message || 'Failed to load available faculty',
        type: 'error',
      });
    } finally {
      setLoadingAvailableFaculty(false);
    }
  };

  const handleToggleAssignSelect = (facultyId) => {
    setSelectedAssignFacultyIds((prev) =>
      prev.includes(facultyId) ? prev.filter((id) => id !== facultyId) : [...prev, facultyId]
    );
  };

  const handleAssignFacultySubmit = async (singleId = null) => {
    if (!activeOrg) return;
    const targetIds = singleId ? [singleId] : selectedAssignFacultyIds;
    if (targetIds.length === 0) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/admin/organizations/${activeOrg._id}/faculty`, {
        facultyIds: targetIds,
      });
      setSelectedAssignFacultyIds([]);
      setFacultyViewMode('enrolled');
      // Refresh organization details and main list
      const updatedOrgRes = await api.get(`/admin/organizations/${activeOrg._id}`);
      setOrgDetails(updatedOrgRes.data.data.organization);
      await loadOrganizations();
      await showAlert({
        title: 'Faculty Assigned',
        message: res.data?.message || `Assigned ${targetIds.length} faculty member(s) to "${activeOrg.name}"!`,
        type: 'success',
      });
    } catch (err) {
      await showAlert({
        title: 'Assignment Failed',
        message: err.response?.data?.message || 'Failed to assign faculty member(s)',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFaculty = async (facultyId, facultyName) => {
    if (!activeOrg) return;
    const confirmed = await showConfirm({
      title: 'Remove Faculty from Organization',
      message: `Are you sure you want to remove "${facultyName}" from "${activeOrg.name}"? They will no longer belong to this organization.`,
      confirmText: 'Remove Faculty',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post(`/admin/organizations/${activeOrg._id}/remove-faculty`, { facultyId });
      // Refresh modal details and main list
      const updatedOrgRes = await api.get(`/admin/organizations/${activeOrg._id}`);
      setOrgDetails(updatedOrgRes.data.data.organization);
      await loadOrganizations();
      await showAlert({
        title: 'Faculty Removed',
        message: res.data?.message || `Removed ${facultyName} from "${activeOrg.name}".`,
        type: 'success',
      });
    } catch (err) {
      await showAlert({
        title: 'Removal Failed',
        message: err.response?.data?.message || 'Failed to remove faculty member',
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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-blue-600" />
            {isAdmin ? 'Organization Management' : 'My Organization'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Define institutional organizations, govern cross-faculty student sharing rules, and inspect member allocations'
              : 'View institutional details and faculty-student collaboration boundaries'}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {isAdmin && selectedOrgs.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedOrgs.length})</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setFormData({ name: '', code: '', description: '', website: '', isActive: true });
                setShowCreateModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/15 transition-all shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Organization</span>
            </button>
          )}
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
            placeholder="Search organizations by name, code, or description..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Organizations Table */}
      {organizations.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500 shadow-sm">
          <Building2 className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No organizations found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {isAdmin
              ? 'Click "Create New Organization" to set up your first institutional hub.'
              : 'No organization records found for your account.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1200px] text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                  {isAdmin && (
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={organizations.length > 0 && selectedOrgs.length === organizations.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                        title="Select All Organizations"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4 font-semibold">Organization Name</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Code</th>
                  <th className="py-3 px-4 font-semibold">Faculty Count</th>
                  <th className="py-3 px-4 font-semibold">Students Count</th>
                  <th className="py-3 px-4 font-semibold">Batches</th>
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.map((org) => {
                  const isSelected = selectedOrgs.includes(org._id);
                  return (
                    <tr
                      key={org._id}
                      className={`text-slate-600 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {isAdmin && (
                        <td className="py-3 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(org._id)}
                            className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200">
                            {org.name}
                          </span>
                          {org.website && (
                            <a
                              href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-blue-600 transition-colors"
                              title={org.website}
                            >
                              <Globe className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 max-w-xs truncate whitespace-nowrap" title={org.description || ''}>
                        {org.description || '—'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {org.code ? (
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-blue-50 text-blue-600 border border-blue-200 font-bold uppercase">
                            {org.code}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            handleViewMembers(org);
                            setMembersTab('faculty');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors font-semibold cursor-pointer"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{org.facultyCount || 0} Faculty</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            handleViewMembers(org);
                            setMembersTab('students');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors font-semibold cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{org.studentCount || 0} Students</span>
                        </button>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 max-w-[200px]">
                          {(org.batches || []).length > 0 ? (
                            org.batches.slice(0, 3).map((b) => (
                              <span
                                key={b}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-700 border border-slate-200"
                              >
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                          {(org.batches || []).length > 3 && (
                            <span className="text-[10px] text-slate-400">+{org.batches.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewMembers(org)}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="View Enrolled Members"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(org)}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors cursor-pointer"
                                title="Edit Organization"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrg(org)}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Organization"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* CREATE ORGANIZATION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Create New Organization</h3>
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
                  Organization Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Stanford University / Tech Institute"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Code / Abbreviation (Optional)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. STANFORD or TI-CAMPUS"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Website (Optional)</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g. https://university.edu"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief notes about this campus or institutional tenant..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                  {actionLoading ? 'Creating...' : 'Create Organization'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ORGANIZATION MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Edit Organization</h3>
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
                  Organization Name <span className="text-red-500 font-bold ml-0.5">*</span>
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
                <label className="block text-slate-700 font-semibold mb-1">Code / Abbreviation</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Official Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveOrg"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded cursor-pointer accent-blue-600 text-blue-600 border-slate-300"
                />
                <label htmlFor="isActiveOrg" className="text-slate-700 text-xs cursor-pointer select-none">
                  Active Status
                </label>
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

      {/* VIEW MEMBERS MODAL */}
      {showMembersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {activeOrg?.name} - Members
                  </h3>
                  <p className="text-[11px] text-slate-500">Institutional attribution roster</p>
                </div>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-4">
              <button
                onClick={() => setMembersTab('faculty')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  membersTab === 'faculty'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Faculty ({orgDetails?.faculties?.length || 0})</span>
              </button>

              <button
                onClick={() => setMembersTab('students')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  membersTab === 'students'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Students ({orgDetails?.students?.length || 0})</span>
              </button>
            </div>

            {/* Members Body */}
            <div className="p-5 overflow-y-auto flex-1">
              {loadingMembers ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : membersTab === 'faculty' ? (
                <div>
                  {isAdmin && (
                    <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFacultyViewMode('enrolled')}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            facultyViewMode === 'enrolled'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          Enrolled Faculty ({orgDetails?.faculties?.length || 0})
                        </button>
                        <button
                          onClick={handleOpenAssignFaculty}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            facultyViewMode === 'assign'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          <UserPlus className="w-3.5 h-3.5 text-blue-600" />
                          <span>+ Assign Faculty</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {facultyViewMode === 'assign' && isAdmin ? (
                    /* ASSIGN FACULTY VIEW */
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="text"
                            value={availableFacultySearch}
                            onChange={(e) => setAvailableFacultySearch(e.target.value)}
                            placeholder="Filter available faculty by name, email, department..."
                            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>

                        {selectedAssignFacultyIds.length > 0 && (
                          <button
                            onClick={() => handleAssignFacultySubmit()}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-md shadow-blue-600/15 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assign Selected ({selectedAssignFacultyIds.length})</span>
                          </button>
                        )}
                      </div>

                      {loadingAvailableFaculty ? (
                        <div className="py-10 flex justify-center">
                          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : (
                        (() => {
                          const filtered = availableFaculty.filter((f) => {
                            if (!availableFacultySearch.trim()) return true;
                            const q = availableFacultySearch.toLowerCase();
                            return (
                              f.name.toLowerCase().includes(q) ||
                              f.email.toLowerCase().includes(q) ||
                              (f.department && f.department.toLowerCase().includes(q)) ||
                              (f.currentOrganization && f.currentOrganization.toLowerCase().includes(q))
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="py-8 text-center text-slate-400 text-xs">
                                {availableFaculty.length === 0
                                  ? 'All existing faculty members are already assigned to this organization.'
                                  : 'No matching faculty found.'}
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                              {filtered.map((f) => (
                                <div
                                  key={f._id}
                                  className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                                    selectedAssignFacultyIds.includes(f._id)
                                      ? 'bg-blue-50 border-blue-300'
                                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <input
                                      type="checkbox"
                                      checked={selectedAssignFacultyIds.includes(f._id)}
                                      onChange={() => handleToggleAssignSelect(f._id)}
                                      className="w-4 h-4 rounded cursor-pointer accent-blue-600 text-blue-600 border-slate-300"
                                    />
                                    <div>
                                      <p className="font-semibold text-slate-800 flex items-center gap-2">
                                        <span>{f.name}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                                          {f.department || 'General'}
                                        </span>
                                      </p>
                                      <p className="text-slate-500 text-[11px] mt-0.5">
                                        {f.email} • Current: <span className="text-slate-700">{f.currentOrganization}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleAssignFacultySubmit(f._id)}
                                    disabled={actionLoading}
                                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg font-semibold text-[11px] flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Assign</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  ) : (
                    /* ENROLLED FACULTY VIEW */
                    (orgDetails?.faculties || []).length === 0 ? (
                      <div className="py-8 text-center text-slate-500 text-xs">
                        <GraduationCap className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                        <p>No faculty members currently assigned to this organization.</p>
                        {isAdmin && (
                          <button
                            onClick={handleOpenAssignFaculty}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>Assign Faculty Now</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {orgDetails.faculties.map((f) => (
                          <div
                            key={f._id}
                            className="p-3 bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl flex items-center justify-between text-xs transition-all"
                          >
                            <div>
                              <p className="font-semibold text-slate-800 flex items-center gap-2">
                                <span>{f.name}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                                  {f.department || 'General'}
                                </span>
                              </p>
                              <p className="text-slate-500 text-[11px] mt-0.5">
                                {f.email} {f.phone ? `• ${f.phone}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {isAdmin && (
                                <button
                                  onClick={() => handleRemoveFaculty(f._id, f.name)}
                                  disabled={actionLoading}
                                  title="Remove faculty from this organization"
                                  className="px-2.5 py-1 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  )}
                </div>
              ) : (
                (orgDetails?.students || []).length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    No students currently assigned to this organization.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgDetails.students.map((s) => (
                      <div
                        key={s._id}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <p className="text-slate-500 text-[11px]">
                            {s.email} {s.rollNumber ? `• Roll: ${s.rollNumber}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-mono">
                            {s.batch || 'Unassigned Batch'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
              {facultyViewMode === 'assign' && membersTab === 'faculty' ? (
                <button
                  onClick={() => setFacultyViewMode('enrolled')}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold cursor-pointer transition-colors"
                >
                  Back to Enrolled Faculty
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold cursor-pointer transition-colors"
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
