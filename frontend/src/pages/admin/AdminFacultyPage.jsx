import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import {
  GraduationCap,
  Plus,
  Upload,
  Download,
  Search,
  CheckCircle2,
  AlertCircle,
  Edit,
  Trash2,
  FileSpreadsheet,
  HelpCircle,
  X,
  FileText,
  Building2,
  Mail,
  Phone,
  Lock,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function AdminFacultyPage() {
  const { showAlert, showConfirm } = useModal();
  const [faculty, setFaculty] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Manual Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [createOrgTechs, setCreateOrgTechs] = useState([]);
  const [editOrgTechs, setEditOrgTechs] = useState([]);
  const [loadingCreateTechs, setLoadingCreateTechs] = useState(false);
  const [loadingEditTechs, setLoadingEditTechs] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    facultyId: '',
    name: '',
    email: '',
    password: '',
    technologies: [],
    department: '',
    organization: '',
    phone: '',
  });

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [editFormData, setEditFormData] = useState({
    facultyId: '',
    name: '',
    email: '',
    technologies: [],
    department: '',
    organization: '',
    phone: '',
    password: '',
  });

  // Excel Bulk Upload Modal
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  // Bulk Selection State
  const [selectedFaculty, setSelectedFaculty] = useState([]);

  const loadOrganizations = async () => {
    try {
      const res = await api.get('/admin/organizations');
      setOrganizations(res.data.data.organizations || []);
    } catch (_) {}
  };

  const loadTechnologiesForCreateOrg = async (orgName) => {
    if (!orgName) {
      setCreateOrgTechs([]);
      return;
    }
    try {
      setLoadingCreateTechs(true);
      const res = await api.get(`/admin/technologies?organization=${encodeURIComponent(orgName)}`);
      setCreateOrgTechs(res.data?.data?.technologies || []);
    } catch (_) {
      setCreateOrgTechs([]);
    } finally {
      setLoadingCreateTechs(false);
    }
  };

  const loadTechnologiesForEditOrg = async (orgName) => {
    if (!orgName) {
      setEditOrgTechs([]);
      return;
    }
    try {
      setLoadingEditTechs(true);
      const res = await api.get(`/admin/technologies?organization=${encodeURIComponent(orgName)}`);
      setEditOrgTechs(res.data?.data?.technologies || []);
    } catch (_) {
      setEditOrgTechs([]);
    } finally {
      setLoadingEditTechs(false);
    }
  };

  const loadFaculty = async () => {
    try {
      let query = '';
      const params = [];
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (statusFilter) params.push(`status=${statusFilter}`);
      if (params.length) query = `?${params.join('&')}`;

      const res = await api.get(`/admin/faculty${query}`);
      setFaculty(res.data.data.faculty || []);
    } catch (err) {
      console.error('Failed to load faculty', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  useEffect(() => {
    loadFaculty();
  }, [searchTerm, statusFilter]);

  // Create Faculty Member
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createFormData.organization) {
      await showAlert({
        title: 'Validation Error',
        message: 'Organization is mandatory for faculty.',
        type: 'warning',
      });
      return;
    }
    try {
      setActionLoading(true);
      await api.post('/admin/faculty', {
        ...createFormData,
        department: (createFormData.technologies || []).join(', '),
      });
      await showAlert({
        title: 'Faculty Created',
        message: 'Faculty account created successfully!',
        type: 'success',
      });
      setShowCreateModal(false);
      setCreateFormData({ facultyId: '', name: '', email: '', password: '', technologies: [], department: '', organization: '', phone: '' });
      loadFaculty();
    } catch (err) {
      await showAlert({
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Failed to create faculty member',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (f) => {
    setEditingFaculty(f);
    const existingTechs = f.technologies && f.technologies.length > 0
      ? f.technologies
      : (f.department ? f.department.split(',').map((s) => s.trim()).filter(Boolean) : []);
    setEditFormData({
      facultyId: f.facultyId || '',
      name: f.name || '',
      email: f.email || '',
      technologies: existingTechs,
      department: f.department || '',
      organization: f.organization || '',
      phone: f.phone || '',
      password: '',
    });
    loadTechnologiesForEditOrg(f.organization || '');
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingFaculty) return;
    if (!editFormData.organization) {
      await showAlert({
        title: 'Validation Error',
        message: 'Organization is mandatory for faculty.',
        type: 'warning',
      });
      return;
    }
    try {
      setActionLoading(true);
      await api.put(`/admin/faculty/${editingFaculty._id}`, {
        ...editFormData,
        department: (editFormData.technologies || []).join(', '),
      });
      await showAlert({
        title: 'Faculty Updated',
        message: 'Faculty account updated successfully!',
        type: 'success',
      });
      setShowEditModal(false);
      loadFaculty();
    } catch (err) {
      await showAlert({
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update faculty member',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCreateTech = (techName) => {
    setCreateFormData((prev) => {
      const exists = prev.technologies?.includes(techName);
      return {
        ...prev,
        technologies: exists
          ? prev.technologies.filter((t) => t !== techName)
          : [...(prev.technologies || []), techName],
      };
    });
  };

  const handleToggleEditTech = (techName) => {
    setEditFormData((prev) => {
      const exists = prev.technologies?.includes(techName);
      return {
        ...prev,
        technologies: exists
          ? prev.technologies.filter((t) => t !== techName)
          : [...(prev.technologies || []), techName],
      };
    });
  };

  // Toggle Active/Inactive Status
  const handleToggleStatus = async (f) => {
    const confirmed = await showConfirm({
      title: `${f.isActive ? 'Deactivate' : 'Activate'} Faculty Account`,
      message: `Are you sure you want to ${f.isActive ? 'deactivate' : 'activate'} ${f.name}?`,
      confirmText: f.isActive ? 'Deactivate' : 'Activate',
      isDanger: f.isActive,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.put(`/admin/users/${f._id}/toggle-status`);
      loadFaculty();
    } catch (err) {
      await showAlert({
        title: 'Status Update Failed',
        message: err.response?.data?.message || 'Failed to toggle status',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete Faculty Member
  const handleDeleteFaculty = async (f) => {
    const confirmed = await showConfirm({
      title: 'Delete Faculty Member',
      message: `Are you sure you want to permanently delete faculty member "${f.name}"? This action cannot be undone.`,
      confirmText: 'Delete Faculty',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/faculty/${f._id}`);
      await showAlert({
        title: 'Faculty Deleted',
        message: 'Faculty member deleted successfully!',
        type: 'success',
      });
      loadFaculty();
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete faculty member',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Download Sample Excel Template
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/admin/faculty/template-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'faculty_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert({
        title: 'Download Failed',
        message: 'Failed to download faculty template.',
        type: 'error',
      });
    }
  };

  // Bulk Delete Faculty
  const handleBulkDelete = async () => {
    if (selectedFaculty.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Delete Selected Faculty Accounts',
      message: `Are you sure you want to permanently delete ${selectedFaculty.length} selected faculty member(s)? This action cannot be undone.`,
      confirmText: `Delete (${selectedFaculty.length})`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/faculty/bulk-delete', {
        ids: selectedFaculty,
        facultyIds: selectedFaculty,
      });
      await showAlert({
        title: 'Faculty Members Deleted',
        message: res.data?.message || `Successfully deleted ${selectedFaculty.length} faculty member(s).`,
        type: 'success',
      });
      setSelectedFaculty([]);
      loadFaculty();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected faculty members',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Upload Excel File
  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      await showAlert({
        title: 'File Required',
        message: 'Please select an Excel (.xlsx/.xls) file first before proceeding.',
        type: 'warning',
      });
      return;
    }

    const payload = new FormData();
    payload.append('file', excelFile);

    try {
      setIsUploading(true);
      setUploadStatus(null);
      const res = await api.post('/admin/faculty/upload-excel', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowExcelModal(false);
      setExcelFile(null);
      await showAlert({
        title: 'Upload Successful',
        message: res.data?.message || 'Faculty members uploaded successfully!',
        type: 'success',
      });
      loadFaculty();
    } catch (err) {
      await showAlert({
        title: 'Upload Failed',
        message: err.response?.data?.message || 'Failed to process Excel upload',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-blue-600" />
            <span>Faculty & Instructor Management</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Provision instructor accounts for institutional access, client sales, and exam oversight
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedFaculty.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedFaculty.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setExcelFile(null);
              setUploadStatus(null);
              setShowExcelModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Import via Excel</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Faculty</span>
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
            placeholder="Search name, email, department..."
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>

        {selectedFaculty.length > 0 && (
          <span className="text-xs text-slate-500 font-medium ml-auto">
            {selectedFaculty.length} of {faculty.length} faculty selected
          </span>
        )}
      </div>

      {/* Faculty Table */}
      {faculty.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500">
          <GraduationCap className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No faculty members found</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create instructor accounts manually or bulk import them using Excel.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={faculty.length > 0 && selectedFaculty.length === faculty.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFaculty(faculty.map((f) => f._id));
                        } else {
                          setSelectedFaculty([]);
                        }
                      }}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">Faculty Member</th>
                  <th className="py-3 px-4 font-semibold">Faculty ID</th>
                  <th className="py-3 px-4 font-semibold">Email</th>
                  <th className="py-3 px-4 font-semibold">Organization</th>
                  <th className="py-3 px-4 font-semibold">Technologies</th>
                  <th className="py-3 px-4 font-semibold">Phone</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Created Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {faculty.map((f) => {
                  const isSelected = selectedFaculty.includes(f._id);
                  return (
                  <tr key={f._id} className={`text-slate-600 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFaculty((prev) => [...prev, f._id]);
                          } else {
                            setSelectedFaculty((prev) => prev.filter((id) => id !== f._id));
                          }
                        }}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {f.profilePicture ? (
                          <img
                            src={f.profilePicture}
                            alt={f.name}
                            className="w-6 h-6 rounded-lg object-cover shrink-0 border border-slate-200"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0 text-xs">
                            {f.name?.charAt(0) || 'F'}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-bold">{f.name}</span>
                          <span className="text-[11px] font-mono text-slate-400 font-normal">
                            {f.facultyId || 'No ID'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600 whitespace-nowrap">
                      {f.facultyId || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {f.email || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {f.organization ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                          {f.organization}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {f.technologies && f.technologies.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {f.technologies.map((t, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      ) : f.department ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                          {f.department}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                      {f.phone || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          f.isActive
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}
                      >
                        {f.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono whitespace-nowrap">
                      {f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleStatus(f)}
                          disabled={actionLoading}
                          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            f.isActive
                              ? 'bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600'
                              : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                          }`}
                          title={f.isActive ? 'Deactivate Account' : 'Activate Account'}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(f)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Edit Faculty Member"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFaculty(f)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Faculty Account"
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

      {/* CREATE FACULTY MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>Create Faculty Account</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Faculty ID <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.facultyId}
                  onChange={(e) => setCreateFormData({ ...createFormData, facultyId: e.target.value })}
                  placeholder="e.g. FAC2026001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
                  Initial Password <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={createFormData.password}
                    onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                  placeholder="e.g. rajesh.sharma@university.edu (optional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned Organization <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  required
                  value={createFormData.organization}
                  onChange={(e) => {
                    const org = e.target.value;
                    setCreateFormData({ ...createFormData, organization: org, technologies: [] });
                    loadTechnologiesForCreateOrg(org);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="">Select Organization (Mandatory) *</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org.name}>
                      {org.name} {org.code ? `(${org.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Technologies Taught (Optional)
                </label>
                {!createFormData.organization ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                    Please select an Assigned Organization first to load available technologies.
                  </div>
                ) : loadingCreateTechs ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                    Loading technologies...
                  </div>
                ) : createOrgTechs.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                    No technologies found for <strong>{createFormData.organization}</strong> yet. (Faculty can create technologies and batches after account setup).
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-500 mb-1.5">
                      Select one or more technologies created for {createFormData.organization}:
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      {createOrgTechs.map((tech) => {
                        const isSelected = createFormData.technologies?.includes(tech.name);
                        return (
                          <button
                            type="button"
                            key={tech._id || tech.name}
                            onClick={() => handleToggleCreateTech(tech.name)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm font-bold'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{tech.name}
                          </button>
                        );
                      })}
                    </div>
                    {createFormData.technologies?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 items-center">
                        <span className="text-[11px] text-slate-500 font-medium mr-1">
                          Selected ({createFormData.technologies.length}):
                        </span>
                        {createFormData.technologies.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() => handleToggleCreateTech(t)}
                              className="hover:text-rose-600 ml-0.5 cursor-pointer font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={createFormData.phone}
                  onChange={(e) => setCreateFormData({ ...createFormData, phone: e.target.value })}
                  placeholder="+91-..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  {actionLoading ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT FACULTY MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <span>Edit Faculty Account</span>
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

               <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Faculty ID <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.facultyId || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, facultyId: e.target.value })}
                  placeholder="e.g. FAC2026001"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="e.g. faculty@university.edu (optional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Assigned Organization <span className="text-red-500 font-bold ml-0.5">*</span>
                </label>
                <select
                  required
                  value={editFormData.organization}
                  onChange={(e) => {
                    const newOrg = e.target.value;
                    setEditFormData({ ...editFormData, organization: newOrg, technologies: [] });
                    loadTechnologiesForEditOrg(newOrg);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Organization (Mandatory) *</option>
                  {organizations.map((org) => (
                    <option key={org._id} value={org.name}>
                      {org.name} {org.code ? `(${org.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Technologies Taught (Optional)
                </label>
                {!editFormData.organization ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                    Please select an Assigned Organization first to load available technologies.
                  </div>
                ) : loadingEditTechs ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-xs">
                    Loading technologies...
                  </div>
                ) : editOrgTechs.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs">
                    No technologies found for <strong>{editFormData.organization}</strong> yet. (Faculty can create technologies and batches after account setup).
                  </div>
                ) : (
                  <>
                    <p className="text-[11px] text-slate-500 mb-1.5">
                      Select one or more technologies created for {editFormData.organization}:
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      {editOrgTechs.map((tech) => {
                        const isSelected = editFormData.technologies?.includes(tech.name);
                        return (
                          <button
                            type="button"
                            key={tech._id || tech.name}
                            onClick={() => handleToggleEditTech(tech.name)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm font-bold'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {isSelected ? '✓ ' : '+ '}{tech.name}
                          </button>
                        );
                      })}
                    </div>
                    {editFormData.technologies?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1 items-center">
                        <span className="text-[11px] text-slate-500 font-medium mr-1">
                          Selected ({editFormData.technologies.length}):
                        </span>
                        {editFormData.technologies.map((t) => (
                          <span
                            key={t}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold"
                          >
                            {t}
                            <button
                              type="button"
                              onClick={() => handleToggleEditTech(t)}
                              className="hover:text-rose-600 ml-0.5 cursor-pointer font-bold"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  placeholder="+91-..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-200 font-semibold mb-1">
                  Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    placeholder="Enter new password if resetting"
                    className="w-full px-3 py-2 pr-10 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    title={showEditPassword ? 'Hide password' : 'Show password'}
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EXCEL BULK UPLOAD MODAL */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Bulk Import Faculty from Excel</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload multiple instructors, assigned organizations, and technologies via spreadsheet</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setUploadStatus(null);
                  setExcelFile(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Faculty Excel Column Specifications (7 Supported Fields):</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample Template (.xlsx)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                  {/* Mandatory Fields */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <span>Mandatory Fields (<span className="text-red-500 font-bold">*</span>)</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">Faculty ID <span className="text-red-500 font-bold">*</span> :</strong> Unique instructor ID (e.g. FAC2026001)
                      </li>
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">Full Name <span className="text-red-500 font-bold">*</span> :</strong> Instructor full official name
                      </li>
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">Organization <span className="text-red-500 font-bold">*</span> :</strong> College / University name (e.g. Tech University)
                      </li>
                    </ul>
                  </div>

                  {/* Optional Fields */}
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>Optional Fields</span>
                    </div>
                    <ul className="space-y-1.5 text-slate-600 dark:text-slate-300">
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">Technologies:</strong> Comma-separated courses (optional, e.g. Java Full Stack, Python)
                      </li>
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">Password:</strong> Initial password (defaults to <span className="font-mono text-emerald-600 dark:text-emerald-400">Faculty@123</span> if omitted)
                      </li>
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">Email:</strong> Instructor email (must be unique if provided)
                      </li>
                      <li>
                        <strong className="text-slate-800 dark:text-slate-100 font-mono">Phone:</strong> Mobile or telephone contact number
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <form onSubmit={handleExcelUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-800/50 transition-colors">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline">
                      Click to choose an .xlsx or .xls file
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1">Microsoft Excel format (.xlsx / .xls)</p>
                  </div>
                  {excelFile && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExcelModal(false);
                      setUploadStatus(null);
                      setExcelFile(null);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!excelFile || isUploading}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importing Faculty...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload & Import Faculty</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {uploadStatus && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  uploadStatus.data?.errorCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {uploadStatus.data?.errorCount > 0 ? (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>{uploadStatus.message}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <p>Imported: <strong className="font-mono text-emerald-600">{uploadStatus.data?.importedCount || 0}</strong></p>
                    <p>Errors: <strong className="font-mono text-rose-600">{uploadStatus.data?.errorCount || 0}</strong></p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
