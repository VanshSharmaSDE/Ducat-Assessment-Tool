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
  ShieldAlert,
  CheckCircle2,
  XCircle,
  BarChart3,
  Layers,
  Building2,
  BookOpen,
  PieChart as PieChartIcon,
  ChevronRight,
  ExternalLink,
  Plus
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
  CartesianGrid,
  Legend
} from 'recharts';

const DIFFICULTY_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#6366f1'];

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
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats || {
    totalUsers: 0,
    totalFaculty: 0,
    totalBatches: 0,
    totalOrganizations: 0,
    totalExams: 0,
    activeExams: 0,
    completedExams: 0,
    totalSubmissions: 0,
    totalAttempts: 0,
    averageScore: 0,
    passRate: 0,
    passedCount: 0,
    failedCount: 0,
    totalViolations: 0,
  };

  const languageData = (data?.languageDistribution || []).map((l) => ({
    name: (l.language || '').toUpperCase(),
    submissions: l.count,
  }));

  const difficultyData = (data?.difficultyDistribution || []).map((d) => ({
    name: d.difficulty,
    count: d.count,
  }));

  const outcomeData = (data?.outcomeDistribution || [
    { name: 'Passed', count: stats.passedCount, color: '#10b981' },
    { name: 'Failed', count: stats.failedCount, color: '#f43f5e' },
  ]).filter((o) => o.count > 0);

  const topExams = data?.topExams || [];
  const recentSubmissions = data?.recentSubmissions || [];

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {/* <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-600 border border-blue-200">
              {isAdmin ? 'System Administrator' : 'Faculty Instructor'}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
            </span> */}
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {isAdmin ? 'Platform Overview & Executive Analytics' : 'Faculty Command Center & Analytics'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {isAdmin
              ? 'Consolidated KPI telemetry across assessments, cohorts, institutions, and candidate submissions.'
              : 'Performance metrics across your student cohorts, active examinations, and evaluation outcomes.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/results"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-xl border border-slate-200 shadow-sm transition-all flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5 text-blue-600" />
            <span>Results & Reports</span>
          </Link>
          <Link
            to="/admin/exams/new"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-sm shadow-blue-600/15 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Exam</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid (8 Centralized Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Candidates - Featured Gradient Card 1 */}
        <Link
          to="/admin/users"
          className="group p-5 rounded-2xl bg-gradient-to-r from-[#4f6bf7] to-[#6073ea] text-white shadow-lg shadow-[#4f6bf7]/20 hover:shadow-xl hover:shadow-[#4f6bf7]/30 dark:shadow-none dark:border dark:border-[#4f6bf7]/40 transition-all block relative overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              Candidates
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono relative z-10">{stats.totalUsers}</p>
          <span className="text-[11px] text-white/80 mt-1 block flex items-center justify-between relative z-10">
            <span>Enrolled students</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>

        {/* Examinations - Featured Gradient Card 2 */}
        <Link
          to="/admin/exams"
          className="group p-5 rounded-2xl bg-gradient-to-r from-[#4f6bf7] to-[#6073ea] text-white shadow-lg shadow-[#4f6bf7]/20 hover:shadow-xl hover:shadow-[#4f6bf7]/30 dark:shadow-none dark:border dark:border-[#4f6bf7]/40 transition-all block relative overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              Active Assessments
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono relative z-10">
            {stats.activeExams}{' '}
            <span className="text-sm text-white/70 font-normal">/ {stats.totalExams} Total</span>
          </p>
          <span className="text-[11px] text-white/80 mt-1 block flex items-center justify-between relative z-10">
            <span>Published examinations</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>

        {/* Attempts & Code Runs - Featured Gradient Card 3 */}
        <Link
          to="/admin/submissions"
          className="group p-5 rounded-2xl bg-gradient-to-r from-[#4f6bf7] to-[#6073ea] text-white shadow-lg shadow-[#4f6bf7]/20 hover:shadow-xl hover:shadow-[#4f6bf7]/30 dark:shadow-none dark:border dark:border-[#4f6bf7]/40 transition-all block relative overflow-hidden"
        >
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              Attempts & Runs
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono relative z-10">
            {stats.totalAttempts}{' '}
            <span className="text-xs text-white/80 font-normal">({stats.totalSubmissions} runs)</span>
          </p>
          <span className="text-[11px] text-white/80 mt-1 block flex items-center justify-between relative z-10">
            <span>Evaluations recorded</span>
            <ChevronRight className="w-3.5 h-3.5 text-white/70 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </Link>

        {/* Pass Rate - Clean Card */}
        <Link
          to="/admin/results"
          className="group p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-all shadow-sm hover:shadow-md block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-[#4f6bf7] transition-colors">
              Overall Pass Rate
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#eef2ff] dark:bg-indigo-950/60 text-[#4f6bf7] dark:text-indigo-400 flex items-center justify-center group-hover:bg-[#e0e7ff] dark:group-hover:bg-indigo-900/40 transition-colors">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-[#4f6bf7] dark:text-indigo-400 mt-3 font-mono">{stats.passRate}%</p>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 block flex items-center justify-between">
            <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.passedCount} Pass</span>
            <span className="text-rose-500 dark:text-rose-400 font-bold">{stats.failedCount} Fail</span>
          </span>
        </Link>

        {/* Avg Performance - Pastel Teal */}
        <div className="p-5 rounded-2xl bg-[#eaf8f4] dark:bg-emerald-950/30 border border-[#d2f2e7] dark:border-emerald-800/40 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 dark:text-emerald-300 uppercase tracking-wider">
              Avg Assessment Score
            </span>
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-emerald-900/40 border border-transparent dark:border-emerald-700/50 text-teal-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-teal-900 dark:text-emerald-200 mt-3 font-mono">{stats.averageScore}%</p>
          <span className="text-[11px] text-teal-700/80 dark:text-emerald-400/80 mt-1 block font-medium">Candidate average marks</span>
        </div>

        {/* Batches - Pastel Purple */}
        <Link
          to="/admin/batches"
          className="group p-5 rounded-2xl bg-[#f5f3ff] dark:bg-purple-950/30 border border-[#ede9fe] dark:border-purple-800/40 hover:border-purple-300 dark:hover:border-purple-700/60 transition-all shadow-sm hover:shadow-md block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider group-hover:text-purple-900 dark:group-hover:text-purple-200 transition-colors">
              Batches & Cohorts
            </span>
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-purple-900/40 border border-transparent dark:border-purple-700/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-purple-900 dark:text-purple-200 mt-3 font-mono">{stats.totalBatches}</p>
          <span className="text-[11px] text-purple-700/80 dark:text-purple-400/80 mt-1 block flex items-center justify-between font-medium">
            <span>Student cohorts</span>
            <ChevronRight className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors" />
          </span>
        </Link>

        {/* Organizations - Pastel Yellow/Amber */}
        <Link
          to="/admin/organizations"
          className="group p-5 rounded-2xl bg-[#fef9eb] dark:bg-amber-950/30 border border-[#fef0cd] dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700/60 transition-all shadow-sm hover:shadow-md block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider group-hover:text-amber-950 dark:group-hover:text-amber-200 transition-colors">
              Organizations
            </span>
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-amber-900/40 border border-transparent dark:border-amber-700/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-950 dark:text-amber-200 mt-3 font-mono">{stats.totalOrganizations}</p>
          <span className="text-[11px] text-amber-800/80 dark:text-amber-400/80 mt-1 block flex items-center justify-between font-medium">
            <span>Institutional partners</span>
            <ChevronRight className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors" />
          </span>
        </Link>

        {/* Proctoring Violations - Soft Coral Card */}
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-800/40 shadow-sm transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider">
              Proctoring Security
            </span>
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-rose-900/40 border border-transparent dark:border-rose-700/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-700 dark:text-rose-300 mt-3 font-mono">{stats.totalViolations}</p>
          <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-1 block font-medium">Tab switch & exit infractions</span>
        </div>
      </div>

      {/* Analytics Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Language Usage Chart */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" /> Language Distribution
            </h3>
            <span className="text-[11px] text-slate-400">Submissions count</span>
          </div>
          <div className="h-64 w-full">
            {languageData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No submissions data recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={languageData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#2563eb' }}
                  />
                  <Bar dataKey="submissions" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Assessment Outcomes Breakdown */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600" /> Outcomes Distribution
            </h3>
            <span className="text-[11px] text-slate-400">Pass vs Fail ratio</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {outcomeData.length === 0 ? (
              <div className="text-xs text-slate-400">No completed evaluations yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Pie
                    data={outcomeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {outcomeData.map((entry, index) => (
                      <Cell key={`outcome-${index}`} fill={entry.color || DIFFICULTY_COLORS[index % DIFFICULTY_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Question Difficulty Breakdown */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" /> Question Bank Difficulty
            </h3>
            <span className="text-[11px] text-slate-400">Catalog balance</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {difficultyData.length === 0 ? (
              <div className="text-xs text-slate-400">No questions available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '8px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {difficultyData.map((entry, index) => (
                      <Cell key={`diff-${index}`} fill={DIFFICULTY_COLORS[index % DIFFICULTY_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Top Examinations Performance Table */}
      {topExams.length > 0 && (
        <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" /> Top Examination Performance
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Highest volume assessments with aggregate candidate outcomes
              </p>
            </div>
            <Link
              to="/admin/results"
              className="text-xs text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1"
            >
              All Results <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                  <th className="py-3 px-4 font-semibold">Examination</th>
                  <th className="py-3 px-4 font-semibold">Total Attempts</th>
                  <th className="py-3 px-4 font-semibold">Avg Score</th>
                  <th className="py-3 px-4 font-semibold">Pass Rate</th>
                  <th className="py-3 px-4 font-semibold">Passed / Failed</th>
                  <th className="py-3 px-4 font-semibold text-right">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {topExams.map((ex) => (
                  <tr key={ex.examId} className="text-slate-600 hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      </div>
                      <span className="truncate max-w-xs">{ex.title}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600">{ex.attempts}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">{ex.avgScore}%</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ex.passRate >= 60 ? 'bg-emerald-500' : 'bg-blue-600'
                            }`}
                            style={{ width: `${Math.min(100, ex.passRate)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-700">{ex.passRate}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-600 font-semibold">{ex.passed} Pass</span>
                      <span className="text-slate-400 mx-1.5">/</span>
                      <span className="text-rose-600 font-semibold">{ex.failed} Fail</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to="/admin/results"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-500 font-semibold"
                      >
                        <span>View Results</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Recent Submissions Table */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Live Submissions Feed
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Recent code executions processed by evaluation workers
            </p>
          </div>
          <Link
            to="/admin/submissions"
            className="text-xs text-blue-600 hover:text-blue-500 font-semibold flex items-center gap-1"
          >
            All Submissions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50">
                <th className="py-3 px-4 font-semibold">Candidate</th>
                <th className="py-3 px-4 font-semibold">Examination</th>
                <th className="py-3 px-4 font-semibold">Problem</th>
                <th className="py-3 px-4 font-semibold">Language</th>
                <th className="py-3 px-4 font-semibold">Evaluation Status</th>
                <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No recent submissions recorded yet
                  </td>
                </tr>
              ) : (
                recentSubmissions.map((sub) => (
                  <tr key={sub._id} className="text-slate-600 hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{sub.userId?.name || 'Candidate'}</p>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {sub.userId?.rollNumber || sub.userId?.email || 'N/A'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-medium">{sub.examId?.title || 'Exam'}</td>
                    <td className="py-3.5 px-4 text-slate-500">{sub.questionId?.title || 'Problem'}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] uppercase font-bold text-blue-600">
                      {sub.language}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-right">
                      {new Date(sub.submittedAt || sub.createdAt).toLocaleTimeString()}
                    </td>
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
