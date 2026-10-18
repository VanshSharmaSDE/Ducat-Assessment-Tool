import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { useNotification } from '../../context/NotificationContext';
import {
  MessageSquare,
  LifeBuoy,
  Users,
  GraduationCap,
  Shield,
  Search,
  Filter,
  RotateCw,
  Plus,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  ChevronRight,
  User,
  Building2,
  FolderTree,
  Tag,
  Check,
} from 'lucide-react';

export default function AdminQueriesPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { setActiveQueryId, unreadQueryIds, markAsRead, fetchUnreadCount } = useNotification();
  const [searchParams] = useSearchParams();
  const isAdmin = user?.role === 'ADMIN';

  // Active Tab: 'student' | 'faculty' (for Admin) OR 'student' | 'my_admin_queries' (for Faculty)
  const [activeTab, setActiveTab] = useState('student');
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Active Discussion Drawer/Modal
  const [activeQuery, setActiveQuery] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');

  // Real-time Chat Helpers
  const messagesEndRef = useRef(null);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Faculty: Create New Query to Admin Modal
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [facSubject, setFacSubject] = useState('');
  const [facCategory, setFacCategory] = useState('TECHNICAL_SUPPORT');
  const [facPriority, setFacPriority] = useState('MEDIUM');
  const [facMessage, setFacMessage] = useState('');
  const [facSubmitting, setFacSubmitting] = useState(false);
  const [facError, setFacError] = useState('');

  // Refresh unread count on mounting this page
  useEffect(() => {
    if (fetchUnreadCount) fetchUnreadCount();
  }, []);

  // Handle URL deep-link to directly open a ticket from notifications
  useEffect(() => {
    const qId = searchParams.get('queryId');
    if (qId && queries.length > 0) {
      const match = queries.find((q) => q._id === qId);
      if (match) {
        handleOpenQuery(match);
      }
    }
  }, [searchParams, queries]);

  // Join/leave real-time chat room for the open query
  useEffect(() => {
    if (!socket || !activeQuery?._id) return;
    socket.emit('query:join', activeQuery._id);
    setActiveQueryId(activeQuery._id);

    return () => {
      socket.emit('query:leave', activeQuery._id);
      setActiveQueryId(null);
    };
  }, [socket, activeQuery?._id]);

  // Auto-scroll chat to the bottom on new message
  useEffect(() => {
    if (activeQuery?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeQuery?.messages?.length]);

  // Real-time socket message & query listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (data) => {
      const { queryId, message, query: updatedQuery, status } = data;

      // 1. If currently inside this conversation, append the message
      setActiveQuery((prev) => {
        if (!prev || String(prev._id) !== String(queryId)) return prev;
        const exists = prev.messages?.some(
          (m) =>
            (m._id && message._id && String(m._id) === String(message._id)) ||
            (m.createdAt === message.createdAt && m.message === message.message)
        );
        if (exists) return prev;
        return {
          ...prev,
          status: status || prev.status,
          messages: [...(prev.messages || []), message],
        };
      });

      // 2. Update list of queries on the left & move to top
      setQueries((prev) => {
        const idx = prev.findIndex((q) => String(q._id) === String(queryId));
        if (idx === -1) {
          if (updatedQuery) return [updatedQuery, ...prev];
          return prev;
        }
        const target = prev[idx];
        const exists = target.messages?.some(
          (m) =>
            (m._id && message._id && String(m._id) === String(message._id)) ||
            (m.createdAt === message.createdAt && m.message === message.message)
        );
        const updated = {
          ...target,
          status: status || target.status,
          updatedAt: new Date().toISOString(),
          messages: exists ? target.messages : [...(target.messages || []), message],
        };
        const rest = prev.filter((_, i) => i !== idx);
        return [updated, ...rest];
      });
    };

    const handleQueryCreated = (newQuery) => {
      setQueries((prev) => {
        if (prev.some((q) => String(q._id) === String(newQuery._id))) return prev;
        return [newQuery, ...prev];
      });
    };

    const handleQueryUpdated = (updatedQuery) => {
      setQueries((prev) => {
        const idx = prev.findIndex((q) => String(q._id) === String(updatedQuery._id));
        if (idx === -1) return prev;
        const copy = [...prev];
        copy[idx] = updatedQuery;
        return copy;
      });
      setActiveQuery((prev) => {
        if (!prev || String(prev._id) !== String(updatedQuery._id)) return prev;
        return updatedQuery;
      });
    };

    const handleTyping = (data) => {
      if (activeQuery?._id && String(data.queryId) === String(activeQuery._id)) {
        if (data.isTyping) {
          setTypingUser(data.userName);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => {
            setTypingUser(null);
          }, 2500);
        } else {
          setTypingUser(null);
        }
      }
    };

    socket.on('support:message_received', handleMessageReceived);
    socket.on('support:query_created', handleQueryCreated);
    socket.on('support:query_updated', handleQueryUpdated);
    socket.on('query:typing', handleTyping);

    return () => {
      socket.off('support:message_received', handleMessageReceived);
      socket.off('support:query_created', handleQueryCreated);
      socket.off('support:query_updated', handleQueryUpdated);
      socket.off('query:typing', handleTyping);
    };
  }, [socket, activeQuery?._id]);

  useEffect(() => {
    loadQueries();
  }, [activeTab, statusFilter, priorityFilter]);

  const loadQueries = async () => {
    try {
      setRefreshing(true);
      let res;

      if (isAdmin) {
        // Admin gets either all, student queries, or faculty queries
        res = await api.get('/support/admin/queries', {
          params: {
            tab: activeTab === 'faculty' ? 'faculty' : 'student',
            status: statusFilter,
            priority: priorityFilter,
            search: searchTerm,
          },
        });
      } else {
        // Faculty gets either student queries assigned to them, or their own queries to Admin
        if (activeTab === 'student') {
          res = await api.get('/support/faculty/student-queries', {
            params: { status: statusFilter, search: searchTerm },
          });
        } else {
          res = await api.get('/support/faculty/my-queries', {
            params: { status: statusFilter, search: searchTerm },
          });
        }
      }

      const list = res.data.data?.queries || [];
      setQueries(list);

      // Keep activeQuery in sync
      if (activeQuery) {
        const found = list.find((q) => q._id === activeQuery._id);
        if (found) {
          setActiveQuery(found);
          setSelectedStatus(found.status);
        }
      }
    } catch (err) {
      console.error('Failed to load queries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQueries();
  };

  const handleOpenQuery = (q) => {
    setActiveQuery(q);
    setSelectedStatus(q.status);
    setResolutionNotes(q.resolutionNotes || '');
    setReplyMessage('');
    if (q?._id) {
      setActiveQueryId(q._id);
      if (markAsRead) markAsRead(q._id);
    }
  };

  // Reply handler
  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() && !selectedStatus) return;

    try {
      setSendingReply(true);
      let res;

      if (isAdmin) {
        res = await api.post(`/support/admin/queries/${activeQuery._id}/reply`, {
          message: replyMessage.trim() || `Status updated to ${selectedStatus}`,
          status: selectedStatus || undefined,
          resolutionNotes: selectedStatus === 'RESOLVED' ? resolutionNotes.trim() : undefined,
        });
      } else {
        // Faculty replying
        res = await api.post(`/support/faculty/queries/${activeQuery._id}/reply`, {
          message: replyMessage.trim() || `Status updated to ${selectedStatus}`,
          status: selectedStatus || undefined,
          resolutionNotes: selectedStatus === 'RESOLVED' ? resolutionNotes.trim() : undefined,
        });
      }

      setReplyMessage('');
      if (res.data?.data?.query) {
        setActiveQuery(res.data.data.query);
      }
      loadQueries();
    } catch (err) {
      console.error('Failed to send reply:', err);
    } finally {
      setSendingReply(false);
    }
  };

  // Faculty: Create Query to Admin
  const handleFacultySubmit = async (e) => {
    e.preventDefault();
    if (!facSubject.trim() || !facMessage.trim()) {
      setFacError('Subject and message are required.');
      return;
    }

    try {
      setFacSubmitting(true);
      setFacError('');
      const res = await api.post('/support/faculty/query', {
        subject: facSubject.trim(),
        category: facCategory,
        priority: facPriority,
        message: facMessage.trim(),
      });

      setShowFacultyModal(false);
      setFacSubject('');
      setFacMessage('');
      setFacCategory('TECHNICAL_SUPPORT');
      setFacPriority('MEDIUM');

      await loadQueries();
      if (res.data?.data?.query) {
        handleOpenQuery(res.data.data.query);
      }
    } catch (err) {
      setFacError(err.response?.data?.message || 'Failed to submit query to administration.');
    } finally {
      setFacSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
            Open
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
            In Progress
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'URGENT':
        return <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800/60">URGENT</span>;
      case 'HIGH':
        return <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/60">HIGH</span>;
      case 'MEDIUM':
        return <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">MEDIUM</span>;
      default:
        return <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">LOW</span>;
    }
  };

  const totalCount = queries.length;
  const openCount = queries.filter((q) => q.status === 'OPEN' || q.status === 'IN_PROGRESS').length;
  const resolvedCount = queries.filter((q) => q.status === 'RESOLVED').length;

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-7 h-7 text-[#4f6bf7]" />
            {isAdmin ? 'Queries Management' : 'Queries & Support'}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {isAdmin
              ? 'Manage and resolve student queries, review faculty requests, and monitor all support channels.'
              : 'Answer queries from your enrolled students and raise requests directly to the administration.'}
          </p>
        </div>

        {!isAdmin && (
          <button
            onClick={() => setShowFacultyModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4f6bf7] hover:bg-[#3f57d6] text-white text-xs font-bold rounded-xl shadow-md shadow-[#4f6bf7]/20 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Raise Query to Admin</span>
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => {
            setActiveTab('student');
            setActiveQuery(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'student'
              ? 'bg-[#4f6bf7] text-white shadow-md shadow-[#4f6bf7]/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800/60'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isAdmin ? 'Student Queries (All)' : 'My Students Queries'}</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('faculty');
            setActiveQuery(null);
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'faculty'
              ? 'bg-[#4f6bf7] text-white shadow-md shadow-[#4f6bf7]/20'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white dark:hover:bg-slate-800/60'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>{isAdmin ? 'Faculty Queries to Admin' : 'My Queries to Admin'}</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total in View</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#4f6bf7] dark:text-blue-400 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Pending / In Progress</p>
            <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{openCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Resolved</p>
            <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">{resolvedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ticket ID, subject, student name, or category..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
          />
        </form>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7]"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {isAdmin && (
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7]"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          )}

          <button
            onClick={loadQueries}
            disabled={refreshing}
            className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
            title="Refresh Queries"
          >
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#4f6bf7]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Ticket List & Discussion Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Queries List Column: Persistent 5 columns on desktop */}
        <div className={`lg:col-span-5 ${activeQuery ? 'hidden lg:block' : 'block'} space-y-3`}>
          <div className="h-[750px] overflow-y-auto space-y-3 pr-1.5 scrollbar-thin">
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 border-3 border-[#4f6bf7] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading queries...</p>
            </div>
          ) : queries.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-3">
              <MessageSquare className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No queries found</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                {activeTab === 'student'
                  ? 'No student support queries currently match your selected filters.'
                  : 'No faculty queries currently found.'}
              </p>
            </div>
          ) : (
            queries.map((q) => {
              const isSelected = activeQuery?._id === q._id;
              const lastMsg = q.messages && q.messages.length > 0 ? q.messages[q.messages.length - 1] : null;

              return (
                <div
                  key={q._id}
                  onClick={() => handleOpenQuery(q)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/50 dark:bg-blue-950/40 border-[#4f6bf7] shadow-sm'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-[#4f6bf7] dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">
                        {q.ticketId}
                      </span>
                      {getPriorityBadge(q.priority)}
                      {unreadQueryIds?.has(q._id) && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse shadow-sm shadow-rose-500/40">
                          NEW
                        </span>
                      )}
                    </div>
                    {getStatusBadge(q.status)}
                  </div>

                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 tracking-tight mt-2 line-clamp-1">
                    {q.subject}
                  </h3>

                  {/* Student or Faculty Info Banner */}
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    {q.type === 'STUDENT_QUERY' && q.student ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        <User className="w-3 h-3 text-[#4f6bf7] dark:text-blue-400" />
                        <span>{q.student.name} ({q.student.studentId || q.student.rollNumber || 'ID N/A'})</span>
                      </span>
                    ) : q.faculty ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                        <GraduationCap className="w-3 h-3 text-[#4f6bf7] dark:text-blue-400" />
                        <span>{q.faculty.name} ({q.faculty.organization || 'Faculty'})</span>
                      </span>
                    ) : null}

                    {q.category && (
                      <span className="text-[10px] text-slate-400 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 px-1.5 py-0.5 rounded">
                        {q.category}
                      </span>
                    )}
                  </div>

                  {lastMsg && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-2">
                      <strong className="text-slate-700 dark:text-slate-300">{lastMsg.senderName}:</strong> {lastMsg.message}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span>{q.messages?.length || 0} message(s)</span>
                    <span>{new Date(q.updatedAt || q.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

        {/* Discussion & Resolution Column: Always 7 columns on desktop */}
        <div className={`lg:col-span-7 ${!activeQuery ? 'hidden lg:block' : 'block'}`}>
          {activeQuery ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col h-[750px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex items-start justify-between gap-3 shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-[#4f6bf7] dark:text-blue-400 bg-blue-100/70 dark:bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">
                    {activeQuery.ticketId}
                  </span>
                  {getStatusBadge(activeQuery.status)}
                  {getPriorityBadge(activeQuery.priority)}
                </div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 mt-1 truncate">{activeQuery.subject}</h2>

                {activeQuery.type === 'STUDENT_QUERY' && activeQuery.student && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Student: <strong className="text-slate-800 dark:text-slate-200">{activeQuery.student.name}</strong> • Roll/ID:{' '}
                    <strong className="text-slate-700 dark:text-slate-300">{activeQuery.student.studentId || activeQuery.student.rollNumber || 'N/A'}</strong>
                    {activeQuery.student.batch ? ` • Batch: ${activeQuery.student.batch}` : ''}
                    {activeQuery.student.organization ? ` • Org: ${activeQuery.student.organization}` : ''}
                  </p>
                )}

                {activeQuery.type === 'FACULTY_QUERY' && activeQuery.faculty && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Faculty: <strong className="text-slate-800 dark:text-slate-200">{activeQuery.faculty.name}</strong> • Email:{' '}
                    <strong className="text-slate-700 dark:text-slate-300">{activeQuery.faculty.email}</strong>
                    {activeQuery.faculty.organization ? ` • Org: ${activeQuery.faculty.organization}` : ''}
                  </p>
                )}
              </div>

              <button
                onClick={() => setActiveQuery(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close discussion view"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Management Quick Bar */}
            <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-300">Ticket Status:</span>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-[#4f6bf7]"
                >
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="RESOLVED">Resolved</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>

              {selectedStatus === 'RESOLVED' && (
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Resolution summary notes for student/faculty..."
                    className="w-full px-2.5 py-1 text-xs bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 rounded-lg text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            {/* Resolution Banner if query is resolved */}
            {activeQuery.status === 'RESOLVED' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">This query is marked as Resolved.</strong>
                  {activeQuery.resolutionNotes && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">{activeQuery.resolutionNotes}</p>
                  )}
                </div>
              </div>
            )}

            {/* Conversation Messages */}
            <div className="flex-1 p-4 space-y-3.5 overflow-y-auto overflow-x-hidden bg-slate-50/40 dark:bg-slate-950/40">
              {activeQuery.messages && activeQuery.messages.map((m, idx) => {
                const isCurrentUser = String(m.sender) === String(user?._id);

                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'} max-w-full`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mb-1 px-1">
                      {isCurrentUser ? (
                        <>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <strong className="text-slate-700 dark:text-slate-300">You ({m.senderName})</strong>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 font-bold text-[#4f6bf7] dark:text-blue-400">
                            {m.senderRole === 'ADMIN' ? (
                              <Shield className="w-3 h-3 text-rose-500" />
                            ) : m.senderRole === 'FACULTY' ? (
                              <GraduationCap className="w-3 h-3 text-amber-500" />
                            ) : (
                              <User className="w-3 h-3 text-[#4f6bf7] dark:text-blue-400" />
                            )}
                            <span>{m.senderName} ({m.senderRole})</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed break-words break-all [overflow-wrap:anywhere] ${
                        isCurrentUser
                          ? 'bg-[#4f6bf7] text-white rounded-tr-none shadow-sm shadow-[#4f6bf7]/15'
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words break-all [overflow-wrap:anywhere]">{m.message}</p>
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {typingUser && (
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 italic px-2 py-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-[#4f6bf7] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#4f6bf7] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-[#4f6bf7] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <span>{typingUser} is typing...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="p-3.5 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-3 shrink-0">
              <div className="flex-1 relative">
                <textarea
                  rows={1}
                  value={replyMessage}
                  onChange={(e) => {
                    setReplyMessage(e.target.value);
                    if (socket && activeQuery?._id) {
                      socket.emit('query:typing', { queryId: activeQuery._id, isTyping: true });
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e);
                    }
                  }}
                  placeholder={`Write reply to ${activeQuery.type === 'STUDENT_QUERY' ? 'student' : 'faculty'} / post status update... (Press Enter to send)`}
                  className="w-full h-[46px] min-h-[46px] max-h-32 py-3 px-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none leading-normal transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={sendingReply || (!replyMessage.trim() && selectedStatus === activeQuery.status)}
                className="h-[46px] px-5 bg-[#4f6bf7] hover:bg-[#3f57d6] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#4f6bf7]/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{sendingReply ? 'Saving...' : 'Send / Update'}</span>
              </button>
            </form>
          </div>
        ) : (
          /* Dedicated Workspace Overview & Empty State Panel when no query is selected */
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm p-8 h-[750px] flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 rounded-3xl bg-blue-50 dark:bg-blue-950/60 text-[#4f6bf7] flex items-center justify-center shadow-inner border border-blue-100 dark:border-blue-900/50">
              <MessageSquare className="w-10 h-10" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
                Query Resolution Workspace
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Select a support ticket from the list on the left to inspect requester details, review message history, and reply in real time.
              </p>
            </div>

            {/* Quick Telemetry Cards */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-sm pt-2">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Scope</span>
                <span className="text-lg font-black text-slate-800 dark:text-slate-100">{totalCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Pending</span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">{openCount}</span>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Resolved</span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">{resolvedCount}</span>
              </div>
            </div>

            {/* Faculty Action or Real-time hint */}
            {!isAdmin ? (
              <button
                onClick={() => setShowFacultyModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#4f6bf7] hover:bg-[#3f57d6] text-white text-xs font-bold rounded-xl shadow-md shadow-[#4f6bf7]/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Raise New Query to Administration</span>
              </button>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Live socket synchronization active. New queries will appear automatically.</span>
              </div>
            )}
          </div>
        )}
        </div>
      </div>

      {/* Faculty Modal: Raise Query to Admin */}
      {showFacultyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
                <GraduationCap className="w-5 h-5 text-[#4f6bf7]" />
                <span>Raise Query to Administration</span>
              </div>
              <button
                onClick={() => setShowFacultyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {facError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{facError}</span>
              </div>
            )}

            <form onSubmit={handleFacultySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={facSubject}
                  onChange={(e) => setFacSubject(e.target.value)}
                  placeholder="E.g. Request for additional batch allocation / Exam schedule change"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={facCategory}
                    onChange={(e) => setFacCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-700 dark:text-slate-200"
                  >
                    <option value="EXAM_MANAGEMENT">Exam Creation / Scheduling</option>
                    <option value="BATCH_ALLOCATION">Batch & Technology Allocation</option>
                    <option value="STUDENT_ENROLLMENT">Candidate Import & Enrolment</option>
                    <option value="TECHNICAL_SUPPORT">Technical / System Issue</option>
                    <option value="OTHER">Other Administrative Query</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={facPriority}
                    onChange={(e) => setFacPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-700 dark:text-slate-200"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Query Details / Description *
                </label>
                <textarea
                  rows={4}
                  required
                  value={facMessage}
                  onChange={(e) => setFacMessage(e.target.value)}
                  placeholder="Detail your request for the platform administrators..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFacultyModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={facSubmitting}
                  className="px-5 py-2 bg-[#4f6bf7] hover:bg-[#3f57d6] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-[#4f6bf7]/20 transition-all cursor-pointer"
                >
                  {facSubmitting ? 'Submitting...' : 'Submit to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
