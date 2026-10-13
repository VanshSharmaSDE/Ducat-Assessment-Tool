import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Code2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';

export default function UserDashboard() {
  const { user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, examsRes, resultsRes] = await Promise.all([
          api.get('/users/profile'),
          api.get('/exams'),
          api.get('/results'),
        ]);

        setProfileData(profileRes.data.data);
        setExams(examsRes.data.data.exams || []);
        setResults(resultsRes.data.data.results || []);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = profileData?.stats || {
    totalAttempted: 0,
    totalCompleted: 0,
    averageScore: 0,
    highestScore: 0,
  };

  const availableCount = exams.filter((e) => e.examStatus === 'ACTIVE' && e.userStatus !== 'COMPLETED').length;
  const upcomingExams = exams.filter((e) => e.examStatus === 'UPCOMING');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-white border border-slate-100 p-8 shadow-sm">
        <div className="relative z-10 max-w-2xl">
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight sm:text-4xl">
            Welcome back, {user?.name}!
          </h1>
          {(user?.studentId || user?.rollNumber) && (
            <p className="mt-1 text-xs font-mono text-[#4f6bf7] font-semibold">
              Student ID: {user?.studentId || user?.rollNumber}
            </p>
          )}
          <p className="mt-2 text-slate-500 text-sm sm:text-base leading-relaxed">
            Ready for your next coding examination? Check available tests below. Remember that code execution runs automatically against rigorous test cases upon submission.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/exams"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4f6bf7] hover:bg-[#3b5bf6] text-white font-semibold text-sm shadow-md shadow-[#4f6bf7]/25 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Active Exams ({availableCount})</span>
            </Link>
            <Link
              to="/results"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-all shadow-sm"
            >
              <Award className="w-4 h-4 text-[#4f6bf7]" />
              <span>View Past Results</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row (styled to match design reference) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Featured Gradient Card (like top cards in reference) */}
        <div className="bg-gradient-to-r from-[#4f6bf7] to-[#6073ea] text-white rounded-2xl p-5 shadow-lg shadow-[#4f6bf7]/20 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">Available Exams</span>
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 relative z-10 font-mono">{availableCount}</p>
          <p className="text-[11px] text-white/80 mt-1 relative z-10">Open for taking right now</p>
        </div>

        {/* Completed */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-3 font-mono">{stats.totalCompleted}</p>
          <p className="text-xs text-slate-400 mt-1">Evaluated examinations</p>
        </div>

        {/* Average Score */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Score</span>
            <div className="w-9 h-9 rounded-xl bg-[#eef2ff] text-[#4f6bf7] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-3 font-mono">{stats.averageScore}%</p>
          <p className="text-xs text-slate-400 mt-1">Overall candidate performance</p>
        </div>

        {/* Highest Score */}
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Highest Score</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-3 font-mono">{stats.highestScore}%</p>
          <p className="text-xs text-slate-400 mt-1">Top examination score</p>
        </div>
      </div>

      {/* Grid: Active Exams & Recent Attempts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Available Exams */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800">Active Assessments</h2>
            </div>
            <Link to="/exams" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {exams.filter((e) => e.examStatus === 'ACTIVE').length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-500">
                <BookOpen className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                <p className="text-sm">No active assessments right now.</p>
              </div>
            ) : (
              exams
                .filter((e) => e.examStatus === 'ACTIVE')
                .slice(0, 3)
                .map((exam) => (
                  <div
                    key={exam._id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-800 text-base truncate">{exam.title}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200">
                          ACTIVE
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          {exam.difficulty}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">{exam.description}</p>
                      <div className="flex items-center gap-3 flex-wrap text-[11px] pt-1">
                        <span className="font-mono text-emerald-600 font-medium">
                          Starts: {new Date(exam.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-rose-600 font-medium">
                          Expires: {new Date(exam.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {exam.duration} mins
                        </span>
                        <span className="flex items-center gap-1">
                          <Code2 className="w-3.5 h-3.5 text-slate-400" />
                          {exam.questionCount} Questions
                        </span>
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          Total: {exam.totalMarks} Marks
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {exam.userStatus === 'COMPLETED' ? (
                        <Link
                          to={exam.attemptId ? `/results/${exam.attemptId}` : '/results'}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 border border-slate-200 transition-colors"
                        >
                          View Result
                        </Link>
                      ) : exam.userStatus === 'IN_PROGRESS' ? (
                        <Link
                          to={`/exams/${exam._id}/take`}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/15"
                        >
                          Resume Exam
                        </Link>
                      ) : (
                        <Link
                          to={`/exams/${exam._id}/instructions`}
                          className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold hover:bg-blue-500 transition-colors shadow-md shadow-blue-600/20"
                        >
                          Start Assessment
                        </Link>
                      )}
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Right Column: Recent Results & Upcoming */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Recent Attempts
            </h2>

            {results.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white border border-slate-200 text-center text-xs text-slate-500 shadow-sm">
                You have not completed any examinations yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {results.slice(0, 3).map((res) => (
                  <Link
                    key={res._id}
                    to={`/results/${res._id}`}
                    className="block p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">
                        {res.exam?.title || 'Examination'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          res.resultStatus === 'PASS'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}
                      >
                        {res.resultStatus}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Score: {res.totalScore} / {res.maxScore} ({res.percentage}%)</span>
                      <span>{new Date(res.submittedAt || res.startedAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {upcomingExams.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Upcoming Exams
              </h2>
              <div className="space-y-2">
                {upcomingExams.slice(0, 2).map((up) => (
                  <div key={up._id} className="p-3.5 rounded-xl bg-white border border-slate-200 text-xs shadow-sm">
                    <p className="font-semibold text-slate-700">{up.title}</p>
                    <p className="text-slate-500 mt-0.5">Opens: {new Date(up.startDate).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
