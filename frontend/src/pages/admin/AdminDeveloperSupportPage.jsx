import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useAuth } from '../../context/AuthContext';
import {
  LifeBuoy,
  Send,
  Mail,
  Server,
  Cpu,
  HardDrive,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  RotateCw,
  Terminal,
  Info,
} from 'lucide-react';

export default function AdminDeveloperSupportPage() {
  const { user } = useAuth();

  const [developerEmail, setDeveloperEmail] = useState('support@skillcodex.com');
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('SERVER_INFRASTRUCTURE');
  const [priority, setPriority] = useState('HIGH');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email || '');
  const [contactPhone, setContactPhone] = useState(user?.phone || '');
  const [includeDiagnostics, setIncludeDiagnostics] = useState(true);

  // Live diagnostics from backend
  const [diagnostics, setDiagnostics] = useState(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  // Form submission state
  const [submitting, setSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // History state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    loadDiagnostics();
    loadHistory();
  }, []);

  const loadDiagnostics = async () => {
    try {
      setLoadingDiag(true);
      const res = await api.get('/support/admin/developer-support/diagnostics');
      setDiagnostics(res.data.data?.diagnostics || null);
    } catch (err) {
      console.warn('Could not load diagnostics:', err);
    } finally {
      setLoadingDiag(false);
    }
  };

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/support/admin/developer-support/history');
      setHistory(res.data.data?.history || []);
    } catch (err) {
      console.warn('Could not load developer support history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setErrorMessage('Subject and detailed description are required.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');
      setSuccessResult(null);

      const res = await api.post('/support/admin/developer-support', {
        developerEmail: developerEmail.trim(),
        subject: subject.trim(),
        category,
        priority,
        description: description.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        includeDiagnostics,
      });

      setSuccessResult(res.data);
      setSubject('');
      setDescription('');
      loadHistory();
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to dispatch developer support email.');
    } finally {
      setSubmitting(false);
    }
  };

  // Construct a fallback mailto: link for 1-click native client dispatch
  const buildMailtoUrl = () => {
    const emailTo = developerEmail || 'support@skillcodex.com';
    const sub = `[${priority}] ${subject || 'Admin Technical Support Request'}`;
    const bodyText = `Admin Name: ${user?.name || 'Administrator'}
Admin Email: ${contactEmail || user?.email || 'N/A'}
Admin Phone: ${contactPhone || user?.phone || 'N/A'}
Priority: ${priority}
Category: ${category}

Issue Description:
${description || '(Enter description here)'}

--- System Diagnostics ---
Platform: ${diagnostics?.platform || 'N/A'}
Node Version: ${diagnostics?.nodeVersion || 'N/A'}
Memory: ${diagnostics?.freeMemoryMB}MB free / ${diagnostics?.totalMemoryMB}MB total
Uptime: ${diagnostics?.uptimeSeconds}s`;

    return `mailto:${emailTo}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(bodyText)}`;
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
            <LifeBuoy className="w-7 h-7 text-[#4f6bf7]" />
            Developer Support Escalation
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Direct communication channel to the system developers and engineering team for server infrastructure, bug fixes, and critical production needs.
          </p>
        </div>

        <a
          href={buildMailtoUrl()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
          title="Open in your default email client (Outlook, Gmail, etc.)"
        >
          <Mail className="w-4 h-4 text-[#4f6bf7]" />
          <span>Direct Email Client (Mailto)</span>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
        </a>
      </div>

      {/* Success Banner */}
      {successResult && (
        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 space-y-2">
          <div className="flex items-center gap-2.5 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Developer Support Request Submitted Successfully!</span>
          </div>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
            {successResult.message}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 px-2.5 py-1 rounded font-bold">
              Ticket Ref: {successResult.data?.record?.ticketId}
            </span>
            <span className="text-emerald-700 dark:text-emerald-300">
              Recipient: <strong>{successResult.data?.developerEmail}</strong>
            </span>
            <span className="text-emerald-700 dark:text-emerald-300">
              Dispatch: <strong>{successResult.data?.emailSent ? 'Sent via SMTP' : 'Recorded (Manual Dispatch Ready)'}</strong>
            </span>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Support Form & Diagnostics Side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Send className="w-4 h-4 text-[#4f6bf7]" />
            Compose Request to Developer
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Developer Email Recipient *
                </label>
                <input
                  type="email"
                  required
                  value={developerEmail}
                  onChange={(e) => setDeveloperEmail(e.target.value)}
                  placeholder="developer@domain.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Issue Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-700 dark:text-slate-200"
                >
                  <option value="SERVER_INFRASTRUCTURE">Server & VPS Infrastructure</option>
                  <option value="DOCKER_SANDBOX">Docker Sandbox / Code Runner</option>
                  <option value="DATABASE_MONGODB">MongoDB / Database Performance</option>
                  <option value="LOAD_CONCURRENCY">High Load / 100+ User Concurrency</option>
                  <option value="BUG_REPORT">Application Bug / Error</option>
                  <option value="FEATURE_REQUEST">Feature Request / Enhancement</option>
                  <option value="URGENT_PRODUCTION">Urgent Live Exam Emergency</option>
                  <option value="OTHER">Other Technical Query</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="E.g. High CPU spike during concurrent load test on VPS"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Priority *
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-700 dark:text-slate-200"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical / Production Down</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Detailed Description & Error Logs *
              </label>
              <textarea
                rows={6}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide complete details, exact error messages, terminal logs, or steps to reproduce the issue..."
                className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none font-mono"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Your Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="admin@domain.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Your Phone / WhatsApp
                </label>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4f6bf7] text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeDiagnostics}
                onChange={(e) => setIncludeDiagnostics(e.target.checked)}
                className="w-4 h-4 text-[#4f6bf7] rounded focus:ring-[#4f6bf7]"
              />
              <span>Attach live server diagnostics (OS, Memory, CPU, Node Version, Uptime)</span>
            </label>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
              <a
                href={buildMailtoUrl()}
                className="text-xs font-bold text-[#4f6bf7] dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Launch Mail Client</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4f6bf7] hover:bg-[#3f57d6] disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-[#4f6bf7]/20 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Dispatching...' : 'Send Mail to Developer'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Live Diagnostics Card (Right Column) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                <Server className="w-4 h-4 text-[#4f6bf7]" />
                <span>Server Environment</span>
              </div>
              <button
                onClick={loadDiagnostics}
                disabled={loadingDiag}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded cursor-pointer"
                title="Refresh diagnostics"
              >
                <RotateCw className={`w-3.5 h-3.5 ${loadingDiag ? 'animate-spin text-[#4f6bf7]' : ''}`} />
              </button>
            </div>

            {diagnostics ? (
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Terminal className="w-3.5 h-3.5" /> OS Platform:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {diagnostics.platform} ({diagnostics.arch})
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Cpu className="w-3.5 h-3.5" /> Node Version:
                  </span>
                  <span className="font-mono font-semibold text-[#4f6bf7] dark:text-blue-400">
                    {diagnostics.nodeVersion}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Cpu className="w-3.5 h-3.5" /> CPU Cores:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {diagnostics.cpus} Cores
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <HardDrive className="w-3.5 h-3.5" /> Free Memory:
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                    {diagnostics.freeMemoryMB} MB / {diagnostics.totalMemoryMB} MB
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <HardDrive className="w-3.5 h-3.5" /> Node Heap:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {diagnostics.nodeMemoryUsageMB?.heapUsed} MB
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                    <Clock className="w-3.5 h-3.5" /> Server Uptime:
                  </span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                    {Math.floor(diagnostics.uptimeSeconds / 60)} minutes
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs">
                Connecting to server diagnostics...
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 text-blue-900 dark:text-blue-200 text-xs space-y-1.5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-4 h-4 text-[#4f6bf7]" />
              <span>How Developer Support Works</span>
            </div>
            <p className="text-[11px] text-blue-800 dark:text-blue-300">
              When submitted, an email containing your report and live server diagnostics is dispatched via SMTP directly to the developer's mailbox. You also have a 1-click fallback button to email directly via your mail client.
            </p>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Past Developer Support Requests</h2>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{history.length} logged request(s)</span>
        </div>

        {loadingHistory ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs">
            No developer support requests have been submitted yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Ticket ID</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {history.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-[#4f6bf7] dark:text-blue-400">{item.ticketId}</td>
                    <td className="py-3 px-3 font-semibold max-w-xs truncate text-slate-800 dark:text-slate-100">{item.subject}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400">{item.category}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.emailStatus === 'SENT'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                        }`}
                      >
                        {item.emailStatus === 'SENT' ? 'Sent to Dev' : 'Manual Dispatch'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 dark:text-slate-500">
                      {new Date(item.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
