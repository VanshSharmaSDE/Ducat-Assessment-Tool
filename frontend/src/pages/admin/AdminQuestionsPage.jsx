import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  FileText
} from 'lucide-react';

export default function AdminQuestionsPage() {
  const { showAlert, showConfirm } = useModal();
  const [questions, setQuestions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Excel Bulk Import Modal State
  const [showExcelModal, setShowExcelModal] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const loadQuestions = async () => {
    try {
      let query = '';
      const params = [];
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
      if (difficultyFilter) params.push(`difficulty=${difficultyFilter}`);
      if (params.length) query = `?${params.join('&')}`;

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
    try {
      setActionLoading(true);
      await api.post(`/admin/questions/${id}/duplicate`);
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
      setUploadStatus(res.data);
      loadQuestions();
    } catch (err) {
      await showAlert({
        title: 'Upload Processing Failed',
        message: err.response?.data?.message || 'Failed to process Excel upload',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Question Bank</h1>
          <p className="text-sm text-slate-400 mt-1">Manage problem statements, test suites, and starter code</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setExcelFile(null);
              setUploadStatus(null);
              setShowExcelModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload Questions (Excel)</span>
          </button>

          <Link
            to="/admin/questions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create Problem</span>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search problems..."
            className="pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <select
          value={difficultyFilter}
          onChange={(e) => setDifficultyFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
        >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>
      </div>

      {/* Question Table */}
      {questions.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400">
          <HelpCircle className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-base font-semibold text-white">No questions found</h3>
          <p className="text-xs text-slate-400 mt-1">Add problems manually or import them using Excel.</p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/40">
                  <th className="py-3.5 px-4 font-semibold">Title</th>
                  <th className="py-3.5 px-4 font-semibold">Difficulty</th>
                  <th className="py-3.5 px-4 font-semibold">Marks</th>
                  <th className="py-3.5 px-4 font-semibold">Test Cases</th>
                  <th className="py-3.5 px-4 font-semibold">Languages</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {questions.map((q) => (
                  <tr key={q._id} className="text-slate-300 hover:bg-slate-800/40">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-white text-sm">{q.title}</p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">{q.description}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          q.difficulty === 'EASY'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : q.difficulty === 'MEDIUM'
                            ? 'bg-amber-500/10 text-amber-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold">{q.marks}</td>
                    <td className="py-3.5 px-4 font-mono">{q.testCaseCount || 0} Cases</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(q.allowedLanguages || []).slice(0, 4).map((lang) => (
                          <span key={lang} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300 uppercase">
                            {lang}
                          </span>
                        ))}
                        {(q.allowedLanguages?.length || 0) > 4 && (
                          <span className="text-[10px] text-slate-500">+{q.allowedLanguages.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/questions/${q._id}/edit`}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Edit Question & Test Cases"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDuplicate(q._id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-400 hover:bg-slate-700 transition-colors"
                          title="Duplicate Question"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(q._id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EXCEL QUESTIONS IMPORT MODAL */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Bulk Import Questions from Excel</h3>
                  <p className="text-xs text-slate-400">Upload multiple coding problems and test suites in a single sheet</p>
                </div>
              </div>
              <button
                onClick={() => setShowExcelModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {/* Instructions Box */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-slate-200">
                    <FileText className="w-4 h-4 text-amber-400" />
                    <span>Excel Column Specifications & Guidelines</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[11px] font-semibold transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Sample Template (.xlsx)</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-1">
                    <p className="font-semibold text-slate-200">Core Problem Fields:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                      <li><strong className="text-slate-300">Title:</strong> Name of problem (Required)</li>
                      <li><strong className="text-slate-300">Description:</strong> Problem text (Required)</li>
                      <li><strong className="text-slate-300">Difficulty:</strong> EASY, MEDIUM, or HARD</li>
                      <li><strong className="text-slate-300">Marks:</strong> Integer value (default: 10)</li>
                      <li><strong className="text-slate-300">AllowedLanguages:</strong> java, python, javascript</li>
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 space-y-1">
                    <p className="font-semibold text-slate-200">Test Cases & Constraints:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                      <li><strong className="text-slate-300">SampleInput1 & SampleOutput1:</strong> Public example</li>
                      <li><strong className="text-slate-300">SampleExplanation1:</strong> Optional logic explanation</li>
                      <li><strong className="text-slate-300">HiddenInput1 & HiddenOutput1:</strong> Evaluation test case</li>
                      <li>Supports <strong className="text-slate-300">HiddenInput1..10</strong> for multiple test cases</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Form */}
              <form onSubmit={handleExcelUpload} className="space-y-4">
                <div className="border-2 border-dashed border-slate-800 hover:border-emerald-500/50 rounded-xl p-6 text-center space-y-3 transition-colors bg-slate-950/40">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                  <div>
                    <label className="text-xs font-semibold text-emerald-400 cursor-pointer hover:underline">
                      Click to choose an .xlsx or .xls file
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setExcelFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-slate-500 mt-1">Microsoft Excel Spreadsheet format only</p>
                  </div>
                  {excelFile && (
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-lg text-xs font-medium">
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>{excelFile.name} ({(excelFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowExcelModal(false)}
                    className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!excelFile || isUploading}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all"
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
                    ? 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                    : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {uploadStatus.data?.errorCount > 0 ? (
                      <AlertCircle className="w-4 h-4 text-amber-400" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>{uploadStatus.message}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <p>Successfully Imported: <strong className="font-mono text-emerald-400">{uploadStatus.data?.importedCount || 0}</strong></p>
                    <p>Errors Encountered: <strong className="font-mono text-rose-400">{uploadStatus.data?.errorCount || 0}</strong></p>
                  </div>
                  {uploadStatus.data?.errors?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-rose-300 space-y-1">
                      <p className="font-semibold text-rose-200">Validation Failures:</p>
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
