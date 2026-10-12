import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useModal } from '../../context/ModalContext';
import * as XLSX from 'xlsx';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Award,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Upload,
  FileSpreadsheet,
  Download,
  HelpCircle,
  X,
  Trash2,
  Edit,
  Layers,
  Building2,
  Share2,
  Copy,
  Check,
  ArrowLeft,
  DownloadCloud,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const isAdmin = user?.role === 'ADMIN';

  // Navigation state: null = Organization Directory view, string/ID = organization student table
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [organizationsSummary, setOrganizationsSummary] = useState([]);
  const [availableOrganizations, setAvailableOrganizations] = useState([]);

  // Student table state
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableGenders, setAvailableGenders] = useState([]);
  const [definedBatches, setDefinedBatches] = useState([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk Selection State
  const [selectedUsers, setSelectedUsers] = useState([]);

  const handleSelectOrg = (orgId) => {
    setUsers([]); // Clear previous candidates immediately to prevent flashing stale data
    setSelectedUsers([]);
    setTableLoading(true);
    setSelectedOrg(orgId);
    setPage(1);
  };

  const handleBackToOrgDirectory = () => {
    setUsers([]);
    setSelectedUsers([]);
    setTableLoading(false);
    setSelectedOrg(null);
    setPage(1);
  };

  // Modals state
  const [showManualModal, setShowManualModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Share Students Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareOrg, setShareOrg] = useState('');
  const [shareBatches, setShareBatches] = useState([]);
  const [shareTokenResult, setShareTokenResult] = useState(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Import Shared Students Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTokenInput, setImportTokenInput] = useState('');
  const [importLoading, setImportLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    organization: '',
    rollNumber: '',
    phone: '',
    batch: '',
    gender: '',
    age: '',
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    password: '',
    organization: '',
    rollNumber: '',
    phone: '',
    batch: '',
    gender: '',
    age: '',
  });

  // Check URL params for import token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('importToken');
    if (token) {
      setImportTokenInput(token);
      setShowImportModal(true);
    }
  }, []);

  const loadUsers = async () => {
    try {
      setTableLoading(true);
      let query = `?page=${page}&limit=15`;
      if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (batchFilter) query += `&batch=${encodeURIComponent(batchFilter)}`;
      if (genderFilter) query += `&gender=${encodeURIComponent(genderFilter)}`;

      // Organization filter
      if (selectedOrg && selectedOrg !== '__ALL__') {
        query += `&organization=${encodeURIComponent(selectedOrg)}`;
      }

      const res = await api.get(`/admin/users${query}`);
      setUsers(res.data.data.users || []);
      setPagination(res.data.data.pagination || { total: 0, pages: 1 });
      if (res.data.data.availableBatches) {
        setAvailableBatches(res.data.data.availableBatches);
      }
      if (res.data.data.availableGenders) {
        setAvailableGenders(res.data.data.availableGenders);
      }
      if (res.data.data.availableOrganizations) {
        setAvailableOrganizations(res.data.data.availableOrganizations);
      }
      if (res.data.data.organizationsSummary) {
        setOrganizationsSummary(res.data.data.organizationsSummary);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  };

  const [definedOrganizations, setDefinedOrganizations] = useState([]);

  const loadBatchesAndOrgs = async () => {
    try {
      const [batchRes, orgRes] = await Promise.allSettled([
        api.get('/admin/batches'),
        api.get('/admin/organizations'),
      ]);
      if (batchRes.status === 'fulfilled') {
        setDefinedBatches(batchRes.value.data?.data?.batches || []);
      }
      if (orgRes.status === 'fulfilled') {
        setDefinedOrganizations(orgRes.value.data?.data?.organizations || []);
      }
    } catch (err) {
      console.error('Failed to load batches or organizations', err);
    }
  };

  useEffect(() => {
    loadBatchesAndOrgs();
  }, []);

  const allOrganizationsList = Array.from(
    new Set([
      ...definedOrganizations.map((o) => o.name),
      ...organizationsSummary.map((o) => o.name),
      ...availableOrganizations,
      editingUser?.organization,
    ].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const allBatchesList = Array.from(
    new Set([
      ...definedBatches.map((b) => b.name),
      ...availableBatches,
      editingUser?.batch,
    ].filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    loadUsers();
    setSelectedUsers([]);
  }, [page, searchTerm, statusFilter, batchFilter, genderFilter, selectedOrg]);

  const handleToggleStatus = async (user) => {
    const confirmed = await showConfirm({
      title: `${user.isActive ? 'Deactivate' : 'Activate'} Candidate`,
      message: `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.name}?`,
      confirmText: user.isActive ? 'Deactivate' : 'Activate',
      isDanger: user.isActive,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.put(`/admin/users/${user._id}/toggle-status`);
      await loadUsers();
    } catch (err) {
      await showAlert({
        title: 'Status Update Failed',
        message: err.response?.data?.message || 'Failed to update user status',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = await showConfirm({
      title: 'Delete Candidate Account',
      message: `Are you sure you want to delete student "${user.name}"? This action will permanently remove their account, exam attempts, and submitted solutions.`,
      confirmText: 'Delete Student',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/users/${user._id}`);
      await showAlert({
        title: 'Student Deleted',
        message: 'Student deleted successfully!',
        type: 'success',
      });
      await loadUsers();
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete student',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Bulk Delete Candidates
  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Candidate Accounts',
      message: `Are you sure you want to permanently delete ${selectedUsers.length} selected candidate(s)? This will cascade delete their accounts, exam attempts, and all submitted solutions.`,
      confirmText: `Delete (${selectedUsers.length}) Candidates`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/users/bulk-delete', { userIds: selectedUsers });
      await showAlert({
        title: 'Candidates Deleted',
        message: res.data?.message || `Successfully deleted ${selectedUsers.length} candidate(s).`,
        type: 'success',
      });
      setSelectedUsers([]);
      await loadUsers();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected candidates',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      organization: user.organization || '',
      rollNumber: user.rollNumber || '',
      phone: user.phone || '',
      batch: user.batch || '',
      gender: user.gender || '',
      age: user.age !== undefined && user.age !== null ? user.age : '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await api.put(`/admin/students/${editingUser._id}`, editFormData);
      await showAlert({
        title: 'Student Updated',
        message: 'Student updated successfully!',
        type: 'success',
      });
      setShowEditModal(false);
      await loadUsers();
    } catch (err) {
      await showAlert({
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update student',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Student Creation
  const handleOpenManualModal = () => {
    const defaultOrg = (selectedOrg && selectedOrg !== '__ALL__' && selectedOrg !== 'unassigned')
      ? selectedOrg
      : (user?.organization || '');
    setFormData({
      name: '',
      email: '',
      password: '',
      organization: defaultOrg,
      rollNumber: '',
      phone: '',
      batch: '',
      gender: '',
      age: '',
    });
    setShowManualModal(true);
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/students/create', formData);
      await showAlert({
        title: 'Student Created',
        message: 'Student created successfully!',
        type: 'success',
      });
      setShowManualModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        organization: '',
        rollNumber: '',
        phone: '',
        batch: '',
        gender: '',
        age: '',
      });
      loadUsers();
    } catch (err) {
      await showAlert({
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Failed to create student',
        type: 'error',
      });
    }
  };

  // Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Full Name': 'Amit Verma',
        'Email': 'amit.verma@example.com',
        'Password': 'Password@123',
        'Organization': 'Tech University',
        'Batch': 'Batch-2026-A',
        'Roll Number': 'CS2026-001',
        'Phone': '9876543210',
        'Gender': 'Male',
        'Age': 21,
      },
      {
        'Full Name': 'Sneha Rao',
        'Email': 'sneha.rao@example.com',
        'Password': 'Password@123',
        'Organization': 'Tech University',
        'Batch': 'Batch-2026-A',
        'Roll Number': 'CS2026-002',
        'Phone': '9876543211',
        'Gender': 'Female',
        'Age': 20,
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Template');
    XLSX.writeFile(workbook, 'students_upload_template.xlsx');
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
      const res = await api.post('/admin/students/upload-excel', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowExcelModal(false);
      setExcelFile(null);

      const imported = res.data?.importedCount ?? res.data?.data?.importedCount ?? 0;
      const updated = res.data?.updatedCount ?? res.data?.data?.updatedCount ?? 0;
      const failed = res.data?.failedCount ?? res.data?.data?.failedCount ?? 0;

      await showAlert({
        title: 'Upload Successful',
        message: res.data?.message || `Processed candidates successfully! Created: ${imported}, Updated: ${updated}, Errors: ${failed}`,
        type: failed > 0 ? 'warning' : 'success',
      });
      loadUsers();
    } catch (err) {
      await showAlert({
        title: 'Upload Processing Failed',
        message: err.response?.data?.message || 'Failed to process Excel upload',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Open Share Students Modal
  const handleOpenShare = () => {
    const defaultOrg = (selectedOrg && selectedOrg !== '__ALL__' && selectedOrg !== 'unassigned')
      ? selectedOrg
      : (user?.organization || allOrganizationsList[0] || '');
    setShareOrg(defaultOrg);
    setShareBatches([]);
    setShareTokenResult(null);
    setCopiedToken(false);
    setCopiedLink(false);
    setShowShareModal(true);
  };

  // Generate Student Share Token
  const handleGenerateShareToken = async () => {
    if (!shareOrg) {
      await showAlert({
        title: 'Organization Required',
        message: 'Please specify an organization to share students from.',
        type: 'warning',
      });
      return;
    }

    try {
      setActionLoading(true);
      const res = await api.post('/admin/students/share-token', {
        organization: shareOrg,
        batches: shareBatches,
      });
      const result = res.data?.data || res.data || {};
      const token = result.shareToken || result.token || '';
      const fallbackLink = `${window.location.origin}/admin/students?importToken=${encodeURIComponent(token)}`;
      const shareLink = (result.shareLink && result.shareLink.startsWith('http'))
        ? result.shareLink
        : fallbackLink;

      setShareTokenResult({
        ...result,
        shareToken: token,
        shareLink,
        studentCount: result.studentCount ?? 0,
      });
    } catch (err) {
      await showAlert({
        title: 'Share Generation Failed',
        message: err.response?.data?.message || 'Failed to generate share link',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Import Shared Students
  const handleImportSharedStudents = async () => {
    if (!importTokenInput.trim()) {
      await showAlert({
        title: 'Token Required',
        message: 'Please paste the share token or link provided by the faculty.',
        type: 'warning',
      });
      return;
    }

    let token = importTokenInput.trim();
    if (token.includes('importToken=')) {
      const match = token.match(/importToken=([^&]+)/);
      if (match && match[1]) {
        token = decodeURIComponent(match[1]);
      }
    }

    try {
      setImportLoading(true);
      const res = await api.post('/admin/students/import-shared', { token });
      setShowImportModal(false);
      setImportTokenInput('');
      await showAlert({
        title: 'Candidates Imported',
        message: res.data?.message || `Successfully linked ${res.data?.data?.linkedCount || 0} shared candidates into your faculty account!`,
        type: 'success',
      });
      loadUsers();
    } catch (err) {
      await showAlert({
        title: 'Import Failed',
        message: err.response?.data?.message || 'Invalid or expired student share token',
        type: 'error',
      });
    } finally {
      setImportLoading(false);
    }
  };

  const getSelectedOrgDisplayName = () => {
    if (selectedOrg === '__ALL__') return 'All Organizations (All Candidates)';
    if (selectedOrg === 'unassigned') return 'Direct / Unassigned Candidates';
    return selectedOrg || 'Organization View';
  };

  if (loading && !organizationsSummary.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Organization Directory View (When user has not chosen a specific organization)
  const isViewingOrgDirectory = selectedOrg === null;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {!isViewingOrgDirectory && (
              <button
                onClick={handleBackToOrgDirectory}
                className="p-1.5 -ml-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Back to Organizations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-sky-400" />
              {isViewingOrgDirectory
                ? 'Candidate Organizations'
                : getSelectedOrgDisplayName()}
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            {isViewingOrgDirectory
              ? 'Select an organization to inspect its students, batches, and candidate cohorts'
              : `Managing candidate accounts and batches under ${getSelectedOrgDisplayName()}`}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {selectedUsers.length > 0 && !isViewingOrgDirectory && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedUsers.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
            title="Share students of an organization/batch with another faculty member"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Students</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-sky-600/20 transition-all cursor-pointer"
            title="Import/link shared students using a faculty link or token"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Import Shared</span>
          </button>

          <button
            onClick={handleOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>

          <button
            onClick={() => setShowExcelModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Upload (Excel)</span>
          </button>
        </div>
      </div>

      {/* ADMIN DIRECTORY VIEW: Show Organization Cards */}
      {isViewingOrgDirectory ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Institutions & Organizations ({organizationsSummary.length})</span>
            </h2>
            <button
              onClick={() => handleSelectOrg('__ALL__')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <span>View All Candidates (Flat List)</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizationsSummary.map((org) => (
              <div
                key={org.id}
                onClick={() => handleSelectOrg(org.id)}
                className="group p-5 bg-slate-900 border border-slate-800 hover:border-sky-500/50 rounded-2xl cursor-pointer transition-all hover:shadow-xl hover:shadow-sky-500/5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500/20 transition-colors">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm group-hover:text-sky-300 transition-colors line-clamp-1">
                          {org.name}
                        </h3>
                        <p className="text-[11px] text-slate-400">
                          {org.activeCount} active / {org.studentCount} enrolled
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-sky-300 border border-slate-700 shrink-0">
                      {org.studentCount} Students
                    </span>
                  </div>

                  {org.batches && org.batches.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80">
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 tracking-wider">
                        Active Batches ({org.batches.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {org.batches.slice(0, 3).map((b) => (
                          <span
                            key={b}
                            className="px-2 py-0.5 rounded bg-slate-950 text-indigo-300 text-[10px] font-mono border border-slate-800"
                          >
                            {b}
                          </span>
                        ))}
                        {org.batches.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 text-[10px] font-mono">
                            +{org.batches.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-white pt-2 border-t border-slate-800/50">
                  <span>Inspect Cohort</span>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}

            {/* Quick Card: View All */}
            <div
              onClick={() => handleSelectOrg('__ALL__')}
              className="p-5 bg-slate-950/40 border border-dashed border-slate-800 hover:border-slate-700 rounded-2xl cursor-pointer transition-all flex flex-col justify-center items-center text-center space-y-2 group"
            >
              <Users className="w-8 h-8 text-slate-600 group-hover:text-sky-400 transition-colors" />
              <div>
                <p className="text-xs font-bold text-slate-300 group-hover:text-white">View All Candidates</p>
                <p className="text-[11px] text-slate-500">Unfiltered flat table of all candidate accounts</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CANDIDATE TABLE VIEW */
        <div className="space-y-4">
          {/* Organization Breadcrumb & Switcher */}
          <div className="flex items-center justify-between bg-slate-950/60 border border-slate-800 px-4 py-2.5 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-slate-400">
              <button
                onClick={handleBackToOrgDirectory}
                className="hover:text-white underline cursor-pointer"
              >
                Organizations
              </button>
              <span>/</span>
              <span className="font-bold text-white">{getSelectedOrgDisplayName()}</span>
            </div>
            <button
              onClick={handleBackToOrgDirectory}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
            >
              ← Back to Organizations Directory
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, roll number..."
                className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <select
              value={selectedOrg === '__ALL__' ? '__ALL__' : selectedOrg || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleSelectOrg(val || '__ALL__');
              }}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="__ALL__">All Organizations</option>
              {allOrganizationsList.map((orgName) => (
                <option key={orgName} value={orgName}>
                  {orgName}
                </option>
              ))}
              <option value="unassigned">Direct / Unassigned</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Deactivated Only</option>
            </select>

            <select
              value={batchFilter}
              onChange={(e) => {
                setBatchFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Batches</option>
              {Array.from(new Set([...definedBatches.map((b) => b.name), ...availableBatches]))
                .filter(Boolean)
                .map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
            </select>

            <select
              value={genderFilter}
              onChange={(e) => {
                setGenderFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            {selectedUsers.length > 0 && (
              <span className="text-xs text-slate-400 font-medium ml-auto">
                {selectedUsers.length} of {users.length} candidates selected
              </span>
            )}
          </div>

          {/* Students Table */}
          {tableLoading ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-16 flex flex-col items-center justify-center space-y-3 shadow-xl">
              <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 font-medium">
                Loading candidates for {getSelectedOrgDisplayName()}...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
              <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
              <h3 className="text-base font-semibold text-white">No candidates found</h3>
              <p className="text-xs text-slate-400 mt-1">
                Try modifying your search criteria, add new candidates, or import via Excel.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1450px] text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                      <th className="py-3 px-4 w-10">
                        <input
                          type="checkbox"
                          checked={users.length > 0 && selectedUsers.length === users.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(users.map((u) => u._id));
                            } else {
                              setSelectedUsers([]);
                            }
                          }}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold">Candidate</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Phone</th>
                      <th className="py-3 px-4 font-semibold">Organization</th>
                      {isAdmin && <th className="py-3 px-4 font-semibold">Created By</th>}
                      <th className="py-3 px-4 font-semibold">Roll Number</th>
                      <th className="py-3 px-4 font-semibold">Batch</th>
                      <th className="py-3 px-4 font-semibold">Gender</th>
                      <th className="py-3 px-4 font-semibold">Age</th>
                      <th className="py-3 px-4 font-semibold">Exams Taken</th>
                      <th className="py-3 px-4 font-semibold">Avg Score</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.map((u) => {
                      const isSelected = selectedUsers.includes(u._id);
                      return (
                        <tr
                          key={u._id}
                          className={`text-slate-300 hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-amber-500/5' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedUsers((prev) => [...prev, u._id]);
                                } else {
                                  setSelectedUsers((prev) => prev.filter((id) => id !== u._id));
                                }
                              }}
                              className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 accent-amber-500 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-semibold text-white whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0 text-xs">
                                {u.name?.charAt(0) || 'U'}
                              </div>
                              <span className="font-bold">{u.name}</span>
                              {u.assignedFaculties?.length > 1 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                                  Shared ({u.assignedFaculties.length})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">{u.email}</td>
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">{u.phone || '—'}</td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-300">
                              {u.organization || 'Direct / None'}
                            </span>
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-300">
                                  {u.createdBy?.name || 'Admin'}
                                </span>
                                {u.createdBy?.role && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                      u.createdBy.role === 'FACULTY'
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                                    }`}
                                  >
                                    {u.createdBy.role}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">{u.rollNumber || '—'}</td>
                          <td className="py-3 px-4 font-medium text-indigo-300 whitespace-nowrap">{u.batch || '—'}</td>
                          <td className="py-3 px-4 text-slate-400 whitespace-nowrap">{u.gender || '—'}</td>
                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">{u.age || '—'}</td>

                          <td className="py-3 px-4 font-mono text-slate-300 whitespace-nowrap">{u.examsAttempted || 0}</td>
                          <td className="py-3 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                            {u.averageScore || 0}%
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                u.isActive
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenEdit(u)}
                                disabled={actionLoading}
                                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                title="Edit Student"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={actionLoading}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  u.isActive
                                    ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                                }`}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              {u.role !== 'ADMIN' && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={actionLoading}
                                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  title="Delete Student"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Showing Page {page} of {pagination.pages} ({pagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= pagination.pages}
                      onClick={() => setPage(page + 1)}
                      className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700 cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* SHARE STUDENTS MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <span>Share Candidates with Faculty</span>
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-400 space-y-3">
              <p>
                Generate a secure share token or link. Any faculty member with this link can import
                these students into their candidate pool without re-uploading spreadsheets.
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Organization *
                </label>
                <select
                  required
                  value={shareOrg}
                  onChange={(e) => setShareOrg(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- Select Organization to Share --</option>
                  {allOrganizationsList.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Filter by Batches (Optional, leave blank to share all batches)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-950 border border-slate-800 rounded-xl">
                  {Array.from(
                    new Set([...definedBatches.map((b) => b.name), ...availableBatches])
                  )
                    .filter(Boolean)
                    .map((batch) => {
                      const isChecked = shareBatches.includes(batch);
                      return (
                        <button
                          type="button"
                          key={batch}
                          onClick={() => {
                            if (isChecked) {
                              setShareBatches(shareBatches.filter((b) => b !== batch));
                            } else {
                              setShareBatches([...shareBatches, batch]);
                            }
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs font-mono transition-colors ${
                            isChecked
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                          }`}
                        >
                          {batch}
                        </button>
                      );
                    })}
                </div>
              </div>

              {!shareTokenResult ? (
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateShareToken}
                    disabled={actionLoading || !shareOrg}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {actionLoading ? 'Generating...' : 'Generate Share Link'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>
                      Found <strong>{shareTokenResult.studentCount}</strong> student(s) ready for
                      sharing!
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Shareable Import Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareTokenResult.shareLink}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(shareTokenResult.shareLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Or Direct Token
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareTokenResult.shareToken}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(shareTokenResult.shareToken);
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2000);
                        }}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedToken ? 'Copied!' : 'Copy Token'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowShareModal(false)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* IMPORT SHARED STUDENTS MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-sky-400" />
                <span>Import Shared Candidates</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-400">
                Paste the student share link or token received from another faculty member to link
                their students to your teaching roster.
              </p>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Share Link or Token *
                </label>
                <textarea
                  rows="3"
                  value={importTokenInput}
                  onChange={(e) => setImportTokenInput(e.target.value)}
                  placeholder="Paste URL (https://.../admin/users?importToken=...) or raw JWT token here"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSharedStudents}
                  disabled={importLoading || !importTokenInput.trim()}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
                >
                  {importLoading ? 'Importing...' : 'Import Students'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL STUDENT CREATION MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-200">
            <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span>Add Student Manually</span>
              </h2>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. rahul@example.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Organization / Institution</label>
                <select
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="">-- No Organization (Unassigned) --</option>
                  {allOrganizationsList.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g. CS2026-001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Batch</label>
                  <select
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="">-- No Batch (Unassigned) --</option>
                    {allBatchesList.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Age</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="21"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 cursor-pointer"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT STUDENT MODAL */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Edit Candidate Details</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">Organization / Institution</label>
                <select
                  value={editFormData.organization}
                  onChange={(e) => setEditFormData({ ...editFormData, organization: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="">-- No Organization (Unassigned) --</option>
                  {allOrganizationsList.map((org) => (
                    <option key={org} value={org}>
                      {org}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={editFormData.rollNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Batch</label>
                  <select
                    value={editFormData.batch}
                    onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="">-- No Batch (Unassigned) --</option>
                    {allBatchesList.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Age</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-300 mb-1">
                  Reset Password <span className="text-slate-500 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter new password if resetting"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
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
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK EXCEL UPLOAD MODAL */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 text-slate-200 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">Bulk Upload Candidates via Excel</h2>
              </div>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setUploadStatus(null);
                  setExcelFile(null);
                }}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {/* Instructions */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-amber-400">
                    <HelpCircle className="w-4 h-4" />
                    <span>Excel Column Specifications (9 Supported Fields):</span>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample Template (.xlsx)</span>
                  </button>
                </div>

                <p className="text-slate-400 text-[11px]">
                  <strong>Profile Auto-Update:</strong> If a student email already exists, their profile details
                  (Batch, Organization, Phone, Roll Number, Gender, Age) will be updated automatically and linked to your account.
                </p>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">Full Name</span> (Req)
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-emerald-400 font-bold">Email</span> (Req, Unique)
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-300">Password</span> (Opt)
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-sky-300 font-bold">Organization</span> (Opt)
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-indigo-300 font-bold">Batch</span> (Opt)
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-300 font-bold">Roll Number</span> (Opt)
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-300 font-bold">Phone</span> (Opt)
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-300">Gender</span> (Opt)
                  </div>
                  <div className="bg-slate-900 p-2 rounded border border-slate-800">
                    <span className="text-slate-300">Age</span> (Opt)
                  </div>
                </div>
              </div>

              <form onSubmit={handleExcelUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-xl p-6 text-center transition-colors">
                  <FileSpreadsheet className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={(e) => setExcelFile(e.target.files[0])}
                    className="block mx-auto text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                  />
                  {excelFile && (
                    <p className="text-xs text-slate-300 mt-2 font-medium">
                      Selected file: <span className="text-emerald-400">{excelFile.name}</span> ({(excelFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExcelModal(false);
                      setUploadStatus(null);
                      setExcelFile(null);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !excelFile}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20"
                  >
                    {isUploading ? 'Importing...' : 'Upload & Import Candidates'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
