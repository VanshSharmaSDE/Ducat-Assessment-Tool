import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import {
  HelpCircle,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Shield,
  Eye,
  FileCode,
  Terminal,
  Clock,
  Layers
} from 'lucide-react';

const ALL_LANGUAGES = ['java', 'python', 'javascript', 'c', 'cpp', 'sql'];

export default function AdminQuestionEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const { showAlert, showConfirm } = useModal();

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '',
    explanation: '',
    difficulty: 'MEDIUM',
    marks: 20,
    timeLimit: 2,
    memoryLimit: 256,
    comparisonMode: 'TRIMMED',
    allowCodeRun: true,
    allowedLanguages: ALL_LANGUAGES,
    examples: [{ input: '', output: '', explanation: '' }],
  });

  // Test cases for this question
  const [testCases, setTestCases] = useState([]);
  const [newTc, setNewTc] = useState({
    input: '',
    expectedOutput: '',
    isHidden: true,
    marks: 5,
  });

  useEffect(() => {
    async function loadQuestion() {
      if (!isEditing) return;
      try {
        const res = await api.get(`/admin/questions/${id}`);
        const q = res.data.data.question;
        setFormData({
          title: q.title,
          description: q.description,
          inputFormat: q.inputFormat || '',
          outputFormat: q.outputFormat || '',
          constraints: q.constraints || '',
          explanation: q.explanation || '',
          difficulty: q.difficulty,
          marks: q.marks,
          timeLimit: q.timeLimit || 2,
          memoryLimit: q.memoryLimit || 256,
          comparisonMode: q.comparisonMode || 'TRIMMED',
          allowCodeRun: q.allowCodeRun !== undefined && q.allowCodeRun !== null ? Boolean(q.allowCodeRun) : true,
          allowedLanguages: q.allowedLanguages || ALL_LANGUAGES,
          examples: q.examples?.length ? q.examples : [{ input: '', output: '', explanation: '' }],
        });

        // Load test cases
        const tcRes = await api.get(`/admin/questions/${id}/testcases`);
        setTestCases(tcRes.data.data.testCases || []);
      } catch (err) {
        setError('Failed to load question details');
      } finally {
        setLoading(false);
      }
    }
    loadQuestion();
  }, [id, isEditing]);

  const handleLanguageToggle = (lang) => {
    const list = formData.allowedLanguages.includes(lang)
      ? formData.allowedLanguages.filter((l) => l !== lang)
      : [...formData.allowedLanguages, lang];
    setFormData({ ...formData, allowedLanguages: list });
  };

  const handleExampleChange = (index, field, value) => {
    const updated = [...formData.examples];
    updated[index][field] = value;
    setFormData({ ...formData, examples: updated });
  };

  const addExample = () => {
    setFormData({
      ...formData,
      examples: [...formData.examples, { input: '', output: '', explanation: '' }],
    });
  };

  const removeExample = (index) => {
    if (formData.examples.length <= 1) {
      showAlert({
        title: 'Requirement',
        message: 'At least one example with Expected Output is mandatory for coding problems.',
        type: 'warning',
      });
      return;
    }
    const updated = formData.examples.filter((_, i) => i !== index);
    setFormData({ ...formData, examples: updated });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title?.trim()) {
      setError('Problem Title is required');
      await showAlert({
        title: 'Validation Error',
        message: 'Problem Title is required.',
        type: 'warning',
      });
      return;
    }

    if (!formData.description?.trim()) {
      setError('Problem Description is required');
      await showAlert({
        title: 'Validation Error',
        message: 'Problem Description is required.',
        type: 'warning',
      });
      return;
    }

    const isNew = !isEditing;
    const confirmed = await showConfirm({
      title: isNew ? 'Create Coding Problem' : 'Update Coding Problem',
      message: isNew
        ? `Are you sure you want to create the coding problem "${formData.title.trim()}" with ${testCases.length} test case(s)?`
        : `Are you sure you want to save changes to the coding problem "${formData.title.trim()}"?`,
      confirmText: isNew ? 'Create Problem' : 'Save Changes',
      cancelText: 'Cancel',
      type: 'info',
      isDanger: false,
    });
    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      // Clean up examples: filter out completely empty example objects
      const sanitizedExamples = (formData.examples || [])
        .filter(
          (ex) =>
            ex &&
            ((ex.input && String(ex.input).trim()) ||
             (ex.output && String(ex.output).trim()) ||
             (ex.explanation && String(ex.explanation).trim()))
        )
        .map((ex) => ({
          input: (ex.input || '').trim(),
          output: (ex.output || '').trim(),
          explanation: (ex.explanation || '').trim(),
        }));

      const payload = {
        ...formData,
        type: 'CODING',
        title: formData.title.trim(),
        description: formData.description.trim(),
        examples: sanitizedExamples,
        marks: Number(formData.marks) || 20,
        timeLimit: Number(formData.timeLimit) || 2,
        memoryLimit: Number(formData.memoryLimit) || 256,
      };

      if (isEditing) {
        await api.put(`/admin/questions/${id}`, payload);
        // Persist any newly added test cases if any
        const newCases = testCases.filter((tc) => String(tc._id).startsWith('temp_'));
        for (const tc of newCases) {
          await api.post(`/admin/questions/${id}/testcases`, {
            input: tc.input || '',
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
            marks: 5,
          }).catch((err) => console.error(err));
        }
        await showAlert({
          title: 'Question Updated',
          message: 'Coding problem updated successfully!',
          type: 'success',
        });
        navigate('/admin/questions');
      } else {
        const createPayload = {
          ...payload,
          testCases: testCases.map((tc) => ({
            input: tc.input || '',
            expectedOutput: tc.expectedOutput,
            isHidden: tc.isHidden,
            marks: 5,
          })),
        };
        const res = await api.post('/admin/questions', createPayload);
        const savedQId = res.data?.data?.question?._id;

        // Safety fallback to guarantee test cases are present
        if (savedQId) {
          const checkCases = await api.get(`/admin/questions/${savedQId}/testcases`).catch(() => ({ data: { data: { testCases: [] } } }));
          if ((checkCases.data?.data?.testCases || []).length === 0 && testCases.length > 0) {
            for (const tc of testCases) {
              await api.post(`/admin/questions/${savedQId}/testcases`, {
                input: tc.input || '',
                expectedOutput: tc.expectedOutput,
                isHidden: tc.isHidden,
                marks: 5,
              }).catch((e) => console.error(e));
            }
          }
        }

        await showAlert({
          title: 'Question Created',
          message: 'Coding problem and all test cases created successfully!',
          type: 'success',
        });
        navigate('/admin/questions');
      }
    } catch (err) {
      const respData = err.response?.data;
      if (respData?.errors && Array.isArray(respData.errors) && respData.errors.length > 0) {
        const errDetails = respData.errors.map((item) => `${item.field}: ${item.message}`).join(', ');
        setError(`Validation error (${errDetails})`);
        await showAlert({
          title: 'Validation Error',
          message: `Validation error (${errDetails})`,
          type: 'error',
        });
      } else {
        const msg = respData?.message || err.message || 'Failed to save question';
        setError(msg);
        await showAlert({
          title: 'Save Failed',
          message: msg,
          type: 'error',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddTestCase = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!newTc.expectedOutput || !newTc.expectedOutput.trim()) {
      await showAlert({
        title: 'Input Missing',
        message: 'Expected output is required for the test case.',
        type: 'warning',
      });
      return;
    }

    const tcData = {
      input: (newTc.input || '').trim(),
      expectedOutput: newTc.expectedOutput.trim(),
      isHidden: Boolean(newTc.isHidden),
      marks: 5,
    };

    if (!isEditing) {
      // In create mode: store locally in testCases state
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      setTestCases((prev) => [...prev, { ...tcData, _id: tempId }]);
      setNewTc({ input: '', expectedOutput: '', isHidden: true, marks: 5 });
      return;
    }

    // In edit mode: save directly to server
    try {
      const res = await api.post(`/admin/questions/${id}/testcases`, tcData);
      setTestCases((prev) => [...prev, res.data.data.testCase]);
      setNewTc({ input: '', expectedOutput: '', isHidden: true, marks: 5 });
    } catch (err) {
      await showAlert({
        title: 'Addition Failed',
        message: err.response?.data?.message || 'Failed to add test case',
        type: 'error',
      });
    }
  };

  const handleDeleteTestCase = async (tcId) => {
    const confirmed = await showConfirm({
      title: 'Delete Test Case',
      message: 'Are you sure you want to delete this test case?',
      confirmText: 'Delete',
      isDanger: true,
    });
    if (!confirmed) return;

    if (!isEditing || String(tcId).startsWith('temp_')) {
      setTestCases((prev) => prev.filter((tc) => tc._id !== tcId));
      return;
    }

    try {
      await api.delete(`/admin/testcases/${tcId}`);
      setTestCases((prev) => prev.filter((tc) => tc._id !== tcId));
    } catch (err) {
      await showAlert({
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Failed to delete test case',
        type: 'error',
      });
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
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/admin/questions" className="text-xs text-slate-500 hover:text-slate-800 transition-colors mb-2 inline-block">
            &larr; Back to Question Bank
          </Link>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            {isEditing ? `Edit Problem: ${formData.title}` : 'Create New Problem'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Configure statement, I/O formats, limits and test suites</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSaveQuestion} className="space-y-6">
        {/* Main Problem Details */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-blue-600" /> Problem Specifications
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Problem Title <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Two Sum"
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Problem Description <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <textarea
              rows={5}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="State the problem clearly, including preconditions and expected behavior..."
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Input Format
              </label>
              <textarea
                rows={3}
                value={formData.inputFormat}
                onChange={(e) => setFormData({ ...formData, inputFormat: e.target.value })}
                placeholder="Specification of standard input format..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Output Format
              </label>
              <textarea
                rows={3}
                value={formData.outputFormat}
                onChange={(e) => setFormData({ ...formData, outputFormat: e.target.value })}
                placeholder="Specification of standard output format..."
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Constraints
            </label>
            <textarea
              rows={2}
              value={formData.constraints}
              onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
              placeholder="e.g. 1 <= n <= 10^5, -10^9 <= nums[i] <= 10^9"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Limits & Evaluation Rules */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" /> Resource Limits & Judging Mode
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Marks
              </label>
              <input
                type="number"
                min={1}
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Time Limit (Seconds)
              </label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                max={15}
                value={formData.timeLimit}
                onChange={(e) => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Memory Limit (MB)
              </label>
              <input
                type="number"
                min={32}
                max={1024}
                value={formData.memoryLimit}
                onChange={(e) => setFormData({ ...formData, memoryLimit: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Output Comparison Mode
              </label>
              <select
                value={formData.comparisonMode}
                onChange={(e) => setFormData({ ...formData, comparisonMode: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="TRIMMED">TRIMMED (Standard)</option>
                <option value="EXACT">EXACT</option>
                <option value="WHITESPACE_INSENSITIVE">WHITESPACE_INSENSITIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Allowed Programming Languages
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_LANGUAGES.map((lang) => {
                const checked = formData.allowedLanguages.includes(lang);
                return (
                  <button
                    type="button"
                    key={lang}
                    onClick={() => handleLanguageToggle(lang)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-mono uppercase font-bold border transition-all ${
                      checked
                        ? 'bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {lang} {checked ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allow Code Run Toggle */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div>
              <label className="text-xs font-semibold text-slate-800 block">
                Allow Code Execution (Run Code Button)
              </label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Enable this to allow candidates to run and test their code with custom input on this problem, even when the overall exam-level toggle is disabled.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, allowCodeRun: !formData.allowCodeRun })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                formData.allowCodeRun ? 'bg-blue-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formData.allowCodeRun ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Public Examples */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-600" /> Public Problem Examples (Optional)
            </h2>
            <button
              type="button"
              onClick={addExample}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
            >
              + Add Example
            </button>
          </div>

          {formData.examples.map((ex, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Example #{idx + 1}
                </span>
                {formData.examples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExample(idx)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                    title="Remove Example"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Example Input (stdin)
                  </label>
                  <textarea
                    rows={2}
                    value={ex.input}
                    onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                    placeholder="Input provided to program (optional)..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                    Expected Output <span className="text-red-500 font-bold ml-0.5">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={ex.output}
                    onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                    placeholder="Expected output of program (optional)..."
                    className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Explanation (Optional):</label>
                <input
                  type="text"
                  value={ex.explanation || ''}
                  onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                  placeholder="e.g. nums[0] + nums[1] == 9"
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Test Case Management Section (Always active for both creation and editing) */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" /> Test Suite Management (Unhidden & Hidden Cases)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure test cases for automated code judging. Test cases are optional; problems can be saved without test cases and configured later.
              </p>
            </div>

            {/* Test Case Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                testCases.filter((tc) => !tc.isHidden).length > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {testCases.filter((tc) => !tc.isHidden).length > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Eye className="w-3.5 h-3.5 text-slate-400" />
                )}
                Public Cases ({testCases.filter((tc) => !tc.isHidden).length})
              </span>

              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                testCases.filter((tc) => tc.isHidden).length > 0
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}>
                {testCases.filter((tc) => tc.isHidden).length > 0 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                )}
                Hidden Cases ({testCases.filter((tc) => tc.isHidden).length})
              </span>
            </div>
          </div>

          {/* Existing Test Cases Table */}
          <div className="space-y-3">
            {testCases.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                No test cases configured yet. Add at least one public and one hidden test case below.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 bg-slate-50">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Input</th>
                      <th className="py-2.5 px-3">Expected Output</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {testCases.map((tc, idx) => (
                      <tr key={tc._id || idx} className="text-slate-600 hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tc.isHidden
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {tc.isHidden ? '🔒 HIDDEN (Private)' : '👁 UNHIDDEN (Public)'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-500">
                          {tc.input || '(empty)'}
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate text-emerald-600 font-semibold">
                          {tc.expectedOutput}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleDeleteTestCase(tc._id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete test case"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add New Test Case Card */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">+ Add New Test Case</h4>

            {/* Test Case Type Selection: Public vs Hidden */}
            <div>
              <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                Test Case Visibility <span className="text-red-500 font-bold ml-0.5">*</span>:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    !newTc.isHidden
                      ? 'bg-emerald-50/70 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="tcType"
                    checked={!newTc.isHidden}
                    onChange={() => setNewTc({ ...newTc, isHidden: false })}
                    className="mt-0.5 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold flex items-center gap-1.5 text-emerald-800">
                      👁 Unhidden (Public Test Case)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Visible to student in testcase console. Student can run code against this testcase like LeetCode.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    newTc.isHidden
                      ? 'bg-purple-50/70 border-purple-400 text-purple-950 ring-1 ring-purple-400'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="tcType"
                    checked={newTc.isHidden}
                    onChange={() => setNewTc({ ...newTc, isHidden: true })}
                    className="mt-0.5 text-purple-600 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold flex items-center gap-1.5 text-purple-800">
                      🔒 Hidden (Private Test Case)
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Confidential. Evaluated strictly during exam final submission to compute student score.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Standard Input (stdin):</label>
                <textarea
                  rows={3}
                  value={newTc.input}
                  onChange={(e) => setNewTc({ ...newTc, input: e.target.value })}
                  placeholder="Input provided to program (optional)..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Expected Output (stdout) <span className="text-red-500 font-bold ml-0.5">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={newTc.expectedOutput}
                  onChange={(e) => setNewTc({ ...newTc, expectedOutput: e.target.value })}
                  placeholder="Exact expected standard output..."
                  className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-emerald-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAddTestCase}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 cursor-pointer"
              >
                + Add Test Case
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Form Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Link
            to="/admin/questions"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? (isEditing ? 'Updating Problem...' : 'Creating Problem...') : isEditing ? 'Update Problem' : 'Create Problem'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
