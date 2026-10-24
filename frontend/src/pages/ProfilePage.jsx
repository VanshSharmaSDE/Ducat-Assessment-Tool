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
  Copy,
  Check,
  Eye,
  EyeOff,
  Shield,
  Clock,
  Sparkles,
  Award,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { showConfirm } = useModal();

  const fileInputRef = useRef(null);
  const [pictureLoading, setPictureLoading] = useState(false);
  const [pictureSuccess, setPictureSuccess] = useState('');
  const [pictureError, setPictureError] = useState('');

  const [copiedId, setCopiedId] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  const handleCopyId = () => {
    if (primaryId && primaryId !== 'Not Assigned') {
      navigator.clipboard.writeText(primaryId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

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
      setTimeout(() => setProfileSuccess(''), 4000);
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
      setPasswordError('New password must be at least 6 characters long');
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
      setTimeout(() => setPasswordSuccess(''), 4000);
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleBadgeStyle = isAdmin
    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800'
    : isFaculty
    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
    : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800';

  const roleTitle = isAdmin ? 'System Administrator' : isFaculty ? 'Faculty Instructor' : 'Student Candidate';

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Account Profile & Security
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your personal credentials, view institutional affiliations, and update account security preferences.
          </p>
        </div>
      </div>

      {/* Main 12-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (4 cols on lg): Identity, Avatar, Credentials, Account Health */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* 1. Identity & Avatar Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex flex-col items-center text-center">
              {/* Avatar Container with Camera Badge */}
              <div className="relative group mb-4">
                <div className="w-28 h-28 rounded-full overflow-hidden bg-gradient-to-tr from-[#4f6bf7] to-[#6073ea] text-white flex items-center justify-center font-black text-4xl shadow-lg border-4 border-white dark:border-slate-800 ring-4 ring-[#4f6bf7]/20">
                  {user?.profilePicture ? (
                    <img
                      src={getProfilePictureUrl(user.profilePicture)}
                      alt={user?.name || 'Profile'}
                      className="w-full h-full object-cover"
                      onError={(e) => handleAvatarError(e, user?.profilePicture)}
                    />
                  ) : (
                    <span>{user?.name?.charAt(0).toUpperCase() || 'U'}</span>
                  )}
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
                  className="absolute bottom-0.5 right-0.5 p-2 rounded-full bg-[#4f6bf7] hover:bg-blue-600 text-white shadow-md border-2 border-white dark:border-slate-800 transition-all hover:scale-110 cursor-pointer disabled:opacity-50"
                >
                  {pictureLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* User Name & Meta */}
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{user?.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {user?.email || primaryId}
              </p>
              <div className="mt-2.5">
                <span className={`inline-block text-[11px] font-extrabold uppercase px-3 py-0.5 rounded-full border ${roleBadgeStyle}`}>
                  {roleTitle}
                </span>
              </div>
            </div>

            {/* Photo Action Buttons */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={pictureLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-[#4f6bf7] hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm shadow-[#4f6bf7]/20 cursor-pointer"
                >
                  {pictureLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Processing...</span>
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
                    title="Remove custom photo"
                    className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 border border-slate-200 dark:border-slate-700 hover:border-rose-200 dark:border-rose-800 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                Accepted: JPG, PNG, WEBP • Max 5MB
              </p>

              {/* Status alerts */}
              {pictureSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{pictureSuccess}</span>
                </div>
              )}
              {pictureError && (
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pictureError}</span>
                </div>
              )}
            </div>
          </div>

          {/* 2. Institutional Credentials Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#4f6bf7]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Institutional Affiliation
                </h3>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                Verified
              </span>
            </div>

            <div className="space-y-3">
              {/* Organization */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-500" /> Organization
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={user?.organization || 'SkillCodex Platform'}>
                  {user?.organization || 'SkillCodex Platform'}
                </p>
              </div>

              {/* Specialization / Technology */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-indigo-500" /> Technology / Track
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={user?.technology || (isAdmin ? 'All Tracks (System Master)' : 'General')}>
                  {user?.technology || (isAdmin ? 'All Tracks (System Master)' : 'General')}
                </p>
              </div>

              {/* Batch */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                  <GraduationCap className="w-3.5 h-3.5 text-purple-500" /> Assigned Batch
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate" title={user?.batch || 'General Batch'}>
                  {user?.batch || 'General Batch'}
                </p>
              </div>

              {/* Official Identifier with Copy */}
              <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-slate-800 dark:to-slate-800/70 border border-blue-100 dark:border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-[#4f6bf7]" /> {idLabel}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-[#4f6bf7] hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                  >
                    {copiedId ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-600">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy ID</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs font-extrabold font-mono text-[#4f6bf7] dark:text-blue-400 truncate select-all" title={primaryId}>
                  {primaryId}
                </p>
              </div>
            </div>
          </div>

          {/* 3. Account Security Health Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              <Shield className="w-4 h-4 text-[#4f6bf7]" />
              <span>Account Status & Security</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Account Health</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active & Enrolled
                </span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Session Timeout</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> 120 mins inactivity
                </span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Security Clearance</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {isAdmin ? 'Full Master Admin' : isFaculty ? 'Faculty Instructor' : 'Candidate Exam Access'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols on lg): Personal Details Form + Security & Password Form */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* Card 1: Personal & Academic Information */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <User className="w-5 h-5 text-[#4f6bf7]" />
                Personal & Academic Information
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Review and update your core identity credentials and contact information.
              </p>
            </div>

            {profileSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {/* Full Name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                    />
                  </div>
                </div>

                {/* Primary ID (Read-only reference display) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>{idLabel}</span>
                    <span className="text-[10px] text-slate-400 font-normal">Official Identifier</span>
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={primaryId}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-mono font-bold text-slate-600 dark:text-slate-400 cursor-not-allowed select-all"
                    />
                  </div>
                </div>

                {/* Batch Scope / Reference */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Assigned Batch</span>
                    {!isAdmin && <span className="text-[10px] text-slate-400 font-normal">Assigned</span>}
                  </label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      disabled={!isAdmin}
                      readOnly={!isAdmin}
                      value={profileForm.batch}
                      onChange={(e) => setProfileForm({ ...profileForm, batch: e.target.value })}
                      placeholder="Batch name"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        !isAdmin
                          ? 'bg-slate-100 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 cursor-not-allowed'
                          : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7]'
                      }`}
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Email Address</span>
                    {isStudent && <span className="text-[10px] text-slate-400 font-normal">Institutional Lock</span>}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      disabled={isStudent}
                      readOnly={isStudent}
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      placeholder="name@example.com"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isStudent
                          ? 'bg-slate-100 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 cursor-not-allowed select-all'
                          : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7]'
                      }`}
                    />
                  </div>
                  {isStudent && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Managed by your institution; cannot be self-modified.
                    </p>
                  )}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Phone Number</span>
                    {isStudent && <span className="text-[10px] text-slate-400 font-normal">Institutional Lock</span>}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      disabled={isStudent}
                      readOnly={isStudent}
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                        isStudent
                          ? 'bg-slate-100 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 text-slate-600 dark:text-slate-400 cursor-not-allowed select-all'
                          : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7]'
                      }`}
                    />
                  </div>
                  {isStudent && (
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                      Managed by your institution; cannot be self-modified.
                    </p>
                  )}
                </div>

                {/* Student specific: Gender & Age */}
                {isStudent && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Gender
                      </label>
                      <select
                        value={profileForm.gender}
                        onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Age
                      </label>
                      <div className="relative">
                        <Calendar className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                        <input
                          type="number"
                          min="10"
                          max="100"
                          value={profileForm.age}
                          onChange={(e) => setProfileForm({ ...profileForm, age: e.target.value })}
                          placeholder="e.g. 21"
                          className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Faculty Specific: Teaching Track & Organization Scope */}
                {isFaculty && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Instructional Track / Specialization
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={user?.technology || 'Computer Science / Engineering Track'}
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Department / Institutional Entity
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={user?.organization || 'Technical Faculty Member'}
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </>
                )}

                {/* Admin Specific: Global Platform Scope & Authority */}
                {isAdmin && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Platform Management Clearance
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value="Root System Super Administrator (Unrestricted)"
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Institutional Governance Level
                      </label>
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={user?.organization || 'Platform Global Master Administration'}
                        className="w-full px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-6 bg-[#4f6bf7] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-[#4f6bf7]/20 transition-all cursor-pointer"
                >
                  {profileLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Details</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Security & Password Management */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#4f6bf7]" />
                Security & Password Management
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Ensure your account is protected by updating your secret password regularly.
              </p>
            </div>

            {passwordSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            {passwordError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Current Password <span className="text-rose-500 font-bold">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter current password"
                    className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* New Password & Confirm Password Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    New Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Min. 6 characters"
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                    Confirm New Password <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white dark:focus:bg-slate-800 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 flex flex-wrap items-center gap-4 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      passwordForm.newPassword.length >= 6
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={
                      passwordForm.newPassword.length >= 6
                        ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    At least 6 characters
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                      passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword
                        ? 'bg-emerald-500 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                    }`}
                  >
                    ✓
                  </span>
                  <span
                    className={
                      passwordForm.confirmPassword && passwordForm.newPassword === passwordForm.confirmPassword
                        ? 'text-emerald-700 dark:text-emerald-400 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    Passwords match
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="inline-flex items-center justify-center gap-2 py-2.5 px-6 bg-slate-800 hover:bg-slate-700 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 disabled:opacity-50 font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {passwordLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
