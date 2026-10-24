import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  Code2,
  Clock,
  Award,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Search,
  RotateCw,
  Sparkles,
  Layers,
  Terminal,
  FileCode,
  ShieldCheck,
  CheckSquare
} from 'lucide-react';

export default function PracticeExamsPage() {
  const [exams, setExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('ALL');

  const loadPracticeExams = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/exams/practice');
      const list = res.data.data.exams || [];
      setExams(list);
      setFilteredExams(list);
    } catch (err) {
      console.error('Failed to load practice exams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPracticeExams();
  }, []);

  useEffect(() => {
    let result = exams;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.description && e.description.toLowerCase().includes(q))
      );
    }

    if (difficultyFilter !== 'ALL') {
      result = result.filter((e) => e.difficulty === difficultyFilter);
    }

    setFilteredExams(result);
  }, [searchTerm, difficultyFilter, exams]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Practice Examinations
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Free interactive assessments to test the software, practice IDE shortcuts, and preview proctoring before real exams.
          </p>
        </div>

        {/* Refresh Action */}
        <button
          onClick={loadPracticeExams}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm self-start sm:self-center"
        >
          <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Information Banner (Resource Conservation Policy) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#4f6bf7]" />
            Unlimited Practice with Daily Resource Conservation
          </span>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-300 font-semibold bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            Rate Limit: Max 2 Attempts / Day per Test
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          You can attempt practice tests again and again without any long-term limit. To prevent server overload and conserve Docker execution resources, each test allows up to <strong>2 attempts per calendar day</strong>. All completed practice submissions appear in your <strong>My Results</strong> section with full Docker test evaluation breakdowns and PDF scorecards.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search practice exams by title or topic..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] shadow-sm transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] shadow-sm"
          >
            <option value="ALL">All Difficulties</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </select>
        </div>
      </div>

      {/* Practice Exam Cards Grid */}
      {filteredExams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 shadow-sm space-y-3">
          <Code2 className="w-12 h-12 mx-auto text-slate-400 dark:text-slate-500" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">No practice tests match your search</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try resetting your search query or difficulty filters to see all available practice sets.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredExams.map((exam) => {
            const attemptsToday = exam.attemptsToday || 0;
            const maxDailyAttempts = exam.maxDailyAttempts || 2;
            const attemptsRemaining = exam.attemptsRemainingToday ?? Math.max(0, maxDailyAttempts - attemptsToday);
            const isLimitReached = exam.userStatus === 'LIMIT_REACHED' || attemptsToday >= maxDailyAttempts;
            const isInProgress = exam.userStatus === 'IN_PROGRESS';

            return (
              <div
                key={exam._id}
                className="bg-white dark:bg-slate-900 border border-slate-200 hover:border-slate-300 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-5"
              >
                <div className="space-y-3">
                  {/* Top Tags */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        PRACTICE TEST
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {exam.difficulty}
                      </span>
                    </div>

                    {/* Rate Limit Status Badge */}
                    <span
                      className={`text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-lg border ${
                        isInProgress
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : isLimitReached
                          ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                          : attemptsToday > 0
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}
                    >
                      {isInProgress
                        ? 'Session in Progress'
                        : isLimitReached
                        ? 'Daily Limit: 2/2 Used Today'
                        : `${attemptsRemaining} of ${maxDailyAttempts} attempts left today`}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                      {exam.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {exam.description}
                    </p>
                  </div>

                  {/* Specs List */}
                  <div className="grid grid-cols-3 gap-2 py-2 text-xs border-y border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Duration</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        {exam.duration} mins
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Problems</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                        <Code2 className="w-3.5 h-3.5 text-blue-600" />
                        {exam.questionCount} Questions
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-semibold">Marks</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1 mt-0.5">
                        <Award className="w-3.5 h-3.5 text-blue-600" />
                        {exam.totalMarks} (Pass: {exam.passingMarks})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
                  {exam.attemptId && (
                    <Link
                      to={`/results/${exam.attemptId}`}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1 self-start sm:self-center"
                    >
                      <span>View Previous Result</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    {isInProgress ? (
                      <Link
                        to={`/exams/${exam._id}/take`}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>Resume Practice</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    ) : isLimitReached ? (
                      <button
                        disabled
                        className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-semibold text-xs cursor-not-allowed border border-slate-200 dark:border-slate-700"
                        title="You have taken this test 2 times today. Limit resets tomorrow."
                      >
                        Daily Limit Reached (2/2)
                      </button>
                    ) : (
                      <Link
                        to={`/exams/${exam._id}/instructions`}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#4f6bf7] hover:bg-[#3b5bf6] text-white font-semibold text-xs shadow-md shadow-[#4f6bf7]/20 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span>{attemptsToday > 0 ? 'Practice Again' : 'Start Practice Test'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
