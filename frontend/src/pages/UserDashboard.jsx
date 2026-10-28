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
  Sparkles,
  HelpCircle,
  FlaskConical
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

  const availableCount = exams.filter(
    (e) => (e.examStatus === 'ACTIVE' || e.examStatus === 'UPCOMING') && e.userStatus !== 'COMPLETED'
  ).length;
  const activeAndUpcomingExams = exams
    .filter((e) => e.examStatus === 'ACTIVE' || e.examStatus === 'UPCOMING')
    .sort((a, b) => {
      if (a.examStatus === 'ACTIVE' && b.examStatus !== 'ACTIVE') return -1;
      if (b.examStatus === 'ACTIVE' && a.examStatus !== 'ACTIVE') return 1;
      return new Date(a.startDate) - new Date(b.startDate);
    });

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
      <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 w-full">
          <div className="max-w-3xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            {(user?.studentId || user?.rollNumber) && (
              <p className="mt-1 text-xs font-mono text-[#4f6bf7] font-semibold">
                Student ID: {user?.studentId || user?.rollNumber}
              </p>
            )}
            <p className="mt-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
              Ready for your next coding examination? Check available tests below. Remember that code execution runs automatically against rigorous test cases upon submission.
            </p>
          </div>

          {/* Action buttons in a straight horizontal line */}
          <div className="mt-6 flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 scrollbar-none flex-nowrap">
            <Link
              to="/exams"
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-[#4f6bf7] hover:bg-[#3b5bf6] text-white font-semibold text-xs sm:text-sm shadow-md shadow-[#4f6bf7]/25 transition-all"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Active Exams ({availableCount})</span>
            </Link>
            <Link
              to="/practice"
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-semibold text-xs sm:text-sm transition-all shadow-sm"
            >
              <FlaskConical className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Practice Tests</span>
            </Link>
            <Link
              to="/results"
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-all shadow-sm"
            >
              <Award className="w-4 h-4 text-[#4f6bf7]" />
              <span>View Past Results</span>
            </Link>
            <Link
              to="/faq"
              className="shrink-0 whitespace-nowrap inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs sm:text-sm transition-all shadow-sm"
            >
              <HelpCircle className="w-4 h-4 text-[#4f6bf7]" />
              <span>Instructions & FAQ</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* Left Column: Available Exams */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Scheduled Assessments</h2>
            </div>
            <Link to="/exams" className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1">
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 flex flex-col space-y-3 min-h-[460px]">
            {activeAndUpcomingExams.length === 0 ? (
              <div className="flex-1 min-h-[440px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-8 sm:p-12 flex flex-col items-center justify-center text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center mb-4 text-[#4f6bf7]">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  No assessments scheduled right now
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2 leading-relaxed">
                  There are no live or upcoming exams scheduled for your batch at this moment. You can practice in the sandbox environment anytime or explore the full exam schedule.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to="/practice"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <FlaskConical className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Launch Practice Sandbox</span>
                  </Link>
                  <Link
                    to="/exams"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                  >
                    <span>Browse All Exams</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              activeAndUpcomingExams
                .slice(0, 4)
                .map((exam) => {
                  const isActive = exam.examStatus === 'ACTIVE';
                  const isUpcoming = exam.examStatus === 'UPCOMING';

                  return (
                    <div
                      key={exam._id}
                      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 dark:text-slate-100 text-base truncate">{exam.title}</span>
                          {isActive ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ACTIVE
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              UPCOMING
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {exam.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{exam.description}</p>
                        <div className="flex items-center gap-3 flex-wrap text-[11px] pt-1">
                          <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                            Starts: {new Date(exam.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                          <span className="text-slate-300 dark:text-slate-600">•</span>
                          <span className="font-mono text-rose-600 dark:text-rose-400 font-medium">
                            Expires: {new Date(exam.endDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {exam.duration} mins
                          </span>
                          <span className="flex items-center gap-1">
                            <Code2 className="w-3.5 h-3.5 text-slate-400" />
                            {exam.questionCount} Questions
                          </span>
                          <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300">
                            Total: {exam.totalMarks} Marks
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {exam.userStatus === 'COMPLETED' ? (
                          <Link
                            to={exam.attemptId ? `/results/${exam.attemptId}` : '/results'}
                            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors"
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
                        ) : isUpcoming ? (
                          <Link
                            to={`/exams/${exam._id}/instructions`}
                            className="px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors"
                          >
                            View Details
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
                  );
                })
            )}
          </div>
        </div>

        {/* Right Column: Recent Results & Upcoming */}
        <div className="space-y-6">
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              Recent Attempts
            </h2>

            {results.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500 dark:text-slate-400 shadow-sm">
                You have not completed any examinations yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {results.slice(0, 3).map((res) => (
                  <Link
                    key={res._id}
                    to={`/results/${res._id}`}
                    className="block p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[160px]">
                        {res.exam?.title || 'Examination'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {res.exam?.isPractice && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            PRACTICE
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            res.resultStatus === 'PASS'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          }`}
                        >
                          {res.resultStatus}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Score: {res.totalScore} / {res.maxScore} ({res.percentage}%)</span>
                      <span>{new Date(res.submittedAt || res.startedAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Guide & Rules Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
              Examination Rules & Guide
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              New to CodeAssess? Review fullscreen proctoring, anti-cheating policies, and Docker execution scoring rules before starting any assessment.
            </p>
            <Link
              to="/faq"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4f6bf7] hover:underline pt-0.5"
            >
              <span>View Instructions & FAQ</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Practice Sandbox Card */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-600" />
                Practice Sandbox
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                5 Tests Available
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Test your code in the real IDE sandbox and experience automated grading before your actual examinations.
            </p>
            <Link
              to="/practice"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline pt-0.5"
            >
              <span>Explore Practice Tests</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
