import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useModal } from '../context/ModalContext';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Laptop,
  Sun,
  Moon,
} from 'lucide-react';
import logo from '../assets/logo.jpeg';
import loginBg from '../assets/login-bg.jpg';

export default function LoginPage() {
  const { user, login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { showAlert } = useModal();
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
    if (!identifier.trim()) {
      const msg = 'Please enter your Student ID, Faculty ID, or Email address.';
      setError(msg);
      showAlert({ title: 'Credentials Required', message: msg, type: 'warning' });
      return;
    }
    if (!password) {
      const msg = 'Please enter your account password.';
      setError(msg);
      showAlert({ title: 'Password Required', message: msg, type: 'warning' });
      return;
    }

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
      const msg = err.response?.data?.message || 'Invalid Student ID, Faculty ID, or password';
      setError(msg);
      showAlert({
        title: 'Authentication Failed',
        message: msg,
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden bg-slate-50 dark:bg-slate-950 font-sans select-none transition-colors duration-500">
      {/* Background Photography with CSS Theme-Adaptive Tweaks */}
      <div
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 ease-in-out ${
          isDark
            ? 'filter brightness-[0.25] contrast-[1.2] grayscale-[0.3] saturate-[0.85]'
            : 'filter brightness-[1.0] contrast-[1.0] saturate-[0.95]'
        }`}
        style={{ backgroundImage: `url(${loginBg})` }}
      />

      {/* Atmospheric Theme-Adaptive Gradient Overlay */}
      <div
        className={`absolute inset-0 transition-all duration-700 backdrop-blur-[1px] ${
          isDark
            ? 'bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-950/75'
            : 'bg-gradient-to-r from-slate-50/95 via-white/85 to-blue-50/70'
        }`}
      />

      {/* Top Right: Theme Toggle Button */}
      <div className="fixed top-6 right-6 z-30">
        <button
          type="button"
          onClick={toggleTheme}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-full backdrop-blur-md border text-xs font-semibold transition-all cursor-pointer shadow-md ${
            isDark
              ? 'bg-black/50 hover:bg-black/75 text-white/90 hover:text-white border-white/15'
              : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-slate-900/10'
          }`}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-blue-600" />
              <span>Dark Mode</span>
            </>
          )}
        </button>
      </div>

      {/* Top Left Header: Brand Logo & Title */}
      <header className="relative z-10 p-6 sm:p-10 lg:p-12">
        <div className="flex items-center gap-4">
          <div className="bg-[#fff] dark:bg-white rounded-2xl sm:px-5 sm:py-3 shadow-lg shadow-slate-900/10 border border-slate-200/90 dark:border-white w-[170px] sm:w-[210px] md:w-[240px] transition-all">
            <img src={logo} alt="Shape My Skills by DUCAT" className="w-full h-auto object-contain rounded-2xl" />
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none">
              CodeAssess
            </span>
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-600 dark:text-slate-300 font-semibold mt-1">
              Assessment Core
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area: Left Tagline & Right Floating Authentication Card */}
      <main className="relative z-10 flex-1 flex flex-col lg:flex-row items-center justify-between px-6 sm:px-10 lg:px-16 xl:px-20 py-4 lg:py-0 w-full max-w-7xl mx-auto gap-10">
        {/* Left Side: Brand Promise Headline */}
        <div className="w-full lg:w-1/2 max-w-xl text-left">
          <h1 className="text-3xl sm:text-4xl lg:text-[44px] xl:text-[48px] font-black text-slate-900 dark:text-white tracking-tight leading-[1.15]">
            Assessment + Proctoring, <br className="hidden sm:inline" />
            all in Code Assess
          </h1>
          <p className="mt-4 sm:mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal max-w-lg">
            A comprehensive evaluation platform for colleges, universities, and enterprises to conduct coding examinations, automated test executions, and proctoring in unison.
          </p>
        </div>

        {/* Right Side: Clean Floating Authentication Card */}
        <div className="w-full lg:w-auto flex justify-center lg:justify-end">
          <div className="w-full max-w-[430px] sm:max-w-[450px] bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[32px] p-7 sm:p-9 lg:p-10 shadow-2xl shadow-slate-900/15 dark:shadow-black/70 border border-slate-200/90 dark:border-slate-800 transition-all duration-500">
            <h2 className="text-2xl sm:text-[28px] font-black text-slate-900 dark:text-white tracking-tight">
              Sign in to CodeAssess
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-6">
              Enter your credentials to access your assessment workspace.
            </p>

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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Email or Student / Faculty ID"
                  className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950/50 transition-all shadow-sm"
                />
              </div>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-sm focus:outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-950/50 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 cursor-pointer focus:outline-none"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-blue-600" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Inline Error Message */}
              {error && (
                error.toLowerCase().includes('laptop') || error.toLowerCase().includes('screen') ? (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                      <Laptop className="w-4 h-4 shrink-0 text-amber-600" />
                      <span>Laptop / Desktop Screen Required</span>
                    </div>
                    <p className="leading-relaxed">{error}</p>
                  </div>
                ) : (
                  <p className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </p>
                )
              )}

              {/* Solid Theme-Blue Sign In Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 px-4 bg-[#4f6bf7] hover:bg-blue-800 active:bg-blue-800 disabled:opacity-60 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Subtle Institutional Footer Note */}
            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Need credentials or assistance? Contact your department or examination coordinator.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Left Copyright & Legal Links (Matching Inspiration) */}
      <footer className="relative z-10 p-6 sm:p-10 lg:p-12 text-xs text-slate-600 dark:text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors duration-500">
        <div className="space-y-1">
          <p className="text-slate-600 dark:text-slate-400">© 2024-2026 CodeAssess Platform. All rights reserved.</p>
          {/* <div className="flex items-center gap-4 text-slate-600 dark:text-slate-400">
            <span className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors">Privacy Policy</span>
            <span className="text-slate-400 dark:text-slate-600">•</span>
            <span className="hover:text-slate-900 dark:hover:text-slate-200 cursor-pointer transition-colors">Terms of Service</span>
          </div> */}
        </div>
        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
          SSL Encrypted • High Integrity Proctoring
        </div>
      </footer>
    </div>
  );
}
