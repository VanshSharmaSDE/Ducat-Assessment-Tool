import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import logo from '../assets/logo.jpeg';
import { Code2, Mail, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [devToken, setDevToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message || 'Password reset instructions have been generated.');
      if (res.data.devToken) {
        setDevToken(res.data.devToken);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to process request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-50/50 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center w-44 h-24 rounded-2xl bg-white shadow-md shadow-blue-600/15 border border-slate-200 mb-4">
          <img src={logo} alt="CodeAssess Logo" className="w-full h-full rounded-2xl object-contain p-2" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-800">Reset Password</h2>
        <p className="mt-2 text-sm text-slate-500">Enter your email to receive recovery instructions</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-sm py-8 px-6 shadow-lg rounded-2xl border border-slate-200 sm:px-10">
          {message && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                <span>{message}</span>
              </div>
              {devToken && (
                <div className="mt-2 p-2.5 bg-white rounded border border-emerald-200 text-xs font-mono text-emerald-800 break-all">
                  <span>Dev Reset Token: </span>
                  <strong>{devToken}</strong>
                  <div className="mt-1">
                    <Link to={`/reset-password?token=${devToken}`} className="underline text-blue-600 hover:text-blue-500 font-sans font-semibold">
                      Click here to reset with this token &rarr;
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white"
            >
              {loading ? 'Processing...' : 'Send Reset Link'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Remembered your password?{' '}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500">
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
