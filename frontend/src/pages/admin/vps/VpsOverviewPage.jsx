import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';
import { useVpsContext } from './VpsLayout';
import {
  Server,
  Cpu,
  HardDrive,
  Activity,
  Layers,
  Box,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Network,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Terminal,
  ExternalLink,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

export default function VpsOverviewPage() {
  const { refreshTick } = useVpsContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await api.get('/admin/vps/overview');
        if (res.data?.success && isMounted) {
          setData(res.data.data);
          // Add to historical rolling trend (up to 12 points)
          const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          setHistory((prev) => {
            const next = [
              ...prev,
              {
                time: nowStr,
                cpu: res.data.data.resources?.cpu?.utilizationPercent || 0,
                memory: res.data.data.resources?.memory?.usagePercent || 0,
              },
            ];
            return next.slice(-12);
          });
        }
      } catch (err) {
        console.error('Failed to load VPS overview:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [refreshTick]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-9 h-9 border-4 border-[#4f6bf7] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const server = data?.server || {};
  const resources = data?.resources || {};
  const cpu = resources.cpu || {};
  const memory = resources.memory || {};
  const disks = resources.disks || [];
  const network = resources.network || [];
  const appHealth = data?.applicationHealth || {};
  const alerts = appHealth.recentAlerts || [];

  const diskChartData = disks.map((d) => ({
    name: d.mount,
    used: parseFloat(d.usedGb) || 0,
    free: parseFloat(d.freeGb) || 0,
    total: parseFloat(d.totalGb) || 0,
    percent: d.usagePercent,
  }));

  return (
    <div className="space-y-6">
      {/* Active Alerts Banner if any */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={`p-4 rounded-2xl flex items-start gap-3 border shadow-xs ${
                alert.level === 'CRITICAL'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}
            >
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold uppercase tracking-wider">{alert.title}</h4>
                <p className="text-xs mt-0.5 opacity-90">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Primary KPI Grid (4 Cards matching existing admin theme) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Utilization - Featured Gradient Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#4f6bf7] to-[#6073ea] text-white shadow-lg shadow-[#4f6bf7]/20 relative overflow-hidden">
          <div className="flex items-center justify-between relative z-10">
            <span className="text-[11px] font-bold text-white/80 uppercase tracking-wider">
              CPU Utilization
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-white mt-3 font-mono relative z-10">
            {cpu.utilizationPercent}%
          </p>
          <div className="mt-2 text-[11px] text-white/80 flex items-center justify-between relative z-10">
            <span>{cpu.cores} Physical / Logical Cores</span>
            <span className="font-mono">Load: {cpu.loadAverage?.[0]?.toFixed(2) || '0.00'}</span>
          </div>
          {/* Subtle Progress Bar */}
          <div className="w-full bg-white/20 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-white h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, cpu.utilizationPercent)}%` }}
            />
          </div>
        </div>

        {/* RAM Usage - Clean Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Memory (RAM)
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#eef2ff] text-[#4f6bf7] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-800 mt-3 font-mono">
            {memory.usagePercent}%
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between font-medium">
            <span>{memory.usedMb?.toLocaleString()} MB Used</span>
            <span>{memory.totalMb?.toLocaleString()} MB Total</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                memory.usagePercent > 85 ? 'bg-rose-500' : 'bg-[#4f6bf7]'
              }`}
              style={{ width: `${Math.min(100, memory.usagePercent)}%` }}
            />
          </div>
        </div>

        {/* Disk Storage - Pastel Teal Card */}
        <div className="p-5 rounded-2xl bg-[#eaf8f4] border border-[#d2f2e7] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-800 uppercase tracking-wider">
              Primary Storage
            </span>
            <div className="w-9 h-9 rounded-xl bg-white text-teal-600 flex items-center justify-center shadow-xs">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-teal-900 mt-3 font-mono">
            {disks[0]?.usagePercent ?? 0}%
          </p>
          <div className="mt-2 text-[11px] text-teal-700/90 flex items-center justify-between font-medium">
            <span>{disks[0]?.usedGb || 0} GB Used</span>
            <span>{disks[0]?.freeGb || 0} GB Free</span>
          </div>
          <div className="w-full bg-teal-200/60 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-teal-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, disks[0]?.usagePercent || 0)}%` }}
            />
          </div>
        </div>

        {/* Server Uptime & Host - Pastel Purple Card */}
        <div className="p-5 rounded-2xl bg-[#f3f0ff] border border-[#e4ddff] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
              System Uptime
            </span>
            <div className="w-9 h-9 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-indigo-950 mt-3 font-mono truncate">
            {server.uptimeFormatted || '0m'}
          </p>
          <div className="mt-2 text-[11px] text-indigo-700/90 flex items-center justify-between font-medium">
            <span>OS: {server.type || server.platform}</span>
            <span>Node {server.nodeVersion}</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-indigo-600 font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Agent v1.0 Operational</span>
          </div>
        </div>
      </div>

      {/* Historical Telemetry Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU & Memory Rolling Trend */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Resource Telemetry Timeline</h3>
              <p className="text-xs text-slate-400">Live CPU and memory utilization timeline</p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-[#4f6bf7]">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4f6bf7]" /> CPU %
              </span>
              <span className="flex items-center gap-1.5 text-emerald-500">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> RAM %
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            {history.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f6bf7" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#4f6bf7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="memGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} unit="%" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '11px',
                      border: 'none',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="cpu"
                    name="CPU Usage"
                    stroke="#4f6bf7"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#cpuGradient)"
                  />
                  <Area
                    type="monotone"
                    dataKey="memory"
                    name="RAM Usage"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#memGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Collecting telemetry samples...
              </div>
            )}
          </div>
        </div>

        {/* Disk Allocation Breakdown */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Volume Storage Capacity</h3>
            <p className="text-xs text-slate-400 mb-4">Storage by mounted partition</p>

            <div className="h-48 w-full">
              {diskChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diskChartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} unit=" GB" />
                    <Tooltip
                      formatter={(val, name) => [`${val} GB`, name === 'used' ? 'Used Space' : 'Free Space']}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '11px',
                        border: 'none',
                      }}
                    />
                    <Bar dataKey="used" name="used" fill="#0d9488" stackId="a" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="free" name="free" fill="#ccfbf1" stackId="a" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No disk volumes detected
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Total Mounted Drives: {disks.length}</span>
            <span className="font-semibold text-slate-700">
              {disks.reduce((acc, d) => acc + (parseFloat(d.totalGb) || 0), 0).toFixed(0)} GB Total
            </span>
          </div>
        </div>
      </div>

      {/* Application Health & Monitored Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Docker Containers Widget */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#4f6bf7] flex items-center justify-center">
                <Box className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Docker Containers</h4>
                <span className="text-[10px] text-slate-400">
                  {appHealth.docker?.daemonRunning ? 'Daemon Active' : 'Daemon Offline'}
                </span>
              </div>
            </div>
            <Link
              to="/admin/vps/containers"
              className="p-1.5 rounded-lg text-slate-400 hover:text-[#4f6bf7] hover:bg-blue-50 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-bold font-mono text-emerald-600">
                {appHealth.docker?.runningContainers || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Running</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-bold font-mono text-slate-500">
                {appHealth.docker?.stoppedContainers || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Stopped</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-bold font-mono text-slate-700">
                {appHealth.docker?.totalContainers || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Total</span>
            </div>
          </div>
        </div>

        {/* Node.js / PM2 Apps Widget */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Cpu className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">Node Applications</h4>
                <span className="text-[10px] text-slate-400">
                  {appHealth.pm2?.pm2Installed ? 'PM2 Supervisor' : 'Node Process Supervision'}
                </span>
              </div>
            </div>
            <Link
              to="/admin/vps/applications"
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-bold font-mono text-emerald-600">
                {appHealth.pm2?.onlineApps || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Online</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-bold font-mono text-rose-500">
                {appHealth.pm2?.erroredApps || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Errors</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-xl font-bold font-mono text-slate-700">
                {appHealth.pm2?.totalApps || 0}
              </p>
              <span className="text-[10px] text-slate-500 font-medium">Total</span>
            </div>
          </div>
        </div>

        {/* Monitored Services Summary */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800">System Services</h4>
                <span className="text-[10px] text-slate-400">Infrastructure daemons</span>
              </div>
            </div>
            <Link
              to="/admin/vps/services"
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-2 mt-3">
            {(appHealth.services || []).slice(0, 4).map((svc) => (
              <div
                key={svc.name}
                className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
              >
                <span className="font-semibold text-slate-700 truncate">{svc.displayName || svc.name}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    svc.status === 'active'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Network Interfaces Table */}
      {network.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-2 mb-3">
            <Network className="w-4 h-4 text-[#4f6bf7]" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Network Interfaces & IP Bindings
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {network.map((net, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 text-xs">
                <p className="font-bold text-slate-800">{net.name}</p>
                <p className="font-mono text-slate-600 mt-1">{net.address}</p>
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Mask: {net.netmask} | MAC: {net.mac || 'N/A'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
