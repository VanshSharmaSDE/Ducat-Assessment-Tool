import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
  CheckCircle2
} from 'lucide-react';
import logo from '../assets/logo.jpeg';

export default function LoginPage() {
  const { user, login } = useAuth();
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

  // Check if redirected due to concurrent session login
  const isConcurrentLogout = new URLSearchParams(location.search).get('reason') === 'concurrent_session';
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
    <div className="min-h-screen bg-[#f4f7fe] flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Background ambient purplish-blue glows */}
      <div className="absolute top-1/4 left-1/4 w-[480px] h-[480px] bg-[#4f6bf7]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[480px] h-[480px] bg-[#7c3aed]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Split Login Card */}
      <div className="w-full max-w-5xl bg-white rounded-[32px] shadow-[0_20px_70px_-15px_rgba(79,107,247,0.15)] border border-slate-100 overflow-hidden flex flex-col lg:flex-row relative z-10">
        
        {/* Left Side: Modern Purplish Visual Panel */}
        <div className="lg:w-1/2 relative bg-gradient-to-br from-[#4f6bf7] via-[#5b5bf5] to-[#7048e8] text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden min-h-[300px] lg:min-h-[620px]">
          {/* Organic background shapes matching reference style */}
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-20 w-96 h-96 bg-[#3a0ca3]/30 rounded-full blur-3xl pointer-events-none" />

          {/* Artistic organic wave curves */}
          <svg
            className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
            viewBox="0 0 400 600"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M-50,200 C100,150 150,350 300,280 C400,230 450,400 450,650 L-50,650 Z"
              fill="url(#organic-gradient)"
            />
            <path
              d="M-30,100 C80,80 120,260 250,200 C360,150 400,320 420,550 L-30,550 Z"
              fill="white"
              fillOpacity="0.1"
            />
            <defs>
              <linearGradient id="organic-gradient" x1="0" y1="0" x2="400" y2="600" gradientUnits="userSpaceOnUse">
                <stop stopColor="#ffffff" stopOpacity="0.3" />
                <stop offset="1" stopColor="#3a0ca3" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Top: Brand Logo */}
          <div className="relative z-10 flex items-center gap-3">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl p-2.5 shadow-md border border-white/40 w-fit">
              <img src={logo} alt="SkillCodex Logo" className="w-full object-contain rounded-xl" />
            </div>
          </div>

          {/* Middle: Feature Headline & Art */}
          <div className="relative z-10 my-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Empowering Skill <br />
              Evaluation & Growth
            </h1>
            <p className="mt-3 text-sm text-white/80 max-w-md leading-relaxed">
              Secure, enterprise-grade automated code execution, multi-cohort management, and instant deep analytics for students and faculty.
            </p>
          </div>

          {/* Bottom: Trust Pills */}
          <div className="relative z-10 grid grid-cols-2 gap-3 pt-4 border-t border-white/15">
            <div className="flex items-center gap-2 text-xs font-medium text-white/90">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Live Anti-Cheat Proctoring</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-white/90">
              <CheckCircle2 className="w-4 h-4 text-sky-200 shrink-0" />
              <span>Multi-Language Sandbox</span>
            </div>
          </div>
        </div>

        {/* Right Side: Clean Login Form */}
        <div className="lg:w-1/2 p-8 sm:p-12 lg:p-14 flex flex-col justify-center bg-white">
          <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-800">
                Log in
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Login with your Student ID, Faculty ID, Admin ID, or Email
              </p>
            </div>

            {/* Concurrent Session Alert */}
            {isConcurrentLogout && !error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-600" />
                <span>Your account was logged in from another device. You have been logged out from this session for security.</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-sm flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ID or Email Input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                  Login ID or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. STU2026001 or Email"
                    className="w-full pl-11 pr-4 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white focus:border-transparent transition-all shadow-xs"
                  />
                </div>
              </div>

              {/* Password Input with Eye Toggle */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Password
                  </label>
                  {/* <Link
                    to="/forgot-password"
                    className="text-xs text-[#4f6bf7] hover:text-[#3b5bf6] font-semibold transition-colors"
                  >
                    Forgot login or password?
                  </Link> */}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-12 py-3 bg-[#f8fafc] border border-slate-200 rounded-2xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:bg-white focus:border-transparent transition-all shadow-xs"
                  />
                  {/* Eye Icon Button */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer focus:outline-none"
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
                className="w-full mt-3 flex items-center justify-center gap-2 py-3.5 px-6 bg-gradient-to-r from-[#4f6bf7] to-[#6073ea] hover:from-[#3f5be7] hover:to-[#5063da] disabled:opacity-50 text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#4f6bf7]/25 transition-all transform active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] focus:ring-offset-2 focus:ring-offset-white cursor-pointer"
              >
                {loading ? 'Authenticating...' : 'Log in'}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Footer Notice */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">
                Protected by SkillCodex Enterprise Session & Proctoring Security
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
