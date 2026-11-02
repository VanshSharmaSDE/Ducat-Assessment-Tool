import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { useVpsContext } from './VpsLayout';
import {
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Clock,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export default function VpsActivityPage() {
  const { refreshTick } = useVpsContext();
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [detailsModal, setDetailsModal] = useState({ open: false, data: null });

  const loadActivity = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '20',
      });
      if (statusFilter !== 'ALL') {
        params.append('status', statusFilter);
      }
      const res = await api.get(`/admin/vps/activity?${params.toString()}`);
      if (res.data?.success) {
        setActivities(res.data.data.activity || []);
        setPagination(res.data.data.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load VPS activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity(pagination.page);
  }, [statusFilter, refreshTick]);

  const formatActionName = (action) => {
    return action.replace(/^VPS_/, '').replace(/_/g, ' ');
  };

  return (
    <div className="space-y-6">
      {/* Activity Header and Filter Bar */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Infrastructure Audit Records
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Immutable management trail recorded in MongoDB with administrator attribution.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="text-[11px] text-slate-400 font-medium">Outcome:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="bg-transparent text-xs font-semibold text-slate-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Outcomes</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
            </select>
          </div>

          <button
            onClick={() => loadActivity(pagination.page)}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh activity logs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Activity Table */}
      {loading ? (
        <div className="p-16 text-center rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="w-8 h-8 border-4 border-[#4f6bf7] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 mt-3 font-medium">Loading audit trail...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 shadow-sm text-slate-500">
          <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-800">No management actions recorded yet</h3>
          <p className="text-xs text-slate-400 mt-1">
            Actions like starting/stopping containers or reloading applications will be logged here.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 bg-slate-50 font-semibold">
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Client IP</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activities.map((item) => {
                  const isSuccess = item.status === 'SUCCESS';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Administrator */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-[#4f6bf7] font-bold text-[11px] flex items-center justify-center shrink-0">
                            {item.user?.name?.charAt(0).toUpperCase() || 'A'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{item.user?.name || 'Administrator'}</p>
                            <span className="text-[10px] text-slate-400">{item.user?.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[11px] text-slate-700 uppercase">
                          {formatActionName(item.action)}
                        </span>
                      </td>

                      {/* Target */}
                      <td className="py-3 px-4">
                        <div className="font-mono text-[11px]">
                          <span className="text-slate-500 font-semibold">{item.resource}</span>
                          {item.resourceId && (
                            <span className="text-slate-400 block truncate max-w-[160px]">
                              {item.resourceId}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isSuccess ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-500" />
                          )}
                          <span>{item.status}</span>
                        </span>
                      </td>

                      {/* IP */}
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {item.ip || '127.0.0.1'}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(item.timestamp).toLocaleString()}
                      </td>

                      {/* View Details Modal Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setDetailsModal({ open: true, data: item })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="View audit record"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {pagination.page} of {pagination.totalPages} ({pagination.total} entries)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadActivity(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => loadActivity(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Audit Record Details Modal */}
      {detailsModal.open && detailsModal.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full shadow-xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4f6bf7]" />
                <h3 className="text-sm font-bold text-slate-800">Audit Record Details</h3>
              </div>
              <button
                onClick={() => setDetailsModal({ open: false, data: null })}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-sans">Action</span>
                  <strong>{detailsModal.data.action}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-sans">Status</span>
                  <span className={detailsModal.data.status === 'SUCCESS' ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>
                    {detailsModal.data.status}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-sans">Resource</span>
                  <span>{detailsModal.data.resource}: {detailsModal.data.resourceId}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-sans">Timestamp</span>
                  <span>{new Date(detailsModal.data.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-sans mb-1.5">Action Result / Payload</span>
                <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl overflow-x-auto text-[11px] leading-relaxed">
                  {JSON.stringify(detailsModal.data.details, null, 2)}
                </pre>
              </div>

              {detailsModal.data.userAgent && (
                <div className="text-[10px] text-slate-400 truncate">
                  User Agent: {detailsModal.data.userAgent}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
