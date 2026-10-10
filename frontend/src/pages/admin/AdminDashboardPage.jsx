import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  FileCheck2,
  Award,
  Terminal,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid
} from 'recharts';

const COLORS = ['#0284c7', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        const res = await api.get('/admin/analytics');
        setData(res.data.data);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    }
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalUsers: 0,
    totalExams: 0,
    activeExams: 0,
    completedExams: 0,
    totalSubmissions: 0,
    averageScore: 0,
    passRate: 0,
  };

  const languageData = (data?.languageDistribution || []).map((l) => ({
    name: l.language.toUpperCase(),
    submissions: l.count,
  }));

  const difficultyData = (data?.difficultyDistribution || []).map((d) => ({
    name: d.difficulty,
    count: d.count,
  }));

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isAdmin ? 'Platform Overview & Analytics' : 'Faculty Overview & Analytics'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin 
              ? 'Real-time statistics across all examinations, submissions, and pass rates' 
              : 'Statistics for your examinations, enrolled students, and assessment outcomes'}
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            to="/admin/exams/new"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all"
          >
            + Create New Exam
          </Link>
          <Link
            to="/admin/questions/new"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all"
          >
            + Add Question
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Registered Users</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">{stats.totalUsers}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Candidates enrolled</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Exams</span>
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">{stats.activeExams} / {stats.totalExams}</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Total published assessments</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Assessment Score</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">{stats.averageScore}%</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Overall candidate performance</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pass Rate</span>
            <Award className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">{stats.passRate}%</p>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Candidates meeting passing marks</span>
        </div>
      </div>

      {/* Analytics Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Language Usage Chart */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" /> Language Distribution (Submissions)
            </h3>
          </div>
          <div className="h-64 w-full">
            {languageData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No submissions data recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={languageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Bar dataKey="submissions" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Question Difficulty Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" /> Question Bank Difficulty Distribution
            </h3>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {difficultyData.length === 0 ? (
              <div className="text-xs text-slate-500">No questions available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#f2f3f5', borderColor: '#334155', borderRadius: '8px' }}
                  />
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="count"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {difficultyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Submissions Table */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" /> Recent Submissions
          </h3>
          <Link to="/admin/submissions" className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
            View All Submissions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Candidate</th>
                <th className="pb-3 font-semibold">Examination</th>
                <th className="pb-3 font-semibold">Question</th>
                <th className="pb-3 font-semibold">Language</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {data?.recentSubmissions?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No recent submissions
                  </td>
                </tr>
              ) : (
                data?.recentSubmissions?.map((sub) => (
                  <tr key={sub._id} className="text-slate-300 hover:bg-slate-800/40">
                    <td className="py-3 font-semibold text-white">{sub.userId?.name || 'Anonymous'}</td>
                    <td className="py-3 text-slate-400">{sub.examId?.title || 'Exam'}</td>
                    <td className="py-3">{sub.questionId?.title || 'Question'}</td>
                    <td className="py-3 font-mono text-[11px] uppercase text-sky-400">{sub.language}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{new Date(sub.submittedAt).toLocaleTimeString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
