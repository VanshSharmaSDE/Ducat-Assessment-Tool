import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';
import api from '../api/axios';
import { getProfilePictureUrl, handleAvatarError } from '../utils/imageUrl';
import {
  User,
  Mail,
  Phone,
  Lock,
  CheckCircle2,
  AlertCircle,
  Save,
  ShieldCheck,
  Calendar,
  Users,
  Hash,
  Building2,
  GraduationCap,
  Camera,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showConfirm } = useModal();

  const fileInputRef = useRef(null);
  const [pictureLoading, setPictureLoading] = useState(false);
  const [pictureSuccess, setPictureSuccess] = useState('');
  const [pictureError, setPictureError] = useState('');

  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    batch: user?.batch || '',
    gender: user?.gender || '',
    age: user?.age !== undefined && user?.age !== null ? user.age : '',
    rollNumber: user?.rollNumber || '',
  });

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        batch: user.batch || '',
        gender: user.gender || '',
        age: user.age !== undefined && user.age !== null ? user.age : '',
        rollNumber: user.rollNumber || user.studentId || '',
      });
    }
  }, [user]);

  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isFaculty = user?.role === 'FACULTY';
  const isStudent = user?.role === 'USER';

  // Format primary institutional identifier
  const primaryId = isFaculty 
    ? (user?.facultyId || 'Not Assigned')
    : isStudent 
      ? (user?.studentId || user?.rollNumber || 'Not Assigned')
      : (user?.adminId || 'Administrator');

  const idLabel = isFaculty ? 'Faculty ID' : isStudent ? 'Student ID' : 'Admin ID';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so re-selecting same file fires onChange
    e.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setPictureError('Invalid file format. Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setPictureError('File is too large. Maximum allowed size is 5MB.');
      return;
    }

    try {
      setPictureLoading(true);
      setPictureError('');
      setPictureSuccess('');

      const formData = new FormData();
      formData.append('profilePicture', file);

      const res = await api.post('/users/profile/picture', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.data?.user) {
        updateUser(res.data.data.user);
      }
      setPictureSuccess('Profile picture updated successfully');
      setTimeout(() => setPictureSuccess(''), 4000);
    } catch (err) {
      setPictureError(err.response?.data?.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setPictureLoading(false);
    }
  };

  const handleDeletePicture = async () => {
    if (!user?.profilePicture) return;

    const confirmed = await showConfirm({
      title: 'Remove Profile Picture',
      message: 'Are you sure you want to remove your profile picture? Your initials will be displayed instead.',
      confirmText: 'Remove Photo',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setPictureLoading(true);
      setPictureError('');
      setPictureSuccess('');

      const res = await api.delete('/users/profile/picture');

      if (res.data?.data?.user) {
        updateUser(res.data.data.user);
      }
      setPictureSuccess('Profile picture removed successfully');
      setTimeout(() => setPictureSuccess(''), 4000);
    } catch (err) {
      setPictureError(err.response?.data?.message || 'Failed to remove profile picture. Please try again.');
    } finally {
      setPictureLoading(false);
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');
    setProfileLoading(true);

    try {
      const payload = {
        name: profileForm.name,
        gender: profileForm.gender,
        age: profileForm.age === '' ? null : Number(profileForm.age),
      };

      if (!isStudent) {
        payload.email = profileForm.email;
        payload.phone = profileForm.phone;
      }

      // Only administrators can edit batch and rollNumber directly
      if (isAdmin) {
        payload.batch = profileForm.batch;
        payload.technology = profileForm.batch;
        payload.rollNumber = profileForm.rollNumber;
      }

      const res = await api.put('/users/profile', payload);
      updateUser(res.data.data.user);
      setProfileSuccess('Profile details updated successfully');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.put('/users/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordSuccess(res.data.message || 'Password changed successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Account Profile & Settings</h1>
          {isAdmin ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Administrator
            </span>
          ) : isFaculty ? (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> Faculty Member
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
              <User className="w-3.5 h-3.5" /> Student
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your identity credentials, view institutional affiliations, and update security passwords</p>
      </div>

      {/* Profile Picture Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar Container with Camera Badge */}
          <div className="relative group shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gradient-to-tr from-[#4f6bf7] to-[#6073ea] text-white flex items-center justify-center font-black text-3xl sm:text-4xl shadow-md border-4 border-white dark:border-slate-800 ring-2 ring-blue-500/20">
              {user?.profilePicture && (
                <img
                  src={getProfilePictureUrl(user.profilePicture)}
                  alt={user?.name || 'Profile'}
                  className="w-full h-full object-cover"
                  onError={(e) => handleAvatarError(e, user?.profilePicture)}
                />
              )}
              <span className={user?.profilePicture ? 'hidden' : ''}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
            />

            {/* Quick-action Camera Badge */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pictureLoading}
              title="Upload / Change Photo"
              className="absolute bottom-0 right-0 p-2 rounded-full bg-[#4f6bf7] hover:bg-blue-600 text-white shadow-md border-2 border-white dark:border-slate-800 transition-all hover:scale-105 cursor-pointer disabled:opacity-50"
            >
              {pictureLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* User Info & Upload Actions */}
          <div className="flex-1 text-center sm:text-left space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.name}</h2>
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      : isFaculty
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                      : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                  }`}
                >
                  {isAdmin ? 'Administrator' : isFaculty ? 'Faculty' : 'Student'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {user?.email || primaryId} • {user?.organization || 'SkillCodex Platform'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={pictureLoading}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#4f6bf7] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm shadow-[#4f6bf7]/20 cursor-pointer"
              >
                {pictureLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>{user?.profilePicture ? 'Change Photo' : 'Upload Photo'}</span>
                  </>
                )}
              </button>

              {user?.profilePicture && (
                <button
                  type="button"
                  onClick={handleDeletePicture}
                  disabled={pictureLoading}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:border-rose-800 text-xs font-semibold transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Photo</span>
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              Supported formats: JPG, PNG, or WEBP (Max 5MB). Photo is saved securely directly on the server.
            </p>

            {/* Status alerts */}
            {pictureSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{pictureSuccess}</span>
              </div>
            )}
            {pictureError && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pictureError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Institutional Affiliation & Credentials Card (Prominently displayed) */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-slate-900/95 dark:via-slate-800/80 dark:to-slate-900/95 border border-blue-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3.5">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Institutional Affiliation & Credentials</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100/70 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/60">
            Read-Only Verification
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Organization */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              Organization
            </span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={user?.organization || 'Independent / Unassigned'}>
              {user?.organization || 'Independent / Unassigned'}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Assigned institutional entity</p>
          </div>

          {/* Technology / Track */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              Technology
            </span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={user?.technology || (isAdmin ? 'All Technologies' : 'General')}>
              {user?.technology || (isAdmin ? 'All Technologies' : 'General')}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Assigned specialization track</p>
          </div>

          {/* Batch */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              Batch
            </span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={user?.batch || 'General'}>
              {user?.batch || 'General'}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Assigned cohort batch</p>
          </div>

          {/* Primary ID */}
          <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-slate-200/80 dark:border-slate-700/60 rounded-xl p-3 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mb-1 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
              {idLabel}
            </span>
            <div className="text-sm font-bold font-mono text-blue-700 dark:text-blue-400 truncate" title={primaryId}>
              {primaryId}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Official login & exam credential</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details Form */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            Personal & Academic Information
          </h2>

          {profileSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{profileSuccess}</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Email Address</span>
                {isStudent && <span className="text-[10px] text-slate-400 font-normal">Read-Only</span>}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  disabled={isStudent}
                  readOnly={isStudent}
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="name@example.com (optional)"
                  className={`w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 transition-colors ${
                    isStudent
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-all'
                      : 'bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white'
                  }`}
                />
              </div>
              {isStudent && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Email is managed by your administrator and cannot be modified.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Phone Number</span>
                {isStudent && <span className="text-[10px] font-normal text-slate-400 font-normal">Read-Only</span>}
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  disabled={isStudent}
                  readOnly={isStudent}
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+1-555-0100"
                  className={`w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 transition-colors ${
                    isStudent
                      ? 'bg-slate-100 text-slate-500 cursor-not-allowed select-all'
                      : 'bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white'
                  }`}
                />
              </div>
              {isStudent && (
                <p className="text-[10px] text-slate-400 mt-1">
                  Phone number is managed by your administrator and cannot be modified.
                </p>
              )}
            </div>

            {/* Read-Only Institutional Fields for Students & Faculty */}
            {!isAdmin ? (
              // <div className="grid grid-cols-2 gap-3 pt-1">
              //   <div>
              //     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              //       <span>{idLabel}</span>
              //       <span className="text-[9px] text-slate-400 font-normal">View-only</span>
              //     </label>
              //     <div className="relative">
              //       <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              //       <input
              //         type="text"
              //         readOnly
              //         disabled
              //         value={primaryId}
              //         className="w-full pl-10 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-600 cursor-not-allowed select-all"
              //       />
              //     </div>
              //   </div>

              //   <div>
              //     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              //       <span>Batch</span>
              //       <span className="text-[9px] text-slate-400 font-normal">View-only</span>
              //     </label>
              //     <div className="relative">
              //       <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              //       <input
              //         type="text"
              //         readOnly
              //         disabled
              //         value={user?.batch || 'General'}
              //         className="w-full pl-10 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 cursor-not-allowed"
              //       />
              //     </div>
              //   </div>

              //   <div className="col-span-2">
              //     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              //       <span>Assigned Organization</span>
              //       <span className="text-[9px] text-slate-400 font-normal">View-only</span>
              //     </label>
              //     <div className="relative">
              //       <Building2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              //       <input
              //         type="text"
              //         readOnly
              //         disabled
              //         value={user?.organization || 'Independent / Unassigned'}
              //         className="w-full pl-10 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 cursor-not-allowed"
              //       />
              //     </div>
              //   </div>
              // </div>
              <></>
            ) : (
              /* Admin editable Batch & ID fields */
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Admin ID
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={user?.adminId || 'SUPER_ADMIN'}
                      className="w-full pl-10 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-600 cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Batch Filter / Scope
                  </label>
                  <div className="relative">
                    <Users className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={profileForm.batch}
                      onChange={(e) => setProfileForm({ ...profileForm, batch: e.target.value })}
                      placeholder="e.g. Master"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {isStudent && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Age
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={profileForm.age}
                      onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                      placeholder="21"
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={profileLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{profileLoading ? 'Saving Changes...' : 'Save Profile Details'}</span>
            </button>
          </form>
        </div>

        {/* Change Password Form */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" />
            Security & Password Change
          </h2>

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Current Password <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="password"
                required
                value={passwordForm.currentPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                New Password (Min 6 characters) <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Confirm New Password <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={passwordLoading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
