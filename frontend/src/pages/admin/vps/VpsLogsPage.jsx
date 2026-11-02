import React, { useState, useEffect, useRef } from 'react';
import api from '../../../api/axios';
import { useVpsContext } from './VpsLayout';
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  Filter,
  Terminal,
  ArrowDown,
} from 'lucide-react';

export default function VpsLogsPage() {
  const { refreshTick } = useVpsContext();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('all');
  const [severity, setSeverity] = useState('all');
  const [lines, setLines] = useState(100);
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(false);
  const [copied, setCopied] = useState(false);
  const logTerminalRef = useRef(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        lines: String(lines),
        source,
        severity,
        search,
      });
      const res = await api.get(`/admin/vps/logs?${params.toString()}`);
      if (res.data?.success) {
        setLogs(res.data.data.logs || []);
        setTotal(res.data.data.total || 0);
      }
    } catch (err) {
      console.error('Failed to fetch system logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [source, severity, lines, refreshTick]);

  // Handle enter key in search
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs();
  };

  // Auto-scroll to bottom if active
  useEffect(() => {
    if (autoScroll && logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.source}] [${l.severity.toUpperCase()}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] [${l.source}] [${l.severity.toUpperCase()}] ${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vps_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(a);
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date().toLocaleTimeString() : d.toLocaleTimeString();
  };

  const getSeverityBadge = (sev) => {
    switch (sev.toLowerCase()) {
      case 'error':
        return 'text-rose-400 bg-rose-950/60 border border-rose-800/80';
      case 'warn':
        return 'text-amber-400 bg-amber-950/60 border border-amber-800/80';
      default:
        return 'text-cyan-400 bg-cyan-950/60 border border-cyan-800/80';
    }
  };


  return (
    <div className="space-y-6">
      {/* Filter and Control Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search Query Form */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search log records (press Enter)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4f6bf7]"
          />
        </form>


        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="text-[11px] text-slate-400 font-medium">Source:</span>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Sources</option>
              <option value="docker">Docker Containers</option>
              <option value="pm2">PM2 Applications</option>
              <option value="system">System Kernel</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="text-[11px] text-slate-400 font-medium">Severity:</span>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">All Levels</option>
              <option value="info">Info</option>
              <option value="warn">Warnings</option>
              <option value="error">Errors</option>
            </select>
          </div>

          {/* Lines Limit */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="text-[11px] text-slate-400 font-medium">Limit:</span>
            <select
              value={lines}
              onChange={(e) => setLines(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={250}>250</option>
              <option value={500}>500</option>
            </select>
          </div>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Copy logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download Logs */}
          <button
            onClick={handleDownloadLogs}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            title="Download logs as .txt"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Refresh */}
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Terminal View */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
        {/* Terminal Header */}
        <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="font-mono text-slate-400 text-[11px] ml-2">
              telemetry@skillcodex-vps:~/logs
            </span>
          </div>

          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>{logs.length} entries displayed</span>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-mono cursor-pointer transition-colors ${
                autoScroll ? 'bg-emerald-900/60 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowDown className="w-3 h-3" />
              <span>Auto-scroll</span>
            </button>
          </div>
        </div>

        {/* Log Stream Area */}
        <div
          ref={logTerminalRef}
          className="p-4 font-mono text-xs overflow-y-auto max-h-[600px] min-h-[350px] space-y-1.5 select-text"
        >
          {loading && logs.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              <div className="w-7 h-7 border-4 border-[#4f6bf7] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Fetching system log stream...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-20 text-center text-slate-500">
              No matching log records found for the selected criteria.
            </div>
          ) : (
            logs.map((log, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 hover:bg-slate-900/40 px-2 py-1 rounded-lg transition-colors leading-relaxed"
              >
                {/* Timestamp */}
                <span className="text-slate-500 text-[11px] shrink-0 font-mono">
                  {formatTimestamp(log.timestamp)}
                </span>


                {/* Source Badge */}
                <span className="text-slate-400 font-bold text-[10px] uppercase px-1.5 py-0.2 rounded bg-slate-800/80 shrink-0">
                  {log.source}
                </span>

                {/* Severity Badge */}
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded shrink-0 ${getSeverityBadge(
                    log.severity
                  )}`}
                >
                  {log.severity}
                </span>

                {/* Message */}
                <span className="text-slate-200 flex-1 break-all text-[11.5px]">
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
