import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
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
  Layers
} from 'lucide-react';

export default function AdminUsersPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

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
  const [actionLoading, setActionLoading] = useState(false);

  // Modals state
  const [showManualModal, setShowManualModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
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
    rollNumber: '',
    phone: '',
    batch: '',
    gender: '',
    age: '',
  });

  const loadUsers = async () => {
    try {
      let query = `?page=${page}&limit=15`;
      if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (batchFilter) query += `&batch=${encodeURIComponent(batchFilter)}`;
      if (genderFilter) query += `&gender=${encodeURIComponent(genderFilter)}`;

      const res = await api.get(`/admin/users${query}`);
      setUsers(res.data.data.users || []);
      setPagination(res.data.data.pagination || { total: 0, pages: 1 });
      if (res.data.data.availableBatches) {
        setAvailableBatches(res.data.data.availableBatches);
      }
      if (res.data.data.availableGenders) {
        setAvailableGenders(res.data.data.availableGenders);
      }
    } catch (err) {
      console.error('Failed to load users', err);
    } finally {
      setLoading(false);
    }
  };

  const loadBatches = async () => {
    try {
      const res = await api.get('/admin/batches');
      setDefinedBatches(res.data.data.batches || []);
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  };

  useEffect(() => {
    loadBatches();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [page, searchTerm, statusFilter, batchFilter, genderFilter]);

  const handleToggleStatus = async (user) => {
    if (!window.confirm(`Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} ${user.name}?`)) return;
    try {
      setActionLoading(true);
      await api.put(`/admin/users/${user._id}/toggle-status`);
      await loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you sure you want to delete student "${user.name}"? This action will permanently remove their account, exam attempts, and submitted solutions.`)) return;
    try {
      setActionLoading(true);
      await api.delete(`/admin/users/${user._id}`);
      alert('Student deleted successfully!');
      await loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete student');
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
      alert('Student updated successfully!');
      setShowEditModal(false);
      await loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update student');
    } finally {
      setActionLoading(false);
    }
  };

  // Manual Student Creation
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/students/create', formData);
      alert('Student created successfully!');
      setShowManualModal(false);
      setFormData({ name: '', email: '', password: '', rollNumber: '', phone: '', batch: '', gender: '' });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create student');
    }
  };

  // Download Sample Excel Template
  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        'Full Name': 'Amit Verma',
        'Email': 'amit.verma@example.com',
        'Password': 'Password@123',
        'Roll Number': 'CS2026-001',
        'Phone': '9876543210',
        'Batch': 'Batch-2026-A',
        'Gender': 'Male'
      },
      {
        'Full Name': 'Sneha Rao',
        'Email': 'sneha.rao@example.com',
        'Password': 'Password@123',
        'Roll Number': 'CS2026-002',
        'Phone': '9876543211',
        'Batch': 'Batch-2026-A',
        'Gender': 'Female'
      }
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
      alert('Please select an Excel file first');
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
      setUploadStatus(res.data);
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process Excel upload');
    } finally {
      setIsUploading(false);
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
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            {isAdmin ? 'Candidate Management' : 'My Candidates'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin 
              ? 'Manage enrolled candidates across all batches with faculty attribution' 
              : 'Manage your students, enroll them in your batches, or import via Excel'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Add Student Manually
          </button>
          <button
            onClick={() => setShowExcelModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload (Excel)
          </button>
        </div>
      </div>

      {/* Search and Filters */}
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
            placeholder="Search by name or email..."
            className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

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
          {Array.from(new Set([...definedBatches.map(b => b.name), ...availableBatches])).filter(Boolean).map((b) => (
            <option key={b} value={b}>{b}</option>
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
      </div>

      {/* Manual Student Creation Modal */}
      {showManualModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 text-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Add Student Manually
              </h2>
              <button
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleManualSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={formData.rollNumber}
                    onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                    placeholder="e.g. CS2026-001"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Batch / Cohort</label>
                  {definedBatches.length > 0 ? (
                    <select
                      value={formData.batch}
                      onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Batch (or unassigned)</option>
                      {definedBatches.map((b) => (
                        <option key={b._id} value={b.name}>
                          {b.name} {b.department ? `(${b.department})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.batch}
                      onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                      placeholder="e.g. Batch-2026-A"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Gender</option>
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
                    placeholder="e.g. 21"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold"
                >
                  Create Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Edit className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Edit Student Details</h3>
                <p className="text-xs text-slate-400">Update academic records or credentials for {editingUser.name}</p>
              </div>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-300 mb-1">Reset Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Leave blank to keep existing password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={editFormData.rollNumber}
                    onChange={(e) => setEditFormData({ ...editFormData, rollNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Phone</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Batch / Cohort</label>
                  {definedBatches.length > 0 ? (
                    <select
                      value={editFormData.batch}
                      onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">Select Batch (or unassigned)</option>
                      {definedBatches.map((b) => (
                        <option key={b._id} value={b.name}>
                          {b.name} {b.department ? `(${b.department})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={editFormData.batch}
                      onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Gender</label>
                  <select
                    value={editFormData.gender}
                    onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
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
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl cursor-pointer"
                >
                  {actionLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Excel Upload Modal */}
      {showExcelModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl p-6 text-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Bulk Upload Students via Excel
              </h2>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setUploadStatus(null);
                  setExcelFile(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Excel Formatting Instructions */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-4 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold text-amber-400">
                  <HelpCircle className="w-4 h-4" />
                  Excel File Requirements:
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-lg text-xs font-semibold transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Sample Template (.xlsx)
                </button>
              </div>
              <p className="text-slate-400">
                The Excel sheet must have column headers in the first row. The following columns are supported:
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-emerald-400 font-bold">Full Name</span> (Required)
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-emerald-400 font-bold">Email</span> (Required, Unique)
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-300 font-bold">Password</span> (Optional, defaults to Student@123)
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-300 font-bold">Roll Number</span> (Optional)
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

              {uploadStatus && (
                <div
                  className={`p-4 rounded-xl text-xs ${
                    uploadStatus.failedCount > 0
                      ? 'bg-amber-950/40 border border-amber-800 text-amber-200'
                      : 'bg-emerald-950/40 border border-emerald-800 text-emerald-200'
                  }`}
                >
                  <p className="font-bold">{uploadStatus.message}</p>
                  {uploadStatus.errors?.length > 0 && (
                    <ul className="list-disc list-inside mt-2 text-rose-300 space-y-1 max-h-28 overflow-y-auto">
                      {uploadStatus.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

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
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !excelFile}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold flex items-center gap-2"
                >
                  {isUploading ? 'Processing...' : 'Upload & Import Students'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <Users className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No users found</h3>
          <p className="text-xs text-slate-400 mt-1">Try modifying your search criteria or add new students.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Candidate</th>
                  <th className="py-3.5 px-4 font-semibold">Email</th>
                  {isAdmin && <th className="py-3.5 px-4 font-semibold">Created By (Faculty)</th>}
                  <th className="py-3.5 px-4 font-semibold">Roll Number</th>
                  <th className="py-3.5 px-4 font-semibold">Batch</th>
                  <th className="py-3.5 px-4 font-semibold">Gender</th>
                  <th className="py-3.5 px-4 font-semibold">Age</th>
                  <th className="py-3.5 px-4 font-semibold">Role</th>
                  <th className="py-3.5 px-4 font-semibold">Exams Attempted</th>
                  <th className="py-3.5 px-4 font-semibold">Average Score</th>
                  <th className="py-3.5 px-4 font-semibold">Joined Date</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((u) => (
                  <tr key={u._id} className="text-slate-300 hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center shrink-0">
                        {u.name?.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{u.email}</td>

                    {isAdmin && (
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] ${
                            u.createdBy?.role === 'FACULTY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {u.createdBy?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{u.createdBy?.name || 'Administrator / Direct'}</p>
                            <span className={`inline-block text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                              u.createdBy?.role === 'FACULTY' 
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}>
                              {u.createdBy?.role || 'ADMIN'}
                            </span>
                          </div>
                        </div>
                      </td>
                    )}

                    <td className="py-3.5 px-4 font-mono text-slate-300">{u.rollNumber || '-'}</td>
                    <td className="py-3.5 px-4 font-medium text-indigo-300">{u.batch || '-'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{u.gender || '-'}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">{u.age || '-'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{u.examsAttempted || 0} Exams</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{u.averageScore || 0}%</td>
                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4">
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
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                          title="Edit Student"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={actionLoading}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
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
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Showing Page {page} of {pagination.pages}</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700"
                >
                  Previous
                </button>
                <button
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 bg-slate-800 rounded-lg disabled:opacity-30 hover:bg-slate-700"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
