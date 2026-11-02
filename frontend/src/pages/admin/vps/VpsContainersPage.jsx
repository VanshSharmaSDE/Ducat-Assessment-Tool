import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { useModal } from '../../../context/ModalContext';
import { useVpsContext } from './VpsLayout';
import {
  Box,
  Play,
  Square,
  RotateCw,
  FileText,
  Info,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  X,
  AlertTriangle,
  Download,
} from 'lucide-react';

export default function VpsContainersPage() {
  const { showAlert, showConfirm } = useModal();
  const { refreshTick } = useVpsContext();
  const [containers, setContainers] = useState([]);
  const [daemonRunning, setDaemonRunning] = useState(true);
  const [daemonError, setDaemonError] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Modals
  const [detailsModal, setDetailsModal] = useState({ open: false, data: null, loading: false });
  const [logsModal, setLogsModal] = useState({ open: false, containerId: null, logs: '', loading: false, lines: 100 });

  const loadContainers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/vps/containers');
      if (res.data?.success) {
        setDaemonRunning(res.data.data.daemonRunning);
        setDaemonError(res.data.data.error || '');
        setContainers(res.data.data.containers || []);
      }
    } catch (err) {
      setDaemonError(err.response?.data?.message || 'Failed to connect to Docker service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContainers();
  }, [refreshTick]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleStart = async (container) => {
    try {
      setActionLoading(true);
      await api.post(`/admin/vps/containers/${container.id}/start`);
      await showAlert({
        title: 'Container Started',
        message: `Container ${container.name || container.id} has been started successfully.`,
        type: 'success',
      });
      loadContainers();
    } catch (err) {
      await showAlert({
        title: 'Start Failed',
        message: err.response?.data?.message || 'Failed to start container',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async (container) => {
    const confirmed = await showConfirm({
      title: 'Stop Container',
      message: `Are you sure you want to stop container "${container.name || container.id}"? Any active connections will be terminated.`,
      confirmText: 'Stop Container',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/vps/containers/${container.id}/stop`);
      await showAlert({
        title: 'Container Stopped',
        message: `Container ${container.name || container.id} has been stopped.`,
        type: 'success',
      });
      loadContainers();
    } catch (err) {
      await showAlert({
        title: 'Stop Failed',
        message: err.response?.data?.message || 'Failed to stop container',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestart = async (container) => {
    const confirmed = await showConfirm({
      title: 'Restart Container',
      message: `Are you sure you want to restart container "${container.name || container.id}"?`,
      confirmText: 'Restart Container',
      isDanger: false,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/vps/containers/${container.id}/restart`);
      await showAlert({
        title: 'Container Restarted',
        message: `Container ${container.name || container.id} restarted successfully.`,
        type: 'success',
      });
      loadContainers();
    } catch (err) {
      await showAlert({
        title: 'Restart Failed',
        message: err.response?.data?.message || 'Failed to restart container',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetails = async (container) => {
    setDetailsModal({ open: true, data: null, loading: true });
    try {
      const res = await api.get(`/admin/vps/containers/${container.id}`);
      setDetailsModal({ open: true, data: res.data?.data, loading: false });
    } catch (err) {
      showAlert({
        title: 'Inspection Failed',
        message: err.response?.data?.message || 'Failed to inspect container',
        type: 'error',
      });
      setDetailsModal({ open: false, data: null, loading: false });
    }
  };

  const handleViewLogs = async (container, lines = 100) => {
    setLogsModal({ open: true, containerId: container.id, containerName: container.name, logs: '', loading: true, lines });
    try {
      const res = await api.get(`/admin/vps/containers/${container.id}/logs?lines=${lines}`);
      setLogsModal({
        open: true,
        containerId: container.id,
        containerName: container.name,
        logs: res.data?.data?.logs || 'No log records returned.',
        loading: false,
        lines,
      });
    } catch (err) {
      setLogsModal((prev) => ({
        ...prev,
        logs: `Failed to fetch logs: ${err.response?.data?.message || err.message}`,
        loading: false,
      }));
    }
  };

  const filtered = containers.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.name || '').toLowerCase().includes(q) ||
      (c.id || '').toLowerCase().includes(q) ||
      (c.image || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Docker Daemon Status Banner if offline */}
      {!daemonRunning && (
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 shadow-xs">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Docker Daemon Offline / Unreachable
              </h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                The Docker engine daemon is not running on this host or the Docker socket is not currently exposed. Container orchestration commands require Docker Desktop or the system dockerd daemon to be active.
              </p>
              {daemonError && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-100/60 border border-amber-200/80 font-mono text-[11px] text-amber-950 break-all">
                  {daemonError}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search containers by name, ID, or image..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#4f6bf7] shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">
            Total Containers: <strong className="text-slate-800 font-bold">{containers.length}</strong>
          </span>
          <button
            onClick={loadContainers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-xs cursor-pointer disabled:opacity-50"
            title="Reload container list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Containers Table */}
      {loading ? (
        <div className="p-16 text-center rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-[#4f6bf7] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-3 font-medium">Querying container state...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-500">
          <Box className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Docker containers found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {daemonRunning
              ? 'No active or stopped containers match your current query.'
              : 'Start the Docker daemon on your host to populate containers.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                  <th className="py-3 px-4">Container</th>
                  <th className="py-3 px-4">Image</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">CPU %</th>
                  <th className="py-3 px-4">Memory</th>
                  <th className="py-3 px-4">Ports</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const isRunning = c.state === 'running';
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              isRunning ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <Box className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 truncate max-w-[200px]">{c.name || c.id}</p>
                            <button
                              onClick={() => handleCopy(c.id, c.id)}
                              className="text-[10px] font-mono text-slate-400 hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                              title="Copy Container ID"
                            >
                              <span>{c.id.substring(0, 12)}</span>
                              {copiedId === c.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Image */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-600 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200/60 max-w-[200px] truncate inline-block">
                          {c.image}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isRunning
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isRunning ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                          {c.status || c.state}
                        </span>
                      </td>

                      {/* CPU Usage */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {c.stats?.cpuPercent || '—'}
                      </td>

                      {/* Memory */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-700">
                        {c.stats?.memUsage || '—'}
                      </td>

                      {/* Ports */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-[150px] truncate">
                        {c.ports || '—'}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Start / Stop Button */}
                          {isRunning ? (
                            <button
                              onClick={() => handleStop(c)}
                              disabled={actionLoading}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Stop Container"
                            >
                              <Square className="w-3.5 h-3.5 fill-current" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStart(c)}
                              disabled={actionLoading}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Start Container"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                            </button>
                          )}

                          {/* Restart Button */}
                          <button
                            onClick={() => handleRestart(c)}
                            disabled={actionLoading}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Restart Container"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>

                          {/* View Logs Button */}
                          <button
                            onClick={() => handleViewLogs(c)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="View Logs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Inspect Details Button */}
                          <button
                            onClick={() => handleViewDetails(c)}
                            className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Inspect Details"
                          >
                            <Info className="w-3.5 h-3.5" />
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

      {/* Container Details Modal */}
      {detailsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-[#4f6bf7]" />
                <h3 className="text-sm font-bold text-slate-800">Container Inspection Details</h3>
              </div>
              <button
                onClick={() => setDetailsModal({ open: false, data: null, loading: false })}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 font-mono text-xs">
              {detailsModal.loading ? (
                <div className="py-12 text-center">
                  <div className="w-7 h-7 border-4 border-[#4f6bf7] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 mt-2">Loading inspection schema...</p>
                </div>
              ) : detailsModal.data ? (
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(detailsModal.data, null, 2)}
                </pre>
              ) : (
                <p className="text-slate-400">No inspection details available</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Container Logs Modal */}
      {logsModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#4f6bf7]" />
                <h3 className="text-sm font-bold text-slate-800">
                  Container Logs: <span className="font-mono text-[#4f6bf7]">{logsModal.containerName || logsModal.containerId}</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {/* Lines Selector */}
                <select
                  value={logsModal.lines}
                  onChange={(e) => handleViewLogs({ id: logsModal.containerId, name: logsModal.containerName }, Number(e.target.value))}
                  className="px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600 bg-white"
                >
                  <option value={50}>Last 50 lines</option>
                  <option value={100}>Last 100 lines</option>
                  <option value={200}>Last 200 lines</option>
                  <option value={500}>Last 500 lines</option>
                </select>

                <button
                  onClick={() => handleCopy(logsModal.logs, 'modal-logs')}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 text-xs flex items-center gap-1 cursor-pointer"
                  title="Copy logs"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => setLogsModal({ open: false, containerId: null, logs: '', loading: false, lines: 100 })}
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
                  <span>Streaming container logs...</span>
                </div>
              ) : (
                <pre className="font-mono text-emerald-400 text-xs whitespace-pre-wrap leading-relaxed select-text">
                  {logsModal.logs || 'No log output captured.'}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
