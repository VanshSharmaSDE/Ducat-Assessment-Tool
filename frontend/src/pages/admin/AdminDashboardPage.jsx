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
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
            {/* <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {isAdmin ? 'System Administrator' : 'Faculty Instructor'}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
            </span> */}
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isAdmin ? 'Platform Overview & Executive Analytics' : 'Faculty Command Center & Analytics'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin
              ? 'Consolidated KPI telemetry across assessments, cohorts, institutions, and candidate submissions.'
              : 'Performance metrics across your student cohorts, active examinations, and evaluation outcomes.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/results"
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>Results & Reports</span>
          </Link>
          <Link
            to="/admin/exams/new"
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Exam</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid (8 Centralized Metrics) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Candidates */}
        <Link
          to="/admin/students"
          className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 transition-all shadow-md hover:shadow-sky-500/5 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-sky-300 transition-colors">
              Candidates
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:bg-sky-500/20 transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">{stats.totalUsers}</p>
          <span className="text-[11px] text-slate-500 mt-1 block flex items-center justify-between">
            <span>Enrolled students</span>
            <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-sky-400 transition-colors" />
          </span>
        </Link>

        {/* Examinations */}
        <Link
          to="/admin/exams"
          className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-emerald-500/50 transition-all shadow-md hover:shadow-emerald-500/5 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-emerald-300 transition-colors">
              Active Assessments
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">
            {stats.activeExams}{' '}
            <span className="text-sm text-slate-500 font-normal">/ {stats.totalExams} Total</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block flex items-center justify-between">
            <span>Published examinations</span>
            <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-emerald-400 transition-colors" />
          </span>
        </Link>

        {/* Attempts & Code Runs */}
        <Link
          to="/admin/submissions"
          className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 transition-all shadow-md hover:shadow-indigo-500/5 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-indigo-300 transition-colors">
              Attempts & Runs
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
              <Terminal className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">
            {stats.totalAttempts}{' '}
            <span className="text-sm text-indigo-400/80 font-normal">({stats.totalSubmissions} runs)</span>
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block flex items-center justify-between">
            <span>Evaluations recorded</span>
            <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-indigo-400 transition-colors" />
          </span>
        </Link>

        {/* Pass Rate */}
        <Link
          to="/admin/results"
          className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all shadow-md hover:shadow-amber-500/5 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-amber-300 transition-colors">
              Overall Pass Rate
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-amber-400 mt-3 font-mono">{stats.passRate}%</p>
          <span className="text-[11px] text-slate-500 mt-1 block flex items-center justify-between">
            <span className="text-emerald-400 font-semibold">{stats.passedCount} Pass</span>
            <span className="text-rose-400 font-semibold">{stats.failedCount} Fail</span>
          </span>
        </Link>

        {/* Avg Performance */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Avg Assessment Score
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">{stats.averageScore}%</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Candidate average marks</span>
        </div>

        {/* Batches */}
        <Link
          to="/admin/batches"
          className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 transition-all shadow-md hover:shadow-purple-500/5 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-purple-300 transition-colors">
              Batches & Cohorts
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">{stats.totalBatches}</p>
          <span className="text-[11px] text-slate-500 mt-1 block flex items-center justify-between">
            <span>Student cohorts</span>
            <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-purple-400 transition-colors" />
          </span>
        </Link>

        {/* Organizations */}
        <Link
          to="/admin/organizations"
          className="group p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all shadow-md hover:shadow-amber-500/5 block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-amber-300 transition-colors">
              Organizations
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono">{stats.totalOrganizations}</p>
          <span className="text-[11px] text-slate-500 mt-1 block flex items-center justify-between">
            <span>Institutional partners</span>
            <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-amber-400 transition-colors" />
          </span>
        </Link>

        {/* Proctoring Violations */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Proctoring Security
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-rose-400 mt-3 font-mono">{stats.totalViolations}</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Tab switch & exit infractions</span>
        </div>
      </div>

      {/* Analytics Visualizations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Language Usage Chart */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" /> Language Distribution
            </h3>
            <span className="text-[11px] text-slate-500">Submissions count</span>
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
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
                    itemStyle={{ color: '#38bdf8' }}
                  />
                  <Bar dataKey="submissions" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Assessment Outcomes Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-400" /> Outcomes Distribution
            </h3>
            <span className="text-[11px] text-slate-500">Pass vs Fail ratio</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {outcomeData.length === 0 ? (
              <div className="text-xs text-slate-500">No completed evaluations yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
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
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" /> Question Bank Difficulty
            </h3>
            <span className="text-[11px] text-slate-500">Catalog balance</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {difficultyData.length === 0 ? (
              <div className="text-xs text-slate-500">No questions available</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#f8fafc' }}
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
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" /> Top Examination Performance
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Highest volume assessments with aggregate candidate outcomes
              </p>
            </div>
            <Link
              to="/admin/results"
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              All Results <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3 px-4 font-semibold">Examination</th>
                  <th className="py-3 px-4 font-semibold">Total Attempts</th>
                  <th className="py-3 px-4 font-semibold">Avg Score</th>
                  <th className="py-3 px-4 font-semibold">Pass Rate</th>
                  <th className="py-3 px-4 font-semibold">Passed / Failed</th>
                  <th className="py-3 px-4 font-semibold text-right">Drilldown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {topExams.map((ex) => (
                  <tr key={ex.examId} className="text-slate-300 hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      </div>
                      <span className="truncate max-w-xs">{ex.title}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sky-400">{ex.attempts}</td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-200">{ex.avgScore}%</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              ex.passRate >= 60 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${Math.min(100, ex.passRate)}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-200">{ex.passRate}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-emerald-400 font-semibold">{ex.passed} Pass</span>
                      <span className="text-slate-500 mx-1.5">/</span>
                      <span className="text-rose-400 font-semibold">{ex.failed} Fail</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        to="/admin/results"
                        className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
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
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" /> Live Submissions Feed
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Recent code executions processed by evaluation workers
            </p>
          </div>
          <Link
            to="/admin/submissions"
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            All Submissions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                <th className="py-3 px-4 font-semibold">Candidate</th>
                <th className="py-3 px-4 font-semibold">Examination</th>
                <th className="py-3 px-4 font-semibold">Problem</th>
                <th className="py-3 px-4 font-semibold">Language</th>
                <th className="py-3 px-4 font-semibold">Evaluation Status</th>
                <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No recent submissions recorded yet
                  </td>
                </tr>
              ) : (
                recentSubmissions.map((sub) => (
                  <tr key={sub._id} className="text-slate-300 hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white">{sub.userId?.name || 'Candidate'}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {sub.userId?.rollNumber || sub.userId?.email || 'N/A'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{sub.examId?.title || 'Exam'}</td>
                    <td className="py-3.5 px-4 text-slate-400">{sub.questionId?.title || 'Problem'}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] uppercase font-bold text-sky-400">
                      {sub.language}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-right">
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
