import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { useVpsContext } from './VpsLayout';
import {
  Layers,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Database,
  Globe,
  Box,
  Shield,
  Activity,
  Clock,
} from 'lucide-react';

export default function VpsServicesPage() {
  const { refreshTick } = useVpsContext();
  const [services, setServices] = useState([]);
  const [lastChecked, setLastChecked] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadServices = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/vps/services');
      if (res.data?.success) {
        setServices(res.data.data.services || []);
        setLastChecked(res.data.data.timestamp);
      }
    } catch (err) {
      console.error('Failed to load system services:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, [refreshTick]);

  const getServiceIcon = (id) => {
    switch (id) {
      case 'mongodb':
        return Database;
      case 'nginx':
        return Globe;
      case 'docker':
        return Box;
      case 'vps-agent':
        return Shield;
      default:
        return Layers;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Infrastructure Daemons & Port Probes
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real-time status, TCP port checks, socket connectivity, and latency diagnostics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {lastChecked && (
            <span className="text-[11px] text-slate-400">
              Last probe: {new Date(lastChecked).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={loadServices}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            title="Probe services now"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Services Grid (Card View) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((svc) => {
          const Icon = getServiceIcon(svc.id);
          const isActive = svc.status === 'active';
          return (
            <div
              key={svc.id}
              className={`p-5 rounded-2xl border transition-all shadow-xs flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-slate-200/80 hover:border-slate-300'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isActive ? 'bg-blue-50 text-[#4f6bf7]' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600 border border-slate-300'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                      }`}
                    />
                    {svc.status}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-800">{svc.displayName || svc.name}</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Type: {svc.type} {svc.port ? `| Port ${svc.port}` : ''}
                </p>

                <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                  {svc.details || 'Health probe normal'}
                </p>
              </div>

              <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Latency</span>
                <span className="font-mono font-bold text-slate-700">
                  {svc.latency !== null ? `${svc.latency} ms` : '—'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Diagnostic Table */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Detailed Service Diagnostics
          </h4>
          <span className="text-xs text-slate-400">Read-Only Diagnostic Telemetry</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Port / Endpoint</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Diagnostics / Health Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {services.map((svc) => (
                <tr key={svc.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-800">{svc.displayName || svc.name}</td>
                  <td className="py-3 px-4 uppercase text-[10px] text-slate-500 font-bold">{svc.type}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        svc.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          svc.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                      />
                      {svc.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-600">
                    {svc.port ? `127.0.0.1:${svc.port}` : 'System Local Socket'}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-700">
                    {svc.latency !== null ? `${svc.latency} ms` : '—'}
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-md truncate">
                    {svc.details || 'Operational'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
