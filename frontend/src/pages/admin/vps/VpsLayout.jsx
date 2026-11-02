import React, { useState, useEffect, createContext, useContext } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import api from '../../../api/axios';
import {
  Server,
  Box,
  Cpu,
  Layers,
  FileText,
  ShieldCheck,
  RefreshCw,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Terminal,
} from 'lucide-react';

const VpsContext = createContext(null);

export function useVpsContext() {
  return useContext(VpsContext);
}

export default function VpsLayout() {
  const location = useLocation();
  const [serverStatus, setServerStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(10); // seconds, 0 = off
  const [refreshTick, setRefreshTick] = useState(0);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/vps/metrics');
      if (res.data?.success) {
        setServerStatus(res.data.data);
        setLastRefreshed(new Date());
      }
    } catch (err) {
      console.error('Failed to fetch VPS status:', err);
    } finally {
      setLoading(false);
    }
  };

  const triggerRefresh = () => {
    fetchStatus();
    setRefreshTick((t) => t + 1);
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (!autoRefreshInterval || autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchStatus();
      setRefreshTick((t) => t + 1);
    }, autoRefreshInterval * 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval]);

  const navTabs = [
    { label: 'Overview', path: '/admin/vps', exact: true, icon: Activity },
    { label: 'Docker Containers', path: '/admin/vps/containers', icon: Box },
    { label: 'Applications', path: '/admin/vps/applications', icon: Cpu },
    { label: 'System Services', path: '/admin/vps/services', icon: Layers },
    { label: 'Logs', path: '/admin/vps/logs', icon: FileText },
    { label: 'Security & Activity', path: '/admin/vps/activity', icon: ShieldCheck },
  ];

  const server = serverStatus?.server;
  const isOnline = server?.status === 'ONLINE';

  return (
    <VpsContext.Provider value={{ serverStatus, loading, refreshTick, triggerRefresh }}>
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-blue-50 text-blue-600 border border-blue-200">
                Core Infrastructure
              </span>
              <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {isOnline ? 'VPS Online' : 'Connecting...'}
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
              VPS Management & Infrastructure Control
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Real-time server telemetry, container orchestration, application runtime diagnostics, and security audits.
            </p>
          </div>

          {/* Quick Telemetry & Refresh Actions */}
          <div className="flex flex-wrap items-center gap-3">
            {server && (
              <div className="hidden sm:flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-600 shadow-xs">
                <Server className="w-3.5 h-3.5 text-[#4f6bf7]" />
                <span className="font-semibold text-slate-800">{server.hostname}</span>
                <span className="text-slate-300">|</span>
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Up {server.uptimeFormatted}</span>
              </div>
            )}

            {/* Auto Refresh Dropdown */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-600 shadow-xs">
              <span className="text-[11px] text-slate-400 font-medium">Auto-refresh:</span>
              <select
                value={autoRefreshInterval}
                onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
              >
                <option value={0}>Off</option>
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              onClick={triggerRefresh}
              disabled={loading}
              className="px-3.5 py-2 bg-[#4f6bf7] hover:bg-[#435ee0] text-white font-bold text-xs rounded-xl shadow-sm shadow-[#4f6bf7]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto">
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const isMatch = tab.exact
              ? location.pathname === tab.path
              : location.pathname.startsWith(tab.path);

            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                  isMatch
                    ? 'bg-[#4f6bf7] text-white shadow-sm shadow-[#4f6bf7]/25 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </NavLink>
            );
          })}
        </div>

        {/* Sub-page Outlet */}
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </VpsContext.Provider>
  );
}
