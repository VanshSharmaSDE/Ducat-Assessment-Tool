import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { useModal } from '../../../context/ModalContext';
import { useVpsContext } from './VpsLayout';
import {
  Cpu,
  RotateCw,
  RefreshCcw,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Activity,
  Layers,
  Copy,
  Check,
  X,
} from 'lucide-react';

export default function VpsApplicationsPage() {
  const { showAlert, showConfirm } = useModal();
  const { refreshTick } = useVpsContext();
  const [apps, setApps] = useState([]);
  const [managedThrough, setManagedThrough] = useState('STANDALONE_PROCESS');
  const [pm2Installed, setPm2Installed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Logs Modal
  const [logsModal, setLogsModal] = useState({
    open: false,
    appId: null,
    appName: '',
    logs: '',
    loading: false,
    lines: 100,
  });

  const loadApplications = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/vps/applications');
      if (res.data?.success) {
        setApps(res.data.data.applications || []);
        setManagedThrough(res.data.data.managedThrough || 'STANDALONE_PROCESS');
        setPm2Installed(res.data.data.pm2Installed || false);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplications();
  }, [refreshTick]);

  const handleRestart = async (app) => {
    const confirmed = await showConfirm({
      title: 'Restart Application',
      message: `Are you sure you want to restart "${app.name}" (PID: ${app.pid})? Active evaluation jobs may be interrupted.`,
      confirmText: 'Restart Application',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/vps/applications/${app.name || app.id}/restart`);
      await showAlert({
        title: 'Application Restarted',
        message: `Application "${app.name}" restarted successfully.`,
        type: 'success',
      });
      loadApplications();
    } catch (err) {
      await showAlert({
        title: 'Restart Failed',
        message: err.response?.data?.message || 'Failed to restart application',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReload = async (app) => {
    const confirmed = await showConfirm({
      title: 'Zero-Downtime Reload',
      message: `Trigger a zero-downtime cluster reload for "${app.name}"?`,
      confirmText: 'Reload Application',
      isDanger: false,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/vps/applications/${app.name || app.id}/reload`);
      await showAlert({
        title: 'Application Reloaded',
        message: `Application "${app.name}" reloaded successfully with zero downtime.`,
        type: 'success',
      });
      loadApplications();
    } catch (err) {
      await showAlert({
        title: 'Reload Failed',
        message: err.response?.data?.message || 'Failed to reload application',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewLogs = async (app, lines = 100) => {
    setLogsModal({
      open: true,
      appId: app.name || app.id,
      appName: app.name,
      logs: '',
      loading: true,
      lines,
    });

    try {
      const res = await api.get(`/admin/vps/applications/${app.name || app.id}/logs?lines=${lines}`);
      setLogsModal({
        open: true,
        appId: app.name || app.id,
        appName: app.name,
        logs: res.data?.data?.logs || 'No log records recorded.',
        loading: false,
        lines,
      });
    } catch (err) {
      setLogsModal((prev) => ({
        ...prev,
        logs: `Failed to fetch application logs: ${err.response?.data?.message || err.message}`,
        loading: false,
      }));
    }
  };

  const filtered = apps.filter((a) => {
    const q = search.toLowerCase();
    return (
      (a.name || '').toLowerCase().includes(q) ||
      String(a.pid || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Supervision Info Banner */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">
              Supervision Protocol: <span className="text-[#4f6bf7]">{managedThrough}</span>
            </h4>
            <p className="text-[11px] text-slate-500">
              {pm2Installed
                ? 'Managed via PM2 process manager with clustering and cluster reload support.'
                : 'Direct process supervisor active with PID tracking and resource throttling.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            Node.js Runtime
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search applications by name or PID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4f6bf7] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">
            Managed Apps: <strong className="text-slate-800 font-bold">{apps.length}</strong>
          </span>
          <button
            onClick={loadApplications}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer disabled:opacity-50"
            title="Refresh application status"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Applications Table */}
      {loading ? (
        <div className="p-16 text-center rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-[#4f6bf7] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-3 font-medium">Querying process runtimes...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-500">
          <Cpu className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No managed applications registered</h3>
          <p className="text-xs text-slate-400 mt-1">
            Ensure PM2 applications are started or allowlisted in your VPS environment variables.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                  <th className="py-3 px-4">Application</th>
                  <th className="py-3 px-4">PID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">CPU %</th>
                  <th className="py-3 px-4">Memory</th>
                  <th className="py-3 px-4">Uptime</th>
                  <th className="py-3 px-4">Restarts</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((app) => {
                  const isOnline = app.status === 'online';
                  return (
                    <tr key={app.id || app.name} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                            <Activity className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{app.name}</p>
                            <span className="text-[10px] text-slate-400 font-mono">Node {app.nodeVersion}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 font-semibold text-[11px]">
                          {app.pid || '—'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isOnline
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {app.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {app.cpuPercent}%
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {app.memoryMb} MB
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {app.uptimeFormatted || '0m'}
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-600">
                        {app.restartCount || 0}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Restart Button */}
                          <button
                            onClick={() => handleRestart(app)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Restart Application"
                          >
                            <RotateCw className="w-3 h-3" />
                            <span>Restart</span>
                          </button>

                          {/* Zero-Downtime Reload Button (PM2) */}
                          <button
                            onClick={() => handleReload(app)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            title="Reload Application"
                          >
                            <RefreshCcw className="w-3 h-3" />
                            <span>Reload</span>
                          </button>

                          {/* View Logs Button */}
                          <button
                            onClick={() => handleViewLogs(app)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View stdout / stderr Logs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Application Logs Modal */}
      {logsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4f6bf7]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Process Logs: <span className="font-mono text-[#4f6bf7]">{logsModal.appName}</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={logsModal.lines}
                  onChange={(e) =>
                    handleViewLogs({ id: logsModal.appId, name: logsModal.appName }, Number(e.target.value))
                  }
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 bg-white"
                >
                  <option value={50}>Last 50 lines</option>
                  <option value={100}>Last 100 lines</option>
                  <option value={200}>Last 200 lines</option>
                  <option value={500}>Last 500 lines</option>
                </select>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(logsModal.logs);
                    showAlert({ title: 'Copied', message: 'Logs copied to clipboard', type: 'info' });
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 text-xs cursor-pointer"
                  title="Copy logs"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setLogsModal({ open: false, appId: null, appName: '', logs: '', loading: false, lines: 100 })}
                  className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-950 flex-1 overflow-y-auto">
              {logsModal.loading ? (
                <div className="py-12 text-center text-slate-400">
                  <div className="w-7 h-7 border-4 border-[#4f6bf7] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <span>Streaming application logs...</span>
                </div>
              ) : (
                <pre className="font-mono text-cyan-400 text-xs whitespace-pre-wrap leading-relaxed select-text">
                  {logsModal.logs || 'No output recorded for this application.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
