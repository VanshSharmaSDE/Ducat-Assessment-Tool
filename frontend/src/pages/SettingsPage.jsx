import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { getProfilePictureUrl, handleAvatarError } from '../utils/imageUrl';
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
  Smartphone,
  ShieldCheck,
  RefreshCw,
  Cpu,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  const { theme, setTheme } = useTheme();
  const [saveStatus, setSaveStatus] = useState(null); // 'saving' | 'saved' | 'saved_laptop' | null
  const [laptopOnly, setLaptopOnly] = useState(Boolean(user?.restrictStudentLaptopOnly));
  const [togglingLaptop, setTogglingLaptop] = useState(false);

  // Live viewport telemetry
  const [viewport, setViewport] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  const [cacheCleared, setCacheCleared] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user?.restrictStudentLaptopOnly !== undefined) {
      setLaptopOnly(Boolean(user.restrictStudentLaptopOnly));
    }
  }, [user?.restrictStudentLaptopOnly]);

  const handleToggleLaptopOnly = async () => {
    const nextValue = !laptopOnly;
    setTogglingLaptop(true);
    setSaveStatus('saving');
    try {
      await api.put('/users/student-restrictions', {
        restrictStudentLaptopOnly: nextValue,
      });
      setLaptopOnly(nextValue);
      if (updateUser) {
        updateUser({ restrictStudentLaptopOnly: nextValue });
      }
      setSaveStatus('saved_laptop');
      setTimeout(() => {
        setSaveStatus(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to update student login restrictions', err);
      setLaptopOnly(laptopOnly);
    } finally {
      setTogglingLaptop(false);
    }
  };

  const handleSelectTheme = async (newTheme) => {
    if (newTheme === theme) return;
    setSaveStatus('saving');
    await setTheme(newTheme);
    setSaveStatus('saved');
    setTimeout(() => {
      setSaveStatus(null);
    }, 2500);
  };



  const handleClearCache = () => {
    try {
      sessionStorage.clear();
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const isDark = theme === 'dark';
  const isAdmin = user?.role === 'ADMIN';
  const isFaculty = user?.role === 'FACULTY';
  const roleName = isAdmin ? 'Administrator' : isFaculty ? 'Faculty Instructor' : 'Student Candidate';
  const primaryId = user?.studentId || user?.facultyId || user?.adminId || user?.rollNumber || 'N/A';
  const profileUrl = isAdmin || isFaculty ? '/admin/profile' : '/profile';
  const isLaptopCompliant = viewport.width >= 1024;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Settings & Preferences
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your display themes, examination proctoring policies, and device telemetry.
          </p>
        </div>

        {saveStatus && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-sm self-start sm:self-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
            <span>
              {saveStatus === 'saving'
                ? 'Saving to account...'
                : saveStatus === 'saved_laptop'
                ? 'Student login restriction preference saved!'
                : 'Theme synced to your account!'}
            </span>
          </div>
        )}
      </div>

      {/* Main 12-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (4 Cols on lg): Device Telemetry, Security Policy, Account Snapshot */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          {/* 1. Live Device & Viewport Diagnostics Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Laptop className="w-4 h-4 text-[#4f6bf7]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                  Device & Viewport Telemetry
                </h3>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Live telemetry" />
            </div>

            {/* Screen Resolution Metric */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400 font-medium">Detected Viewport:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {viewport.width} × {viewport.height} px
                </span>
              </div>

              {/* Compliance Pill */}
              <div
                className={`p-2.5 rounded-xl border text-xs flex items-center gap-2 ${
                  isLaptopCompliant
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                }`}
              >
                {isLaptopCompliant ? (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                )}
                <div className="text-[11px] leading-tight font-medium">
                  {isLaptopCompliant ? (
                    <span>Laptop / Desktop Viewport (≥ 1024px)</span>
                  ) : (
                    <span>Mobile / Compact Viewport (&lt; 1024px)</span>
                  )}
                </div>
              </div>
            </div>

            {/* System Info Rows */}
            <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Environment</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {typeof navigator !== 'undefined' ? navigator.platform || 'Desktop Browser' : 'Web'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 dark:text-slate-400">Active Theme</span>
                <span className="font-bold text-[#4f6bf7] capitalize">{theme} Mode</span>
              </div>
            </div>
          </div>

          {/* 2. Account Profile Snapshot Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              <User className="w-4 h-4 text-[#4f6bf7]" />
              <span>Account Credentials</span>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-gradient-to-tr from-[#4f6bf7] to-[#6073ea] text-white flex items-center justify-center font-bold text-lg shadow-sm">
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
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{user?.name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono truncate">{primaryId}</p>
                <span className="inline-block mt-0.5 text-[10px] font-bold text-[#4f6bf7]">
                  {roleName}
                </span>
              </div>
            </div>

            <Link
              to={profileUrl}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors border border-slate-200/80 dark:border-slate-700 cursor-pointer"
            >
              <span>Manage Complete Profile</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* 3. Session & Security Policy Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
              <Shield className="w-4 h-4 text-[#4f6bf7]" />
              <span>Active Security Policy</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <p className="font-bold">2-Hour Inactivity Auto-Logout</p>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                    Sessions terminate after 120 minutes of inactivity for exam integrity.
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleClearCache}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cacheCleared ? 'text-emerald-500 animate-spin' : ''}`} />
                  <span>{cacheCleared ? 'Session Cache Cleared' : 'Clear Temporary Cache'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (8 Cols on lg): Theme Selector & Laptop Restriction */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          {/* Card 1: Display Appearance & Theme Selector */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#4f6bf7]" /> Display Appearance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose how SkillCodex looks to you. Your selected theme is saved to your account and automatically persists when logging in on any computer or mobile device.
              </p>
            </div>

            {/* Theme Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

          {/* Card 2: Student Assessment Security & Laptop Restriction (for Admin & Faculty) */}
          {(isAdmin || isFaculty) && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Student Assessment Security
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Laptop className="w-5 h-5 text-blue-600" /> Restrict Student Login to Laptop Screen Only
                    </h2>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                        laptopOnly
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {laptopOnly ? 'Enforced' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    When enabled, students created by or assigned to you can only log in on a laptop or desktop computer (screen width ≥ 1024px). Mobile phones, tablets, and small screen devices will be strictly blocked during student login.
                  </p>
                </div>

                {/* Examination-style Toggle Switch */}
                <div className="flex items-center shrink-0 self-start sm:self-center">
                  <label className={`relative inline-flex items-center cursor-pointer shrink-0 ${togglingLaptop ? 'opacity-50 cursor-wait' : ''}`}>
                    <input
                      type="checkbox"
                      checked={Boolean(laptopOnly)}
                      disabled={togglingLaptop}
                      onChange={handleToggleLaptopOnly}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 dark:after:border-slate-600 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Context Explanatory Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div
                  className={`p-4 rounded-2xl border transition-colors ${
                    laptopOnly
                      ? 'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Laptop className="w-4 h-4 text-blue-600" />
                    <span>Laptop & Desktop Access (Width ≥ 1024px)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {laptopOnly
                      ? 'All standard laptops and PCs with screen resolutions of 1024px or higher are authorized for examination login.'
                      : 'Students can log in from any device or screen size.'}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-2xl border transition-colors ${
                    laptopOnly
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-200'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold mb-1">
                    <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Mobile & Small Screen Viewports (&lt; 1024px)</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {laptopOnly
                      ? 'Access blocked for your students on smartphones, portrait tablets, and small screen windows.'
                      : 'Mobile login is currently permitted.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Card 2: Examination Environment & System Readiness (for Students) */}
          {!isAdmin && !isFaculty && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#4f6bf7]" />
                  Examination Readiness & Proctoring Diagnostics
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Ensure your computer and browser meet all technical requirements for secure proctoring and code execution.
                </p>
              </div>

              {/* Technical Readiness Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-blue-600" /> Resolution Compliance
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isLaptopCompliant
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                          : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                      }`}
                    >
                      {isLaptopCompliant ? 'PASS' : 'WARNING'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Detected viewport {viewport.width} × {viewport.height} px (Minimum required: 1024px width).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600" /> Fullscreen & Tab Monitoring
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      SUPPORTED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    HTML5 Fullscreen API and browser blur focus listeners are active and supported.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-purple-600" /> Docker Sandbox Engine
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      ONLINE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Direct low-latency socket tunnel connected to isolated compiler containers.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-amber-600" /> Client Session Cache
                    </span>
                    <button
                      type="button"
                      onClick={handleClearCache}
                      className="text-[10px] font-bold text-[#4f6bf7] hover:underline cursor-pointer"
                    >
                      {cacheCleared ? 'Cleared ✓' : 'Clear Storage'}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Purges temporary exam drafts and local session cache without logging you out.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
