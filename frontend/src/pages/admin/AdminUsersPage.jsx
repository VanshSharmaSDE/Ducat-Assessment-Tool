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
  Eye,
  EyeOff,
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
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
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
    studentId: '',
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
    studentId: '',
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
      const res = await api.delete(`/admin/users/${user._id}`);
      setSelectedUsers((prev) => prev.filter((id) => id !== user._id));
      await showAlert({
        title: 'Candidate Removed',
        message: res.data?.message || 'Candidate removed successfully!',
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
      message: `Are you sure you want to permanently delete or unlink ${selectedUsers.length} selected candidate(s)? This will remove their accounts or unlink them from your dashboard.`,
      confirmText: `Delete (${selectedUsers.length}) Candidates`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/users/bulk-delete', {
        ids: selectedUsers,
        userIds: selectedUsers,
        studentIds: selectedUsers,
      });
      await showAlert({
        title: 'Candidates Removed',
        message: res.data?.message || `Successfully removed ${selectedUsers.length} candidate(s).`,
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
      studentId: user.studentId || user.rollNumber || '',
      email: user.email || '',
      password: '',
      organization: user.organization || '',
      rollNumber: user.rollNumber || user.studentId || '',
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
      await api.put(`/admin/students/${editingUser._id}`, {
        ...editFormData,
        studentId: editFormData.studentId || editFormData.rollNumber,
      });
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
    if (user?.role === 'FACULTY' && (!user.organization || !user.organization.trim())) {
      showAlert({
        title: 'Organization Required',
        message: 'You must be assigned to an organization by an administrator before adding candidates.',
        type: 'warning',
      });
      return;
    }
    const defaultOrg = user?.role === 'FACULTY'
      ? (user.organization || '')
      : ((selectedOrg && selectedOrg !== '__ALL__' && selectedOrg !== 'unassigned')
          ? selectedOrg
          : '');
    setFormData({
      name: '',
      studentId: '',
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
      await api.post('/admin/students/create', {
        ...formData,
        studentId: formData.studentId || formData.rollNumber,
      });
      await showAlert({
        title: 'Student Created',
        message: 'Student created successfully!',
        type: 'success',
      });
      setShowManualModal(false);
      setFormData({
        name: '',
        studentId: '',
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
        'Student ID': 'STU2026001',
        'Full Name': 'Amit Verma',
        'Password': 'Password@123',
        'Email': 'amit.verma@example.com',
        'Organization': 'Tech University',
        'Batch': 'Batch-2026-A',
        'Phone': '9876543210',
        'Gender': 'Male',
        'Age': 21,
      },
      {
        'Student ID': 'STU2026002',
        'Full Name': 'Sneha Rao',
        'Password': 'Password@123',
        'Email': '', // Optional
        'Organization': 'Tech University',
        'Batch': 'Batch-2026-A',
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
    if (user?.role === 'FACULTY' && (!user.organization || !user.organization.trim())) {
      showAlert({
        title: 'Organization Required',
        message: 'You are not assigned to an organization by an administrator, so you cannot share candidates.',
        type: 'warning',
      });
      return;
    }
    const defaultOrg = user?.role === 'FACULTY'
      ? (user.organization || '')
      : ((selectedOrg && selectedOrg !== '__ALL__' && selectedOrg !== 'unassigned')
          ? selectedOrg
          : (allOrganizationsList[0] || ''));
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
                className="p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Back to Organizations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              {isViewingOrgDirectory
                ? 'Candidate Organizations'
                : getSelectedOrgDisplayName()}
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
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
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedUsers.length})</span>
            </button>
          )}

          <button
            onClick={handleOpenShare}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Share students of an organization/batch with another faculty member"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Students</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            title="Import/link shared students using a faculty link or token"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>Import Shared</span>
          </button>

          <button
            onClick={handleOpenManualModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>

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
        </div>
      </div>

      {/* ADMIN DIRECTORY VIEW: Show Organization Cards */}
      {isViewingOrgDirectory ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span>Institutions & Organizations ({organizationsSummary.length})</span>
            </h2>
            <button
              onClick={() => handleSelectOrg('__ALL__')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
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
                className="group p-5 bg-white border border-slate-200 hover:border-blue-400 rounded-2xl cursor-pointer transition-all hover:shadow-md flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors line-clamp-1">
                          {org.name}
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {org.activeCount} active / {org.studentCount} enrolled
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                      {org.studentCount} Students
                    </span>
                  </div>

                  {org.batches && org.batches.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-wider">
                        Active Batches ({org.batches.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {org.batches.slice(0, 3).map((b) => (
                          <span
                            key={b}
                            className="px-2 py-0.5 rounded bg-slate-50 text-blue-700 text-[10px] font-mono border border-slate-200"
                          >
                            {b}
                          </span>
                        ))}
                        {org.batches.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 text-[10px] font-mono">
                            +{org.batches.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-slate-800 pt-2 border-t border-slate-100">
                  <span>Inspect Cohort</span>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}

            {/* Quick Card: View All */}
            <div
              onClick={() => handleSelectOrg('__ALL__')}
              className="p-5 bg-slate-50 border border-dashed border-slate-200 hover:border-slate-300 rounded-2xl cursor-pointer transition-all flex flex-col justify-center items-center text-center space-y-2 group"
            >
              <Users className="w-8 h-8 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <div>
                <p className="text-xs font-bold text-slate-700 group-hover:text-slate-900">View All Candidates</p>
                <p className="text-[11px] text-slate-500">Unfiltered flat table of all candidate accounts</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CANDIDATE TABLE VIEW */
        <div className="space-y-4">
          {/* Organization Breadcrumb & Switcher */}
          <div className="flex items-center justify-between bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl text-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <button
                onClick={handleBackToOrgDirectory}
                className="hover:text-slate-900 underline cursor-pointer"
              >
                Organizations
              </button>
              <span>/</span>
              <span className="font-bold text-slate-800">{getSelectedOrgDisplayName()}</span>
            </div>
            <button
              onClick={handleBackToOrgDirectory}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              ← Back to Organizations Directory
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, email, roll number..."
                className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={selectedOrg === '__ALL__' ? '__ALL__' : selectedOrg || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleSelectOrg(val || '__ALL__');
              }}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>

            {selectedUsers.length > 0 && (
              <span className="text-xs text-slate-500 font-medium ml-auto">
                {selectedUsers.length} of {users.length} candidates selected
              </span>
            )}
          </div>

          {/* Students Table */}
          {tableLoading ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 flex flex-col items-center justify-center space-y-3 shadow-sm">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">
                Loading candidates for {getSelectedOrgDisplayName()}...
              </p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500">
              <Users className="w-12 h-12 mx-auto text-slate-400 mb-3" />
              <h3 className="text-base font-semibold text-slate-800">No candidates found</h3>
              <p className="text-xs text-slate-500 mt-1">
                Try modifying your search criteria, add new candidates, or import via Excel.
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1450px] text-left text-xs whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
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
                          className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </th>
                      <th className="py-3 px-4 font-semibold">Candidate</th>
                      <th className="py-3 px-4 font-semibold">Email</th>
                      <th className="py-3 px-4 font-semibold">Phone</th>
                      <th className="py-3 px-4 font-semibold">Organization</th>
                      {isAdmin && <th className="py-3 px-4 font-semibold">Created By</th>}
                      <th className="py-3 px-4 font-semibold">Student ID</th>
                      <th className="py-3 px-4 font-semibold">Batch</th>
                      <th className="py-3 px-4 font-semibold">Gender</th>
                      <th className="py-3 px-4 font-semibold">Age</th>
                      <th className="py-3 px-4 font-semibold">Exams Taken</th>
                      <th className="py-3 px-4 font-semibold">Avg Score</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((u) => {
                      const isSelected = selectedUsers.includes(u._id);
                      return (
                        <tr
                          key={u._id}
                          className={`text-slate-600 hover:bg-slate-50 transition-colors ${
                            isSelected ? 'bg-blue-50' : ''
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
                              className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                                {u.name?.charAt(0) || 'U'}
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold">{u.name}</span>
                                  {u.assignedFaculties?.length > 1 && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                                      Shared ({u.assignedFaculties.length})
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-400 font-normal">
                                  {u.studentId || u.rollNumber || 'No ID'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">{u.email || '—'}</td>
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{u.phone || '—'}</td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="font-semibold text-slate-700">
                              {u.organization || 'Direct / None'}
                            </span>
                          </td>

                          {isAdmin && (
                            <td className="py-3 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-700">
                                  {u.createdBy?.name || 'Admin'}
                                </span>
                                {u.createdBy?.role && (
                                  <span
                                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                                      u.createdBy.role === 'FACULTY'
                                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                    }`}
                                  >
                                    {u.createdBy.role}
                                  </span>
                                )}
                              </div>
                            </td>
                          )}

                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{u.studentId || u.rollNumber || '—'}</td>
                          <td className="py-3 px-4 font-medium text-blue-600 whitespace-nowrap">{u.batch || '—'}</td>
                          <td className="py-3 px-4 text-slate-500 whitespace-nowrap">{u.gender || '—'}</td>
                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{u.age || '—'}</td>

                          <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">{u.examsAttempted || 0}</td>
                          <td className="py-3 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                            {u.averageScore || 0}%
                          </td>

                          <td className="py-3 px-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                u.isActive
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                  : 'bg-rose-50 text-rose-600 border-rose-200'
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
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit Student"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={actionLoading}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                                  u.isActive
                                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              {u.role !== 'ADMIN' && (
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  disabled={actionLoading}
                                  className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
                <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    Showing Page {page} of {pagination.pages} ({pagination.total} total)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-30 cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= pagination.pages}
                      onClick={() => setPage(page + 1)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg disabled:opacity-30 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" />
                <span>Share Candidates with Faculty</span>
              </h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-slate-500 space-y-3">
              <p>
                Generate a secure share token or link. Any faculty member with this link can import
                these students into their candidate pool without re-uploading spreadsheets.
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Target Organization *
                </label>
                {user?.role === 'FACULTY' ? (
                  <div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-blue-600 font-medium">
                    {user?.organization || 'Unassigned'}
                  </div>
                ) : (
                  <select
                    required
                    value={shareOrg}
                    onChange={(e) => setShareOrg(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Select Organization to Share --</option>
                    {allOrganizationsList.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Filter by Batches (Optional, leave blank to share all batches)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
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
                              ? 'bg-blue-600 text-white'
                              : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900'
                          }`}
                        >
                          {batch}
                        </button>
                      );
                    })}
                </div>
              </div>

              {!shareTokenResult ? (
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerateShareToken}
                    disabled={actionLoading || !shareOrg}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
                  >
                    {actionLoading ? 'Generating...' : 'Generate Share Link'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>
                      Found <strong>{shareTokenResult.studentCount}</strong> student(s) ready for
                      sharing!
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Shareable Import Link
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareTokenResult.shareLink}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(shareTokenResult.shareLink);
                          setCopiedLink(true);
                          setTimeout(() => setCopiedLink(false), 2000);
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">
                      Or Direct Token
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={shareTokenResult.shareToken}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-[11px]"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(shareTokenResult.shareToken);
                          setCopiedToken(true);
                          setTimeout(() => setCopiedToken(false), 2000);
                        }}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1"
                      >
                        {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedToken ? 'Copied!' : 'Copy Token'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowShareModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <DownloadCloud className="w-5 h-5 text-blue-600" />
                <span>Import Shared Candidates</span>
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500">
                Paste the student share link or token received from another faculty member to link
                their students to your teaching roster.
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Share Link or Token *
                </label>
                <textarea
                  rows="3"
                  value={importTokenInput}
                  onChange={(e) => setImportTokenInput(e.target.value)}
                  placeholder="Paste URL (https://.../admin/users?importToken=...) or raw JWT token here"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImportSharedStudents}
                  disabled={importLoading || !importTokenInput.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all cursor-pointer"
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md p-6 text-slate-700">
            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Add Student Manually</span>
              </h2>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Student ID *</label>
                <input
                  type="text"
                  required
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value, rollNumber: e.target.value })}
                  placeholder="e.g. STU2026001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-10 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <label className="block font-medium text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. rahul@example.com (optional)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Organization / Institution</label>
                {user?.role === 'FACULTY' ? (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-blue-600 font-medium">
                    {user?.organization || 'Unassigned'}
                  </div>
                ) : (
                  <select
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- No Organization (Unassigned) --</option>
                    {allOrganizationsList.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Roll Number (Optional)</label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g. CS2026-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Batch</label>
                  <select
                    value={formData.batch}
                    onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                  <label className="block font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    placeholder="21"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-800">Edit Candidate Details</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Student ID *</label>
                <input
                  type="text"
                  required
                  value={editFormData.studentId || editFormData.rollNumber || ''}
                  onChange={(e) => setEditFormData({ ...editFormData, studentId: e.target.value, rollNumber: e.target.value })}
                  placeholder="e.g. STU2026001"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Email Address (Optional)</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  placeholder="e.g. student@example.com (optional)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Organization / Institution</label>
                {user?.role === 'FACULTY' ? (
                  <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-blue-600 font-medium">
                    {editFormData.organization || user?.organization || 'Unassigned'}
                  </div>
                ) : (
                  <select
                    value={editFormData.organization}
                    onChange={(e) => setEditFormData({ ...editFormData, organization: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- No Organization (Unassigned) --</option>
                    {allOrganizationsList.map((org) => (
                      <option key={org} value={org}>
                        {org}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Roll Number (Optional)</label>
                  <input
                    type="text"
                    value={editFormData.rollNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                    placeholder="e.g. CS2026-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Batch</label>
                  <select
                    value={editFormData.batch}
                    onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                  <label className="block font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={editFormData.age}
                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-200 mb-1">
                  Reset Password <span className="text-slate-400 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    placeholder="Enter new password if resetting"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pr-10 text-slate-700 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Bulk Upload Candidates via Excel</h3>
                  <p className="text-xs text-slate-500">Upload multiple student records with profile details via spreadsheet</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setUploadStatus(null);
                  setExcelFile(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
              {/* Instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-700">
                    <HelpCircle className="w-4 h-4 text-blue-600" />
                    <span>Excel Column Specifications (9 Supported Fields):</span>
                  </div>
                  <button
                    type="button"
                    onClick={downloadSampleTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample Template (.xlsx)</span>
                  </button>
                </div>

                <p className="text-slate-500 text-[11px]">
                  <strong>Profile Auto-Update:</strong> Student ID is the primary unique identifier. If a Student ID already exists, their profile details
                  (Full Name, Batch, Organization, Phone, Gender, Age) will be updated automatically and linked to your account. Email is optional.
                </p>

                <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-emerald-600 font-bold">Student ID</span> (Req, Unique)
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-emerald-600 font-bold">Full Name</span> (Req)
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-600">Password</span> (Opt)
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-blue-600 font-bold">Email</span> (Optional)
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-blue-600 font-bold">Organization</span> (Opt)
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-blue-600 font-bold">Batch</span> (Opt)
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-600 font-bold">Phone</span> (Opt)
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-600">Gender</span> (Opt)
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-600">Age</span> (Opt)
                  </div>
                </div>
              </div>

              <form onSubmit={handleExcelUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl p-6 text-center space-y-3 transition-colors bg-slate-50">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <label className="text-xs font-semibold text-emerald-600 cursor-pointer hover:underline">
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
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-medium">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowExcelModal(false);
                      setUploadStatus(null);
                      setExcelFile(null);
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUploading || !excelFile}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importing Candidates...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload & Import Candidates</span>
                      </>
                    )}
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
