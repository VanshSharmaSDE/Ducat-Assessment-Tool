import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import {
  CheckSquare,
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
  HelpCircle,
  X,
  FileText
} from 'lucide-react';

export default function AdminMcqQuestionsPage() {
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
      let query = '?type=MCQ';
      if (searchTerm) query += `&search=${encodeURIComponent(searchTerm)}`;
      if (difficultyFilter) query += `&difficulty=${difficultyFilter}`;

      const res = await api.get(`/admin/questions${query}`);
      setQuestions(res.data.data.questions || []);
    } catch (err) {
      console.error('Failed to load MCQ questions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [searchTerm, difficultyFilter]);

  const handleDuplicate = async (id) => {
    const confirmed = await showConfirm({
      title: 'Duplicate MCQ Question',
      message: 'Are you sure you want to duplicate this multiple-choice question?',
      confirmText: 'Duplicate',
      isDanger: false,
    });
    if (!confirmed) return;

    try {
      setActionLoading(true);
      await api.post(`/admin/questions/${id}/duplicate`);
      await showAlert({
        title: 'MCQ Duplicated',
        message: 'Multiple-choice question duplicated successfully!',
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
      title: 'Delete MCQ Question',
      message: 'Are you sure you want to delete this multiple-choice question?',
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

  // Download Excel MCQ Question Template
  const handleDownloadTemplate = async () => {
    try {
      const response = await api.get('/admin/mcq-questions/template-excel', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mcq_question_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      await showAlert({
        title: 'Download Failed',
        message: err.response?.data?.message || 'Failed to download MCQ template',
        type: 'error',
      });
    }
  };

  // Toggle single selection
  const handleToggleSelect = (qId) => {
    setSelectedQuestions((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  // Toggle select all
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedQuestions(questions.map((q) => q._id));
    } else {
      setSelectedQuestions([]);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) return;

    const confirmed = await showConfirm({
      title: `Delete ${selectedQuestions.length} Questions?`,
      message: `Are you sure you want to permanently delete these ${selectedQuestions.length} selected MCQ questions?`,
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
      const res = await api.post('/admin/mcq-questions/upload-excel', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowExcelModal(false);
      setExcelFile(null);
      await showAlert({
        title: 'Upload Successful',
        message: res.data.message || `Successfully imported MCQ questions from Excel file.`,
        type: 'success',
      });
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <CheckSquare className="w-7 h-7 text-blue-600" />
            MCQ Question Bank
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Create, review, and manage multiple-choice questions with instant auto-grading
          </p>
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
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Bulk Import via Excel</span>
          </button>

          <Link
            to="/admin/mcq-questions/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create MCQ Question</span>
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
            placeholder="Search MCQ questions..."
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
          <CheckSquare className="w-12 h-12 mx-auto text-slate-400 mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No MCQ questions found</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Create MCQ Question" to add your first multiple choice problem.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-xs whitespace-nowrap">
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
                  <th className="py-3 px-4 font-semibold">Title / Statement</th>
                  <th className="py-3 px-4 font-semibold">Options Count</th>
                  <th className="py-3 px-4 font-semibold">Correct Answer</th>
                  <th className="py-3 px-4 font-semibold">Difficulty</th>
                  <th className="py-3 px-4 font-semibold">Marks</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {questions.map((q) => {
                  const isSelected = selectedQuestions.includes(q._id);
                  const correctIdx = q.correctAnswer;
                  const correctText = q.options && correctIdx !== undefined && correctIdx !== null && q.options[correctIdx]
                    ? `Option ${String.fromCharCode(65 + correctIdx)}: ${q.options[correctIdx].text}`
                    : 'Not specified';

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
                      <td className="py-3 px-4 font-bold text-slate-800 text-xs whitespace-nowrap max-w-md truncate" title={q.title}>
                        {q.title}
                        {q.description && q.description !== q.title && (
                          <span className="block font-normal text-slate-500 text-[11px] truncate max-w-sm mt-0.5">
                            {q.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono text-slate-700 border border-slate-200">
                          {q.options?.length || 0} Options
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap max-w-xs truncate font-medium text-emerald-700" title={correctText}>
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span className="truncate">{correctText}</span>
                        </span>
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
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDuplicate(q._id)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Duplicate MCQ"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            to={`/admin/mcq-questions/${q._id}/edit`}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-slate-200 transition-colors cursor-pointer"
                            title="Edit MCQ"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            onClick={() => handleDelete(q._id)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete MCQ"
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

      {/* BULK EXCEL UPLOAD MODAL */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col shadow-xl">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Bulk Upload MCQ Questions via Excel</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload multiple multiple-choice questions via spreadsheet</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExcelModal(false);
                  setUploadStatus(null);
                  setExcelFile(null);
                }}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-0.5">
              {/* Guidelines / Specifications */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                    <HelpCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>MCQ Excel Column Specifications:</span>
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
                      <span>Mandatory MCQ Fields (<span className="text-red-500 font-bold">*</span>)</span>
                    </div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Question Title <span className="text-red-500 font-bold">*</span> :</strong> Problem / question statement</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Option A <span className="text-red-500 font-bold">*</span> :</strong> First option choice</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Option B <span className="text-red-500 font-bold">*</span> :</strong> Second option choice</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Correct Answer <span className="text-red-500 font-bold">*</span> :</strong> Option letter (A, B, C, D, E) or index (1..5)</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-blue-600 dark:text-blue-400">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span>Optional Evaluation Fields</span>
                    </div>
                    <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Option C, Option D, Option E:</strong> Additional choices</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Difficulty:</strong> EASY, MEDIUM, or HARD (default: MEDIUM)</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Marks:</strong> Points awarded (default: 1)</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Description:</strong> Optional code snippet or background context</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Explanation:</strong> Rationales displayed in evaluation review</li>
                      <li><strong className="text-slate-800 dark:text-slate-100 font-mono">Tags:</strong> Comma-separated categories or topics</li>
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
                    <p className="text-[11px] text-slate-400 mt-1">Microsoft Excel format (.xlsx / .xls)</p>
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
                    onClick={() => {
                      setShowExcelModal(false);
                      setUploadStatus(null);
                      setExcelFile(null);
                    }}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!excelFile || isUploading}
                    className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    {isUploading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Importing MCQs...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload & Import MCQs</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Status Report */}
              {uploadStatus && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                  uploadStatus.data?.failedCount > 0
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    {uploadStatus.data?.failedCount > 0 ? (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>{uploadStatus.message}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <p>Successfully Imported: <strong className="font-mono text-emerald-600">{uploadStatus.data?.importedCount || 0}</strong></p>
                    <p>Errors Encountered: <strong className="font-mono text-rose-600">{uploadStatus.data?.failedCount || 0}</strong></p>
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
