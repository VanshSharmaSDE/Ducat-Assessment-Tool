import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
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
  GraduationCap
} from 'lucide-react';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();

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

      {/* Institutional Affiliation & Credentials Card (Prominently displayed) */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50 dark:from-slate-900/95 dark:via-slate-800/80 dark:to-slate-900/95 border border-blue-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3.5">
          <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">Institutional Affiliation & Credentials</h2>
          <span className="ml-auto text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-blue-100/70 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/60">
            Read-Only Verification
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
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
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate" title={user?.technology || user?.batch || 'General'}>
              {user?.technology || user?.batch || (isAdmin ? 'All Technologies' : 'General')}
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Assigned cohort or specialization</p>
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
