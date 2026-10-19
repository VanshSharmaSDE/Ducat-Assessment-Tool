import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useNotification } from '../context/NotificationContext';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Send,
  User,
  Shield,
  GraduationCap,
  ChevronRight,
  X,
  RotateCw,
  Tag,
  Paperclip,
} from 'lucide-react';

export default function StudentSupportPage() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { setActiveQueryId, unreadQueryIds, markAsRead, fetchUnreadCount } = useNotification();
  const [searchParams] = useSearchParams();

  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Ticket Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState('EXAM_ISSUE');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  // Selected Active Query Conversation
  const [activeQuery, setActiveQuery] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // Real-time Chat Helpers
  const messagesEndRef = useRef(null);
  const [typingUser, setTypingUser] = useState(null);
  const typingTimeoutRef = useRef(null);

  const handleSelectQuery = (q) => {
    setActiveQuery(q);
    setReplyMessage('');
    if (q?._id) {
      setActiveQueryId(q._id);
      if (markAsRead) markAsRead(q._id);
    }
  };

  // Refresh unread count on mount
  useEffect(() => {
    if (fetchUnreadCount) fetchUnreadCount();
  }, []);

  // Deep-link from notification toast
  useEffect(() => {
    const qId = searchParams.get('queryId');
    if (qId && queries.length > 0) {
      const match = queries.find((q) => q._id === qId);
      if (match) {
        handleSelectQuery(match);
      }
    }
  }, [searchParams, queries]);

  // Join/leave real-time query chat room
  useEffect(() => {
    if (!socket || !activeQuery?._id) return;

    const joinRoom = () => {
      socket.emit('query:join', activeQuery._id);
    };

    joinRoom();
    socket.on('connect', joinRoom);
    setActiveQueryId(activeQuery._id);

    return () => {
      socket.off('connect', joinRoom);
      socket.emit('query:leave', activeQuery._id);
      setActiveQueryId(null);
    };
  }, [socket, activeQuery?._id]);

  // Auto-scroll chat on new message
  useEffect(() => {
    if (activeQuery?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeQuery?.messages?.length]);

  // Real-time message & query socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleMessageReceived = (data) => {
      const { queryId, message, query: updatedQuery, status } = data;

      // 1. If viewing this conversation, append new message
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

      // 2. Update queries list on the left & bump to top
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
      if (
        (newQuery.student?._id && String(newQuery.student._id) === String(user?._id)) ||
        String(newQuery.student) === String(user?._id)
      ) {
        setQueries((prev) => {
          if (prev.some((q) => String(q._id) === String(newQuery._id))) return prev;
          return [newQuery, ...prev];
        });
      }
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
  }, [socket, activeQuery?._id, user?._id]);

  useEffect(() => {
    loadQueries();
  }, [statusFilter]);

  const loadQueries = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/support/student/queries', {
        params: { status: statusFilter, search: searchTerm },
      });
      const list = res.data.data?.queries || [];
      setQueries(list);
      // Keep activeQuery in sync if currently viewing one
      if (activeQuery) {
        const updated = list.find((q) => q._id === activeQuery._id);
        if (updated) setActiveQuery(updated);
      }
    } catch (err) {
      console.error('Failed to load student queries:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadQueries();
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!newSubject.trim() || !newMessage.trim()) {
      setCreateError('Subject and detailed message are required.');
      return;
    }

    try {
      setSubmitting(true);
      setCreateError('');
      const res = await api.post('/support/student/query', {
        subject: newSubject.trim(),
        category: newCategory,
        priority: newPriority,
        message: newMessage.trim(),
      });

      setShowCreateModal(false);
      setNewSubject('');
      setNewMessage('');
      setNewCategory('EXAM_ISSUE');
      setNewPriority('MEDIUM');

      await loadQueries();
      if (res.data?.data?.query) {
        setActiveQuery(res.data.data.query);
      }
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to submit support query.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !activeQuery) return;

    try {
      setSendingReply(true);
      const res = await api.post(`/support/student/queries/${activeQuery._id}/reply`, {
        message: replyMessage.trim(),
      });
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

  // Status Badge Helper
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
            Student Helpdesk & Support
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Ask queries to your faculty instructor or administrator regarding exams, submissions, and account access.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#4f6bf7] hover:bg-[#3f57d6] text-white text-xs font-bold rounded-xl shadow-md shadow-[#4f6bf7]/20 transition-all cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Support Query</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Queries</p>
            <p className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 mt-1">{totalCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#4f6bf7] dark:text-blue-400 flex items-center justify-center">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Active / Pending</p>
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by ticket ID, subject, or category..."
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

          <button
            onClick={loadQueries}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            title="Refresh"
          > Refresh
            <RotateCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#4f6bf7]' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Layout: List & Active Thread */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ticket List (Left / Main) */}
        <div className={`${activeQuery ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
          {loading ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-7 h-7 border-3 border-[#4f6bf7] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Loading your queries...</p>
            </div>
          ) : queries.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 space-y-3">
              <LifeBuoy className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No support queries found</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
                Have a question or facing an issue with an exam or your account? Click "New Support Query" above to get assistance.
              </p>
            </div>
          ) : (
            queries.map((q) => {
              const isSelected = activeQuery?._id === q._id;
              const lastMsg = q.messages && q.messages.length > 0 ? q.messages[q.messages.length - 1] : null;

              return (
                <div
                  key={q._id}
                  onClick={() => handleSelectQuery(q)}
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

                  {lastMsg && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-normal">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{lastMsg.senderName}:</span> {lastMsg.message}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 pt-3 mt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <GraduationCap className="w-3.5 h-3.5 text-[#4f6bf7] dark:text-blue-400" />
                      <span>{q.assignedTo ? q.assignedTo.name : 'Faculty Assigned'}</span>
                    </span>
                    <span>{new Date(q.updatedAt || q.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Conversation Thread (Right Side) */}
        {activeQuery && (
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-[650px] overflow-hidden">
            {/* Thread Header */}
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
                <p className="text-[11px] text-slate-400 dark:text-slate-400">
                  Category: <strong className="text-slate-600 dark:text-slate-300">{activeQuery.category}</strong> • Handled by:{' '}
                  <strong className="text-slate-600 dark:text-slate-300">{activeQuery.assignedTo?.name || 'Assigned Instructor'}</strong>
                </p>
              </div>

              <button
                onClick={() => setActiveQuery(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Close discussion view"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resolution Banner if query is resolved */}
            {activeQuery.status === 'RESOLVED' && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-start gap-2.5 shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">This query was marked as Resolved.</strong>
                  {activeQuery.resolutionNotes && (
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">{activeQuery.resolutionNotes}</p>
                  )}
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">If you still require help, reply below to reopen this ticket.</p>
                </div>
              </div>
            )}

            {/* Message History */}
            <div className="flex-1 p-4 space-y-3.5 overflow-y-auto overflow-x-hidden bg-slate-50/40 dark:bg-slate-950/40">
              {activeQuery.messages && activeQuery.messages.map((m, idx) => {
                const isStudent = m.senderRole === 'USER';

                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isStudent ? 'items-end' : 'items-start'} max-w-full`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 mb-1 px-1">
                      {isStudent ? (
                        <>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <strong className="text-slate-700 dark:text-slate-300">You ({m.senderName})</strong>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 font-bold text-[#4f6bf7] dark:text-blue-400">
                            {m.senderRole === 'ADMIN' ? (
                              <Shield className="w-3 h-3 text-rose-500" />
                            ) : (
                              <GraduationCap className="w-3 h-3 text-amber-500" />
                            )}
                            <span>{m.senderName} ({m.senderRole === 'ADMIN' ? 'Admin' : 'Faculty'})</span>
                          </div>
                          <span>•</span>
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed break-words break-all [overflow-wrap:anywhere] ${
                        isStudent
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
                  placeholder="Type your response to instructor / admin... (Press Enter to send)"
                  className="w-full h-[46px] min-h-[46px] max-h-32 py-3 px-3.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none leading-normal transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={sendingReply || !replyMessage.trim()}
                className="h-[46px] px-5 bg-[#4f6bf7] hover:bg-[#3f57d6] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-[#4f6bf7]/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
                <span>{sendingReply ? 'Sending...' : 'Reply'}</span>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* New Query Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-slate-800 dark:text-slate-100 font-bold text-base">
                <LifeBuoy className="w-5 h-5 text-[#4f6bf7]" />
                <span>Create Support Query</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTicket} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="E.g. Unable to start exam / Question 2 test case issue"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-700 dark:text-slate-200"
                  >
                    <option value="EXAM_ISSUE">Examination Issue</option>
                    <option value="CODE_EXECUTION">Code Runner / Compiler</option>
                    <option value="ACCOUNT_LOGIN">Account & Session</option>
                    <option value="BATCH_SCHEDULE">Batch & Timings</option>
                    <option value="RESULTS_MARKS">Results & Grading</option>
                    <option value="OTHER">Other Query</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-700 dark:text-slate-200"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent (Live Test)</option>
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
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Describe your issue or question clearly so your instructor can assist you quickly..."
                  className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none"
                />
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 leading-relaxed">
                ℹ️ Your query will be automatically routed to the faculty member or administrator who enrolled or uploaded your student profile.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-[#4f6bf7] hover:bg-[#3f57d6] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-[#4f6bf7]/20 transition-all cursor-pointer"
                >
                  {submitting ? 'Submitting...' : 'Submit Query'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
