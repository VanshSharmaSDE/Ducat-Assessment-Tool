import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Layers,
  Globe,
  ExternalLink,
  ShieldCheck,
  Eye,
  Hash
} from 'lucide-react';

export default function AdminOrganizationsPage() {
  const { user } = useAuth();
  const { showConfirm, showAlert } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  const [organizations, setOrganizations] = useState([]);
  const [selectedOrgs, setSelectedOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeOrg, setActiveOrg] = useState(null);
  const [orgDetails, setOrgDetails] = useState(null);
  const [membersTab, setMembersTab] = useState('faculty'); // 'faculty' or 'students'
  const [loadingMembers, setLoadingMembers] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    website: '',
    isActive: true,
  });

  const showBanner = (msg, isError = false) => {
    setNotification({ msg, isError });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadOrganizations = async () => {
    try {
      const res = await api.get(
        `/admin/organizations${searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : ''}`
      );
      setOrganizations(res.data.data.organizations || []);
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to fetch organizations', true);
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
      showBanner('Organization name is required', true);
      return;
    }

    try {
      setActionLoading(true);
      await api.post('/admin/organizations', formData);
      showBanner(`Organization "${formData.name}" created successfully!`);
      setShowCreateModal(false);
      setFormData({ name: '', code: '', description: '', website: '', isActive: true });
      await loadOrganizations();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to create organization', true);
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
      showBanner(`Organization "${formData.name}" updated successfully!`);
      setShowEditModal(false);
      setActiveOrg(null);
      await loadOrganizations();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to update organization', true);
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
      showBanner(`Organization "${org.name}" deleted successfully!`);
      setSelectedOrgs((prev) => prev.filter((id) => id !== org._id));
      await loadOrganizations();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete organization', true);
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
      const res = await api.post('/admin/organizations/bulk-delete', { ids: selectedOrgs });
      showBanner(res.data?.message || `Successfully deleted ${selectedOrgs.length} organization(s)!`);
      setSelectedOrgs([]);
      await loadOrganizations();
    } catch (err) {
      showBanner(err.response?.data?.message || 'Failed to delete selected organizations', true);
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewMembers = async (org) => {
    setActiveOrg(org);
    setShowMembersModal(true);
    setLoadingMembers(true);
    setMembersTab('faculty');
    try {
      const res = await api.get(`/admin/organizations/${org._id}`);
      setOrgDetails(res.data.data.organization);
    } catch (err) {
      showBanner('Failed to load organization members', true);
    } finally {
      setLoadingMembers(false);
    }
  };

  const totalFacultyAcross = organizations.reduce((acc, o) => acc + (o.facultyCount || 0), 0);
  const totalStudentsAcross = organizations.reduce((acc, o) => acc + (o.studentCount || 0), 0);

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
            <Building2 className="w-6 h-6 text-amber-400" />
            {isAdmin ? 'Organization Management' : 'My Organization'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin
              ? 'Define institutional organizations, govern cross-faculty student sharing rules, and inspect member allocations'
              : 'View institutional details and faculty-student collaboration boundaries'}
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              setFormData({ name: '', code: '', description: '', website: '', isActive: true });
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Organization</span>
          </button>
        )}
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
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Organizations</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{organizations.length}</div>
          <p className="text-[11px] text-slate-500 mt-1">Registered university / campus hubs</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enrolled Faculty</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-400">{totalFacultyAcross}</div>
          <p className="text-[11px] text-slate-500 mt-1">Faculty members linked across orgs</p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Enrolled Students</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-indigo-400">{totalStudentsAcross}</div>
          <p className="text-[11px] text-slate-500 mt-1">Candidates attributed to organizations</p>
        </div>
      </div>

      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search organizations by name, code, or description..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {isAdmin && selectedOrgs.length > 0 && (
          <button
            onClick={handleBulkDelete}
            disabled={actionLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Selected ({selectedOrgs.length})</span>
          </button>
        )}
      </div>

      {/* Organizations Table */}
      {organizations.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Building2 className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No organizations found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {isAdmin
              ? 'Click "Create New Organization" to set up your first institutional hub.'
              : 'No organization records found for your account.'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  {isAdmin && (
                    <th className="py-3.5 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={organizations.length > 0 && selectedOrgs.length === organizations.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded cursor-pointer"
                        title="Select All Organizations"
                      />
                    </th>
                  )}
                  <th className="py-3.5 px-4 font-semibold">Organization Name</th>
                  <th className="py-3.5 px-4 font-semibold">Code</th>
                  <th className="py-3.5 px-4 font-semibold">Faculty Count</th>
                  <th className="py-3.5 px-4 font-semibold">Students Count</th>
                  <th className="py-3.5 px-4 font-semibold">Batches</th>
                  <th className="py-3.5 px-4 font-semibold">Created Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {organizations.map((org) => {
                  const isSelected = selectedOrgs.includes(org._id);
                  return (
                    <tr
                      key={org._id}
                      className={`text-slate-300 hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {isAdmin && (
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(org._id)}
                            className="w-4 h-4 rounded cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                            {org.name}
                          </span>
                          {org.website && (
                            <a
                              href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-500 hover:text-amber-400 transition-colors"
                              title={org.website}
                            >
                              <Globe className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        {org.description && (
                          <p className="text-[11px] text-slate-400 mt-1 max-w-xs truncate">{org.description}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {org.code ? (
                          <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold uppercase">
                            {org.code}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            handleViewMembers(org);
                            setMembersTab('faculty');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors font-semibold cursor-pointer"
                        >
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>{org.facultyCount || 0} Faculty</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => {
                            handleViewMembers(org);
                            setMembersTab('students');
                          }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors font-semibold cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" />
                          <span>{org.studentCount || 0} Students</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(org.batches || []).length > 0 ? (
                            org.batches.slice(0, 3).map((b) => (
                              <span
                                key={b}
                                className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300"
                              >
                                {b}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-600 text-[11px]">-</span>
                          )}
                          {(org.batches || []).length > 3 && (
                            <span className="text-[10px] text-slate-500">+{org.batches.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewMembers(org)}
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                            title="View Enrolled Members"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(org)}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors cursor-pointer"
                                title="Edit Organization"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrg(org)}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-700 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Create New Organization</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Stanford University / Tech Institute"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Code / Abbreviation (Optional)</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. STANFORD or TI-CAMPUS"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Official Website (Optional)</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="e.g. https://university.edu"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief notes about this campus or institutional tenant..."
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-sm">Edit Organization</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Code / Abbreviation</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Official Website</label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isActiveOrg"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <label htmlFor="isActiveOrg" className="text-slate-300 text-xs cursor-pointer select-none">
                  Active Status
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors font-medium text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {activeOrg?.name} - Members
                  </h3>
                  <p className="text-[11px] text-slate-400">Institutional attribution roster</p>
                </div>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-800 bg-slate-950/50 px-5 pt-3 gap-4">
              <button
                onClick={() => setMembersTab('faculty')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  membersTab === 'faculty'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <GraduationCap className="w-4 h-4" />
                <span>Faculty ({orgDetails?.faculties?.length || 0})</span>
              </button>

              <button
                onClick={() => setMembersTab('students')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  membersTab === 'students'
                    ? 'border-amber-400 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
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
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : membersTab === 'faculty' ? (
                (orgDetails?.faculties || []).length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No faculty members currently assigned to this organization.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgDetails.faculties.map((f) => (
                      <div
                        key={f._id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{f.name}</p>
                          <p className="text-slate-400 text-[11px]">{f.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                            {f.department || 'General'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                (orgDetails?.students || []).length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No students currently assigned to this organization.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orgDetails.students.map((s) => (
                      <div
                        key={s._id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{s.name}</p>
                          <p className="text-slate-400 text-[11px]">
                            {s.email} {s.rollNumber ? `• Roll: ${s.rollNumber}` : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                            {s.batch || 'Unassigned Batch'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setShowMembersModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
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
