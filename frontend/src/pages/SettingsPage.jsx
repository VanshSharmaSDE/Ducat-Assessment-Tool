import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import {
  Sun,
  Moon,
  Monitor,
  Shield,
  Clock,
  User,
  CheckCircle2,
  Sparkles,
  Laptop,
  Check,
  ChevronRight,
  Sliders,
  Building2,
  Layers,
} from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | null

  const handleSelectTheme = async (newTheme) => {
    if (newTheme === theme) return;
    setSaveStatus('saving');
    await setTheme(newTheme);
    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus(null);
    }, 2500);
  };

  const isDark = theme === 'dark';
  const roleName = user?.role === 'ADMIN' ? 'Administrator' : user?.role === 'FACULTY' ? 'Faculty Instructor' : 'Student Candidate';
  const primaryId = user?.studentId || user?.facultyId || user?.adminId || user?.rollNumber || 'N/A';
  const profileUrl = user?.role === 'ADMIN' || user?.role === 'FACULTY' ? '/admin/profile' : '/profile';

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-[#4f6bf7] uppercase tracking-wider mb-1">
          <Sliders className="w-4 h-4" /> System Preferences
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Settings & Preferences
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage your display appearance, session preferences, and cross-device synchronization.
            </p>
          </div>

          {saveStatus && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span>{saveStatus === 'saving' ? 'Saving to account...' : 'Theme synced to your account!'}</span>
            </div>
          )}
        </div>
      </div>

      {/* 1. Appearance / Theme Customization */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4f6bf7]" /> Display Appearance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Choose how SkillCodex looks to you. Your selected theme is saved to your account and automatically persists when logging in on any other computer or mobile device.
          </p>
        </div>

        {/* Theme Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Light Theme Card */}
          <button
            type="button"
            onClick={() => handleSelectTheme('light')}
            className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer ${
              theme === 'light'
                ? 'border-[#4f6bf7] bg-[#4f6bf7]/5 shadow-md shadow-[#4f6bf7]/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* Active Pill */}
            {theme === 'light' && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#4f6bf7] text-white text-[11px] font-bold">
                <Check className="w-3 h-3" /> Active
              </span>
            )}

            {/* Visual Miniature Preview of Light Mode */}
            <div className="w-full h-32 rounded-xl bg-[#f4f7fe] border border-slate-200 p-2.5 mb-4 flex gap-2 overflow-hidden shadow-inner pointer-events-none">
              {/* Mini Sidebar */}
              <div className="w-16 h-full bg-white rounded-lg border border-slate-200/70 p-1.5 flex flex-col justify-between shrink-0">
                <div className="space-y-1">
                  <div className="w-8 h-2 bg-[#4f6bf7] rounded-sm" />
                  <div className="w-10 h-1.5 bg-slate-200 rounded-sm" />
                  <div className="w-9 h-1.5 bg-slate-200 rounded-sm" />
                </div>
                <div className="w-full h-3 bg-slate-100 rounded" />
              </div>
              {/* Mini Content Area */}
              <div className="flex-1 space-y-2">
                <div className="w-20 h-2.5 bg-slate-800 rounded-sm" />
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-10 bg-white rounded-md border border-slate-200 p-1">
                    <div className="w-6 h-1.5 bg-slate-300 rounded-sm mb-1" />
                    <div className="w-10 h-2 bg-[#4f6bf7] rounded-sm" />
                  </div>
                  <div className="h-10 bg-white rounded-md border border-slate-200 p-1">
                    <div className="w-6 h-1.5 bg-slate-300 rounded-sm mb-1" />
                    <div className="w-8 h-2 bg-emerald-500 rounded-sm" />
                  </div>
                </div>
                <div className="h-10 bg-white rounded-md border border-slate-200" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 shrink-0">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Light Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Crisp, light bluish-white aesthetic with optimal daytime clarity.
                </p>
              </div>
            </div>
          </button>

          {/* Dark Theme Card */}
          <button
            type="button"
            onClick={() => handleSelectTheme('dark')}
            className={`p-5 rounded-2xl border-2 text-left transition-all relative overflow-hidden group cursor-pointer ${
              theme === 'dark'
                ? 'border-[#4f6bf7] bg-[#4f6bf7]/10 shadow-md shadow-[#4f6bf7]/15'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* Active Pill */}
            {theme === 'dark' && (
              <span className="absolute top-4 right-4 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#4f6bf7] text-white text-[11px] font-bold">
                <Check className="w-3 h-3" /> Active
              </span>
            )}

            {/* Visual Miniature Preview of Dark Mode */}
            <div className="w-full h-32 rounded-xl bg-slate-950 border border-slate-800 p-2.5 mb-4 flex gap-2 overflow-hidden shadow-inner pointer-events-none">
              {/* Mini Sidebar */}
              <div className="w-16 h-full bg-slate-900 rounded-lg border border-slate-800 p-1.5 flex flex-col justify-between shrink-0">
                <div className="space-y-1">
                  <div className="w-8 h-2 bg-[#4f6bf7] rounded-sm" />
                  <div className="w-10 h-1.5 bg-slate-700 rounded-sm" />
                  <div className="w-9 h-1.5 bg-slate-700 rounded-sm" />
                </div>
                <div className="w-full h-3 bg-slate-800 rounded" />
              </div>
              {/* Mini Content Area */}
              <div className="flex-1 space-y-2">
                <div className="w-20 h-2.5 bg-slate-200 rounded-sm" />
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-10 bg-slate-900 rounded-md border border-slate-800 p-1">
                    <div className="w-6 h-1.5 bg-slate-600 rounded-sm mb-1" />
                    <div className="w-10 h-2 bg-[#4f6bf7] rounded-sm" />
                  </div>
                  <div className="h-10 bg-slate-900 rounded-md border border-slate-800 p-1">
                    <div className="w-6 h-1.5 bg-slate-600 rounded-sm mb-1" />
                    <div className="w-8 h-2 bg-emerald-400 rounded-sm" />
                  </div>
                </div>
                <div className="h-10 bg-slate-900 rounded-md border border-slate-800" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 shrink-0">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-sm text-slate-800 dark:text-slate-100">Dark Mode</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Deep dark slate palette designed to reduce eyestrain during long coding sessions.
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 2. Security & Session Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security & Inactivity Policy */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <Shield className="w-4 h-4 text-[#4f6bf7]" /> Active Security Policy
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">2-Hour Inactivity Auto-Logout Enabled</p>
                <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                  For proctoring compliance and account protection, your active session automatically terminates after 120 minutes of inactivity across all devices.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">Account Access Role:</span>
              <span className="font-bold font-mono text-[#4f6bf7]">{roleName}</span>
            </div>

            <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-400">Primary ID:</span>
              <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{primaryId}</span>
            </div>
          </div>
        </div>

        {/* Profile & Account Quick Info */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
              <User className="w-4 h-4 text-[#4f6bf7]" /> Account Overview
            </div>
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Full Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{user?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-400">Registered Email</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">{user?.email || 'None (Optional ID Login)'}</span>
              </div>
              {user?.organization && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400">Organization</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{user.organization}</span>
                </div>
              )}
              {user?.batch && (
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Batch / Group</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{user.batch}</span>
                </div>
              )}
            </div>
          </div>

          <Link
            to={profileUrl}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors border border-slate-200/80 dark:border-slate-700"
          >
            <span>Manage Complete Account Profile</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
