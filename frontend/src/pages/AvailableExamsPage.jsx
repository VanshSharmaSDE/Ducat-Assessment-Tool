import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import {
  BookOpen,
  Clock,
  Code2,
  Calendar,
  Award,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Check,
  RotateCw
} from 'lucide-react';

export default function AvailableExamsPage() {
  const [exams, setExams] = useState([]);
  const [filteredExams, setFilteredExams] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadExams = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/exams');
      const list = res.data.data.exams || [];
      setExams(list);
      setFilteredExams(list);
    } catch (err) {
      console.error('Error fetching exams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    let result = exams;

    if (searchTerm.trim()) {
      result = result.filter((e) =>
        e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'ACTIVE') {
        result = result.filter((e) => e.examStatus === 'ACTIVE');
      } else if (statusFilter === 'UPCOMING') {
        result = result.filter((e) => e.examStatus === 'UPCOMING');
      } else if (statusFilter === 'COMPLETED') {
        result = result.filter((e) => e.userStatus === 'COMPLETED');
      } else if (statusFilter === 'EXPIRED') {
        result = result.filter((e) => e.examStatus === 'EXPIRED');
      }
    }

    setFilteredExams(result);
  }, [searchTerm, statusFilter, exams]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Available Examinations</h1>
          <p className="text-sm text-slate-400 mt-1">
            Browse and participate in active coding assessments
          </p>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search assessments..."
              className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Now</option>
            <option value="UPCOMING">Upcoming</option>
            <option value="COMPLETED">My Completed</option>
            <option value="EXPIRED">Expired</option>
          </select>

          <button
            onClick={loadExams}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh Assessments"
          >
            <RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-sky-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Grid of Exam Cards */}
      {filteredExams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <BookOpen className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No examinations found</h3>
          <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => {
            const isActive = exam.examStatus === 'ACTIVE';
            const isCompleted = exam.userStatus === 'COMPLETED';
            const isInProgress = exam.userStatus === 'IN_PROGRESS';
            const isUpcoming = exam.examStatus === 'UPCOMING';
            const isExpired = exam.examStatus === 'EXPIRED';

            return (
              <div
                key={exam._id}
                className="flex flex-col justify-between rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 p-6 shadow-xl transition-all"
              >
                <div className="space-y-4">
                  {/* Status Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : isUpcoming
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {exam.examStatus}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300">
                      {exam.difficulty}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-lg text-white tracking-tight line-clamp-1">{exam.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {exam.description || 'Coding examination testing core problem solving.'}
                    </p>
                  </div>

                  {/* Attributes */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>{exam.duration} Minutes</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Code2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>{exam.questionCount} Questions</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Award className="w-3.5 h-3.5 text-slate-500" />
                      <span>{exam.totalMarks} Marks (Pass: {exam.passingMarks})</span>
                    </div>
                  </div>

                  {/* Schedule Timings */}
                  <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Starts:</span>
                      </span>
                      <span className="font-mono text-emerald-300 font-semibold">
                        {new Date(exam.startDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Expires:</span>
                      </span>
                      <span className="font-mono text-rose-300 font-semibold">
                        {new Date(exam.endDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  {isCompleted ? (
                    <Link
                      to={`/results/${exam.attemptId}`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700 transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>View My Result</span>
                    </Link>
                  ) : isInProgress ? (
                    <Link
                      to={`/exams/${exam._id}/take`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-amber-500 text-slate-950 text-xs font-bold hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20"
                    >
                      <span>Resume Attempt &rarr;</span>
                    </Link>
                  ) : isActive ? (
                    <Link
                      to={`/exams/${exam._id}/instructions`}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 transition-colors shadow-lg shadow-sky-600/20"
                    >
                      <span>Review Instructions & Start</span>
                    </Link>
                  ) : isUpcoming ? (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 text-slate-500 text-xs font-semibold cursor-not-allowed"
                    >
                      Opens on {new Date(exam.startDate).toLocaleDateString()}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-800/60 text-slate-500 text-xs font-semibold cursor-not-allowed"
                    >
                      Assessment Expired
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
