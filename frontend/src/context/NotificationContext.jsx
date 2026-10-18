import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { MessageSquare, Shield, GraduationCap, X, ChevronRight, Bell } from 'lucide-react';

const NotificationContext = createContext(null);

function playChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.type = 'sine';
    // Gentle melodic 3-tone chime
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5
    osc.frequency.setValueAtTime(1174.66, now + 0.16); // D6

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.start(now);
    osc.stop(now + 0.36);
  } catch (e) {
    // Web Audio blocked before user interaction
  }
}

export function NotificationProvider({ children }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [toasts, setToasts] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadQueryIds, setUnreadQueryIds] = useState(new Set());
  const activeQueryIdRef = useRef(null);

  // Fetch true unread count from server
  const fetchUnreadCount = async () => {
    if (!user) return;
    try {
      const res = await api.get('/support/unread-count');
      const count = res.data.data?.unreadCount || 0;
      const ids = res.data.data?.unreadQueryIds || [];
      setUnreadCount(count);
      setUnreadQueryIds(new Set(ids));
    } catch (e) {
      // non-critical
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
    } else {
      setUnreadCount(0);
      setUnreadQueryIds(new Set());
    }
  }, [user]);

  const setActiveQueryId = (id) => {
    activeQueryIdRef.current = id;
    if (id) {
      markAsRead(id);
    }
  };

  const markAsRead = async (queryId) => {
    if (!queryId) return;
    setUnreadQueryIds((prev) => {
      if (!prev.has(queryId)) return prev;
      const next = new Set(prev);
      next.delete(queryId);
      return next;
    });
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await api.post(`/support/mark-read/${queryId}`);
    } catch (e) {
      // non-critical
    }
  };

  const clearUnread = () => {
    setUnreadCount(0);
    setUnreadQueryIds(new Set());
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const addToast = (notif) => {
    const toastId = Date.now() + Math.random().toString(36).substring(2, 6);
    const newToast = {
      id: toastId,
      ...notif,
    };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep max 5 toasts

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      removeToast(toastId);
    }, 6000);
  };

  // Socket listener for support notifications
  useEffect(() => {
    if (!socket || !user) return;

    const handleSupportNotification = (data) => {
      // If user is currently focused on this exact query in the chat window, don't spam them with toast
      const isCurrentlyViewing = activeQueryIdRef.current && String(activeQueryIdRef.current) === String(data.queryId);

      if (!isCurrentlyViewing) {
        playChime();
        setUnreadCount((prev) => prev + 1);
        if (data.queryId) {
          setUnreadQueryIds((prev) => new Set([...prev, data.queryId]));
        }

        addToast({
          title: data.senderName || 'Support Desk',
          role: data.senderRole,
          subject: data.subject || data.ticketId || 'New Message',
          message: data.preview || 'You have received a new message.',
          queryId: data.queryId,
          ticketId: data.ticketId,
          type: data.type,
        });
      } else {
        // Soft chime even when looking at chat
        playChime();
      }
    };

    const handleQueryCreated = (query) => {
      if (user.role === 'ADMIN' || user.role === 'FACULTY') {
        setUnreadCount((prev) => prev + 1);
        if (query?._id) {
          setUnreadQueryIds((prev) => new Set([...prev, query._id]));
        }
      }
    };

    socket.on('support:notification', handleSupportNotification);
    socket.on('support:query_created', handleQueryCreated);

    return () => {
      socket.off('support:notification', handleSupportNotification);
      socket.off('support:query_created', handleQueryCreated);
    };
  }, [socket, user]);

  const handleOpenToast = (toast) => {
    removeToast(toast.id);
    if (!toast.queryId) return;

    markAsRead(toast.queryId);

    if (user?.role === 'ADMIN' || user?.role === 'FACULTY') {
      navigate(`/admin/queries?queryId=${toast.queryId}`);
    } else {
      navigate(`/support?queryId=${toast.queryId}`);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        unreadQueryIds,
        setUnreadCount,
        clearUnread,
        markAsRead,
        fetchUnreadCount,
        activeQueryIdRef,
        setActiveQueryId,
        playChime,
      }}
    >
      {children}

      {/* Real-time Floating Notification Toasts */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => handleOpenToast(t)}
            className="pointer-events-auto group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl shadow-slate-900/10 hover:shadow-2xl hover:border-[#4f6bf7]/50 transition-all cursor-pointer flex items-start gap-3 animate-in slide-in-from-top-3 fade-in duration-200"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#4f6bf7] flex items-center justify-center shrink-0 mt-0.5">
              {t.role === 'ADMIN' ? (
                <Shield className="w-4 h-4 text-rose-500" />
              ) : t.role === 'FACULTY' ? (
                <GraduationCap className="w-4 h-4 text-amber-500" />
              ) : (
                <MessageSquare className="w-4 h-4 text-[#4f6bf7]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {t.title}
                </span>
                {t.ticketId && (
                  <span className="text-[10px] font-mono font-bold text-[#4f6bf7] bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded">
                    {t.ticketId}
                  </span>
                )}
              </div>

              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                {t.subject}
              </p>

              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                {t.message}
              </p>

              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] font-bold text-[#4f6bf7] flex items-center gap-1 group-hover:underline">
                  <span>Open Query</span>
                  <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
                <span className="text-[9px] text-slate-400">Just now</span>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeToast(t.id);
              }}
              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  return useContext(NotificationContext);
}
