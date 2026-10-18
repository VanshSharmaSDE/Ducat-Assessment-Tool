import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Lock,
  Mail,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  Code2,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Sun,
  Moon,
  Laptop,
  Terminal,
  Activity,
  Layers,
  GraduationCap,
  Building2,
  Cpu,
  KeyRound,
  LifeBuoy,
} from 'lucide-react';
import logo from '../assets/logo.jpeg';

export default function LoginPage() {
  const { user, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // If already logged in, redirect straight to their respective home
  React.useEffect(() => {
    if (user) {
      if (user.role === 'ADMIN' || user.role === 'FACULTY') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, navigate]);

  // Check if redirected due to concurrent session login or inactivity timeout
  const isConcurrentLogout = new URLSearchParams(location.search).get('reason') === 'concurrent_session';
  const isInactivityLogout = new URLSearchParams(location.search).get('reason') === 'inactivity';
  const from = location.state?.from?.pathname;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedUser = await login(identifier.trim(), password);
      if (loggedUser.role === 'ADMIN' || loggedUser.role === 'FACULTY') {
        const target = (from && from.startsWith('/admin')) ? from : '/admin';
        navigate(target, { replace: true });
      } else {
        const target = (from && from !== '/login' && !from.startsWith('/admin') && !from.startsWith('/faculty'))
          ? from
          : '/dashboard';
        navigate(target, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid Student ID, Faculty ID, or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col lg:flex-row bg-[#f4f7fe] dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 overflow-hidden">
      {/* LEFT SIDE: Full-height Brand & Platform Showcase Hero (Desktop / Large Displays) */}
      <div className="hidden lg:flex lg:w-7/12 xl:w-3/5 relative flex-col justify-between h-full p-8 xl:p-12 overflow-hidden bg-gradient-to-br from-[#eff4fe] via-[#f7f9fd] to-[#e6edfc] dark:bg-gradient-to-br dark:from-[#111827] dark:via-[#0f172a] dark:to-[#020617] border-r border-slate-200/80 dark:border-slate-800 text-slate-800 dark:text-white select-none transition-colors duration-200">
        {/* Background Decorative Mesh & Ambient Glows */}
        <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-gradient-to-bl from-[#4f6bf7]/15 via-[#6366f1]/10 to-transparent dark:from-[#4f6bf7]/20 dark:via-[#7c3aed]/15 dark:to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[550px] h-[550px] bg-gradient-to-tr from-[#38bdf8]/15 via-[#818cf8]/10 to-transparent dark:from-[#3b82f6]/15 dark:via-[#6366f1]/10 dark:to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Subtle geometric dot grid pattern (Light & Dark optimized) */}
        <div
          className="absolute inset-0 opacity-[0.25] dark:hidden pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(79, 107, 247, 0.25) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.07] hidden dark:block pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Top: Header with Logo and Platform Version */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="bg-white rounded-2xl p-2.5 shadow-md shadow-blue-500/5 dark:shadow-xl border border-slate-200/80 dark:border-white/20 w-[140px] sm:w-[155px] transition-colors">
              <img src={logo} alt="SkillCodex Logo" className="w-full h-auto object-contain rounded-xl" />
            </div>
            <div className="hidden xl:flex flex-col">
              <span className="text-xs font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-semibold">Assessment Core</span>
              <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                Enterprise Edition
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-md border border-slate-200/80 dark:border-white/15 text-xs text-slate-600 dark:text-slate-300 shadow-xs">
             <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">Encrypted 256-bit SSL Session</span>
          </div>
        </div>

        {/* Middle: Hero Content & Live Code Evaluation Card */}
        <div className="relative z-10 my-auto py-2 xl:py-4 max-w-2xl">
          <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-[1.15] text-slate-900 dark:text-white">
            Engineering Assessments <br />
            <span className="bg-gradient-to-r from-[#4f6bf7] via-[#6366f1] to-[#8b5cf6] dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">
              Engineered for Precision
            </span>
          </h1>

          <p className="mt-3 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-lg">
            A high-integrity evaluation portal with containerized compiler sandboxes, real-time code execution, and comprehensive candidate analytics.
          </p>

          {/* Micro Terminal / Interactive Simulation Card */}
          <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/90 dark:border-slate-700/60 shadow-xl shadow-blue-500/5 dark:shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2 font-mono text-slate-500 dark:text-slate-400">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <span className="ml-2 font-semibold text-xs font-mono">sandbox-engine • v2.4</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Sandbox Verified
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-xs sm:text-[13px] leading-relaxed">
              <div className="text-slate-800 dark:text-slate-400">
                <span className="text-[#4f6bf7] dark:text-blue-400 font-bold">$</span> skillcodex test --language=java --candidate=STUDENT
              </div>
              <div className="text-slate-600 dark:text-slate-400 text-xs sm:text-[13px] pl-3 border-l-2 border-blue-500/40 dark:border-slate-700/80 space-y-1">
                <p className="text-slate-700 dark:text-slate-300">✓ Test Case 1: Standard Edge Input & Output (12ms)</p>
                <p className="text-slate-700 dark:text-slate-300">✓ Test Case 2: Boundary Bounds [0 &lt;= N &lt;= 10^6] (28ms)</p>
                <p className="text-slate-700 dark:text-slate-300">✓ Test Case 3: Memory & Execution Profiler Clean (6.4MB)</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-[13px]">
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" /> Verdict: 100% Passed
                </span>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-xs">0 Violations Detected</span>
              </div>
            </div>
          </div>

          {/* Telemetry Grid (Like Dashboard metric cards) */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-sm shadow-sm shadow-blue-500/5">
              <div className="text-lg xl:text-xl font-black text-slate-800 dark:text-white font-mono">99.9%</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Proctoring Fidelity</div>
            </div>
            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-sm shadow-sm shadow-blue-500/5">
              <div className="text-lg xl:text-xl font-black text-slate-800 dark:text-white font-mono">&lt; 200ms</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Sandbox Latency</div>
            </div>
            <div className="p-3 xl:p-3.5 rounded-2xl bg-white/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 backdrop-blur-sm shadow-sm shadow-blue-500/5">
              <div className="text-lg xl:text-xl font-black text-slate-800 dark:text-white font-mono">3 Techs</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Java • Python • JS</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Interactive Full-Screen Authentication Form */}
      <div className="w-full lg:w-5/12 xl:w-2/5 flex flex-col justify-between h-full p-6 sm:p-8 lg:p-8 xl:p-12 bg-white dark:bg-slate-900 border-l border-slate-200/80 dark:border-slate-800 overflow-y-auto lg:overflow-hidden">
        {/* Top Controls: Mobile Logo & Theme Toggle */}
        <div className="flex items-center justify-between pb-3">
          <div className="lg:hidden flex items-center gap-2.5">
            <div className="bg-white rounded-xl p-1.5 border border-slate-200 dark:border-slate-700 shadow-sm w-[115px]">
              <img src={logo} alt="SkillCodex Logo" className="w-full h-auto object-contain rounded-lg" />
            </div>
          </div>

          <div className="ml-auto">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-xs cursor-pointer"
              title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
            >
              {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-blue-600" />}
              <span className="text-xs">{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>
        </div>

        {/* Center: Main Form Card */}
        <div className="my-auto py-2 max-w-md w-full mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-800 dark:text-white">
              Access Workspace
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Login with your Student ID, Faculty ID, Admin ID, or registered institutional email.
            </p>
          </div>

          {/* Concurrent Session Alert */}
          {isConcurrentLogout && !error && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Your account was logged in from another device. You have been logged out from this session for security.</span>
            </div>
          )}

          {/* Inactivity Session Alert */}
          {isInactivityLogout && !error && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>You have been automatically logged out due to 2 hours of inactivity. Please sign in again.</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            error.toLowerCase().includes('laptop') || error.toLowerCase().includes('screen') ? (
              <div className="mb-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs space-y-1 shadow-sm">
                <div className="flex items-center gap-1.5 font-bold text-sm text-amber-800 dark:text-amber-300">
                  <Laptop className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Laptop / Desktop Screen Required</span>
                </div>
                <p className="text-amber-800 dark:text-amber-200/90 leading-relaxed font-medium">
                  {error}
                </p>
              </div>
            ) : (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* ID or Email Input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Account Identifier or Email <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. STU2026001 or email@domain.com"
                  className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white dark:focus:bg-slate-800 focus:border-transparent transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Password Input with Eye Toggle */}
            <div>
              <div className="mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Password <span className="text-red-500 font-bold">*</span>
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-12 py-3 bg-[#f8fafc] dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white dark:focus:bg-slate-800 focus:border-transparent transition-all shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4 text-[#4f6bf7]" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#4f6bf7] to-[#6073ea] hover:from-[#3f5be7] hover:to-[#5063da] disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#4f6bf7]/25 transition-all transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-900 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Need help or forgot prompt */}
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Need assistance?{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                Contact your Faculty Administrator or College IT desk.
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
