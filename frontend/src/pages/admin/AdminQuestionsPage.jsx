import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import {
  HelpCircle,
  Plus,
  Edit,
  Copy,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Upload,
  Download,
  X,
  FileText,
  Play,
  Lock,
  Code2
} from 'lucide-react';

export default function AdminQuestionsPage() {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  const [questions, setQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk Selection State
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Excel Bulk Import Modal State
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const loadQuestions = async () => {
    try {
      const params = ['type=CODING'];
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (difficultyFilter) params.push(`difficulty=${difficultyFilter}`);
      const query = `?${params.join('&')}`;

      const res = await api.get(`/admin/questions${query}`);
      setQuestions(res.data.data.questions || []);
    } catch (err) {
      console.error('Failed to load questions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [searchTerm, difficultyFilter]);

  const handleDuplicate = async (id) => {
    const confirmed = await showConfirm({
      title: 'Duplicate Coding Question',
      message: 'Are you sure you want to duplicate this coding problem?',
      confirmText: 'Duplicate',
      isDanger: false,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/questions/${id}/duplicate`);
      await showAlert({
        title: 'Question Duplicated',
        message: 'Coding problem duplicated successfully!',
        type: 'success',
      });
      await loadQuestions();
    } catch (err) {
      await showAlert({
        title: 'Duplicate Failed',
        message: err.response?.data?.message || 'Failed to duplicate question',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm({
      title: 'Delete Question',
      message: 'Are you sure you want to delete this question?',
      confirmText: 'Delete Question',
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.delete(`/admin/questions/${id}`);
      await loadQuestions();
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete question',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const [togglingId, setTogglingId] = useState(null);

  const handleToggleCodeRun = async (q) => {
    try {
      setTogglingId(q._id);
      const nextVal = !q.allowCodeRun;
      await api.patch(`/admin/questions/${q._id}`, { allowCodeRun: nextVal });
      setQuestions((prev) =>
        prev.map((item) => (item._id === q._id ? { ...item, allowCodeRun: nextVal } : item))
      );
    } catch (err) {
      await showAlert({
        title: 'Update Failed',
        message: err.response?.data?.message || 'Failed to update code run setting',
        type: 'error',
      });
    } finally {
      setTogglingId(null);
    }
  };

  // Download Excel Question Template
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/admin/questions/template-excel', {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'question_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert({
        title: 'Download Failed',
        message: err.response?.data?.message || 'Failed to download question template',
        type: 'error',
      });
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedQuestions(questions.map((q) => q._id));
    } else {
      setSelectedQuestions([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedQuestions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) return;
    const confirmed = await showConfirm({
      title: 'Bulk Delete Questions',
      message: `Are you sure you want to permanently delete ${selectedQuestions.length} selected question(s) and their test cases?`,
      confirmText: `Delete ${selectedQuestions.length} Questions`,
      isDanger: true,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      const res = await api.post('/admin/questions/bulk-delete', {
        ids: selectedQuestions,
        questionIds: selectedQuestions,
      });
      await showAlert({
        title: 'Questions Deleted',
        message: res.data.message || `Successfully deleted ${selectedQuestions.length} questions.`,
        type: 'success',
      });
      setSelectedQuestions([]);
      await loadQuestions();
    } catch (err) {
      await showAlert({
        title: 'Bulk Delete Failed',
        message: err.response?.data?.message || 'Failed to delete selected questions.',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Excel Upload
  const handleExcelUpload = async (e) => {
    e.preventDefault();
    if (!excelFile) {
      await showAlert({
        title: 'File Required',
        message: 'Please select an Excel (.xlsx/.xls) file first before proceeding.',
        type: 'warning',
      });
      return;
    }

    const payload = new FormData();
    payload.append('file', excelFile);

    try {
      setIsUploading(true);
      setUploadStatus(null);
      const res = await api.post('/admin/questions/upload-excel', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowExcelModal(false);
      setExcelFile(null);

      const imported = res.data?.importedCount ?? res.data?.data?.importedCount ?? 0;
      const errors = res.data?.errors || res.data?.data?.errors || [];

      let errorSummary = '';
      if (errors && errors.length > 0) {
        const displayLimit = 5;
        const displayedErrors = errors.slice(0, displayLimit);
        errorSummary = `\n\nSpecific Errors:\n• ${displayedErrors.join('\n• ')}${errors.length > displayLimit ? `\n...and ${errors.length - displayLimit} more error(s)` : ''}`;
      }

      if (imported === 0 && errors.length > 0) {
        await showAlert({
          title: 'Question Import Failed',
          message: `Failed to import problems from Excel spreadsheet.${errorSummary}`,
          type: 'error',
        });
      } else if (errors.length > 0) {
        await showAlert({
          title: 'Import Completed with Warnings',
          message: `Imported ${imported} coding problem(s), but ${errors.length} problem(s) had errors.${errorSummary}`,
          type: 'warning',
        });
      } else {
        await showAlert({
          title: 'Upload Successful',
          message: res.data?.message || `Successfully imported ${imported} coding problem(s) with test suites!`,
          type: 'success',
        });
      }
      loadQuestions();
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to process Excel upload';
      const details = err.response?.data?.errors;
      const detailStr = Array.isArray(details) && details.length > 0 ? `\n\nDetails:\n• ${details.slice(0, 5).join('\n• ')}` : '';
      await showAlert({
        title: 'Upload Processing Failed',
        message: `${errorMsg}${detailStr}`,
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Question Bank</h1>
          <p className="text-sm text-slate-500 mt-1">Manage problem statements, test suites, and starter code</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {selectedQuestions.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedQuestions.length})</span>
            </button>
          )}

          <button
            onClick={() => {
              setExcelFile(null);
              setUploadStatus(null);
              setShowExcelModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Import via Excel</span>
          </button>

          <Link
            to="/admin/questions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Problem</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search problems..."
            className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {/* Question Table */}
      {questions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-slate-200 text-slate-500">
          <HelpCircle className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No questions found</h3>
          <p className="text-xs text-slate-500 mt-1">Add problems manually or import them using Excel.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1150px] text-left text-xs whitespace-nowrap">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={questions.length > 0 && selectedQuestions.length === questions.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Description</th>
                  <th className="py-3 px-4 font-semibold">Difficulty</th>
                  <th className="py-3 px-4 font-semibold">Marks</th>
                  <th className="py-3 px-4 font-semibold">Test Cases</th>
                  <th className="py-3 px-4 font-semibold">Run Code</th>
                  <th className="py-3 px-4 font-semibold">Languages</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {questions.map((q) => {
                  const isSelected = selectedQuestions.includes(q._id);
                  const isCoding = (q.type || 'CODING') === 'CODING';
                  return (
                  <tr key={q._id} className={`text-slate-600 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(q._id)}
                        className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 accent-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800 text-xs whitespace-nowrap max-w-xs truncate" title={q.title}>
                      {q.title}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-xs whitespace-nowrap max-w-[240px] truncate" title={q.description || ''}>
                      {q.description || '—'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : q.difficulty === 'MEDIUM'
                            ? 'bg-amber-50 text-amber-600 border border-amber-200'
                            : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold whitespace-nowrap text-slate-700">{q.marks}</td>
                    <td className="py-3 px-4 font-mono whitespace-nowrap text-slate-600">{q.testCaseCount || 0} Cases</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {!isCoding ? (
                        <span className="text-[10px] text-slate-400 font-medium">—</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleCodeRun(q)}
                          disabled={togglingId === q._id}
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                            q.allowCodeRun
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 shadow-sm shadow-emerald-500/10'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                          title={q.allowCodeRun ? 'Code run enabled on this question. Click to lock.' : 'Code run disabled. Click to allow.'}
                        >
                          {q.allowCodeRun ? (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Allowed</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-2.5 h-2.5" />
                              <span>Locked</span>
                            </>
                          )}
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {(q.allowedLanguages || []).slice(0, 4).map((lang) => (
                          <span key={lang} className="px-1.5 py-0.5 rounded bg-slate-100 text-[10px] font-mono text-slate-600 uppercase border border-slate-200">
                            {lang}
                          </span>
                        ))}
                        {(q.allowedLanguages?.length || 0) > 4 && (
                          <span className="text-[10px] text-slate-400">+{q.allowedLanguages.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/questions/${q._id}/edit`}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Edit Question & Test Cases"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(q._id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors cursor-pointer"
                          title="Duplicate Question"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(q._id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* EXCEL QUESTIONS IMPORT MODAL */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Bulk Import Questions from Excel</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload multiple coding problems and test suites in a single sheet</p>
                </div>
              </div>
              <button
                onClick={() => setShowExcelModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Instructions Box */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Excel Column Specifications & Guidelines</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-semibold transition-all cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample Template (.xlsx)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px]">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-900/50 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                      <span>Mandatory Problem Fields (<span className="text-red-500 font-bold">*</span>)</span>
                    </div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Title <span className="text-red-500 font-bold">*</span> :</strong> Problem title (unique name)</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Description <span className="text-red-500 font-bold">*</span> :</strong> Complete question statement</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">SampleInput1 <span className="text-red-500 font-bold">*</span> :</strong> 1st public testcase input</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">SampleOutput1 <span className="text-red-500 font-bold">*</span> :</strong> 1st public testcase output</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">HiddenInput1 <span className="text-red-500 font-bold">*</span> :</strong> 1st hidden evaluation input</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">HiddenOutput1 <span className="text-red-500 font-bold">*</span> :</strong> 1st hidden evaluation output</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>Optional Evaluation Fields</span>
                    </div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Difficulty:</strong> EASY, MEDIUM, or HARD (default: MEDIUM)</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Marks:</strong> Points awarded (default: 10)</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">AllowedLanguages:</strong> java, python, javascript</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">InputFormat, OutputFormat, Constraints</strong></li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Explanation1:</strong> Optional sample explanation</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">HiddenInput2..10 & HiddenOutput2..10</strong></li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleExcelUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-xl p-6 text-center space-y-3 transition-colors bg-slate-50 dark:bg-slate-800/50">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                  <div>
                    <label className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 cursor-pointer hover:underline">
                      Click to choose an .xlsx or .xls file
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-400 mt-1">Microsoft Excel Spreadsheet format only</p>
                  </div>
                  {excelFile && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-xs font-medium">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowExcelModal(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!excelFile || isUploading}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importing Questions...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Import Questions</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Status Report */}
              {uploadStatus && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  uploadStatus.data?.errorCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {uploadStatus.data?.errorCount > 0 ? (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>{uploadStatus.message}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <p>Successfully Imported: <strong className="font-mono text-emerald-600">{uploadStatus.data?.importedCount || 0}</strong></p>
                    <p>Errors Encountered: <strong className="font-mono text-rose-600">{uploadStatus.data?.errorCount || 0}</strong></p>
                  </div>
                  {uploadStatus.data?.errors?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-rose-600 space-y-1">
                      <p className="font-semibold text-rose-700">Validation Failures:</p>
                      <ul className="list-disc list-inside space-y-0.5 max-h-32 overflow-y-auto">
                        {uploadStatus.data.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
