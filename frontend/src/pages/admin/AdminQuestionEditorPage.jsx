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

const ALL_LANGUAGES = ['java', 'python', 'javascript'];

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
    const updated = formData.examples.filter((_, i) => i !== index);
    setFormData({ ...formData, examples: updated });
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      let savedQId = id;
      if (isEditing) {
        await api.put(`/admin/questions/${id}`, formData);
        setSuccess('Question updated successfully');
      } else {
        const res = await api.post('/admin/questions', formData);
        savedQId = res.data.data.question._id;
        setSuccess('Question created successfully! You can now manage test cases.');
        navigate(`/admin/questions/${savedQId}/edit`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save question');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTestCase = async (e) => {
    e.preventDefault();
    if (!isEditing) {
      await showAlert({
        title: 'Save Required',
        message: 'Please save the question first before adding test cases.',
        type: 'warning',
      });
      return;
    }
    if (!newTc.expectedOutput.trim()) {
      await showAlert({
        title: 'Input Missing',
        message: 'Expected output is required.',
        type: 'warning',
      });
      return;
    }

    try {
      const res = await api.post(`/admin/questions/${id}/testcases`, newTc);
      setTestCases([...testCases, res.data.data.testCase]);
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

    try {
      await api.delete(`/admin/testcases/${tcId}`);
      setTestCases(testCases.filter((tc) => tc._id !== tcId));
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
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/admin/questions" className="text-xs text-slate-400 hover:text-white transition-colors mb-2 inline-block">
            &larr; Back to Question Bank
          </Link>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            {isEditing ? `Edit Problem: ${formData.title}` : 'Create New Problem'}
          </h1>
          <p className="text-sm text-slate-400 mt-1">Configure statement, I/O formats, limits and test suites</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSaveQuestion} className="space-y-6">
        {/* Main Problem Details */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" /> Problem Specifications
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Problem Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Two Sum"
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Problem Description *
            </label>
            <textarea
              rows={5}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="State the problem clearly, including preconditions and expected behavior..."
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Input Format
              </label>
              <textarea
                rows={3}
                value={formData.inputFormat}
                onChange={(e) => setFormData({ ...formData, inputFormat: e.target.value })}
                placeholder="Specification of standard input format..."
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Output Format
              </label>
              <textarea
                rows={3}
                value={formData.outputFormat}
                onChange={(e) => setFormData({ ...formData, outputFormat: e.target.value })}
                placeholder="Specification of standard output format..."
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Constraints
            </label>
            <textarea
              rows={2}
              value={formData.constraints}
              onChange={(e) => setFormData({ ...formData, constraints: e.target.value })}
              placeholder="e.g. 1 <= n <= 10^5, -10^9 <= nums[i] <= 10^9"
              className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Limits & Evaluation Rules */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-400" /> Resource Limits & Judging Mode
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Default Marks
              </label>
              <input
                type="number"
                min={1}
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Time Limit (Seconds)
              </label>
              <input
                type="number"
                step="0.5"
                min={0.5}
                max={15}
                value={formData.timeLimit}
                onChange={(e) => setFormData({ ...formData, timeLimit: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Memory Limit (MB)
              </label>
              <input
                type="number"
                min={32}
                max={1024}
                value={formData.memoryLimit}
                onChange={(e) => setFormData({ ...formData, memoryLimit: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Output Comparison Mode
              </label>
              <select
                value={formData.comparisonMode}
                onChange={(e) => setFormData({ ...formData, comparisonMode: e.target.value })}
                className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="TRIMMED">TRIMMED (Standard)</option>
                <option value="EXACT">EXACT</option>
                <option value="WHITESPACE_INSENSITIVE">WHITESPACE_INSENSITIVE</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
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
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                    }`}
                  >
                    {lang} {checked ? '✓' : ''}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Public Examples */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" /> Public Problem Examples (Visible to Candidates)
            </h2>
            <button
              type="button"
              onClick={addExample}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              + Add Example
            </button>
          </div>

          {formData.examples.map((ex, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">Example #{idx + 1}</span>
                {formData.examples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExample(idx)}
                    className="text-slate-500 hover:text-rose-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Example Input:</label>
                  <textarea
                    rows={2}
                    value={ex.input}
                    onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Expected Output:</label>
                  <textarea
                    rows={2}
                    value={ex.output}
                    onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                    className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Explanation (Optional):</label>
                <input
                  type="text"
                  value={ex.explanation || ''}
                  onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                  placeholder="e.g. nums[0] + nums[1] == 9"
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-300"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Problem...' : isEditing ? 'Update Problem' : 'Create Problem'}</span>
          </button>
        </div>
      </form>

      {/* Test Case Management Section (Only active when editing an existing problem) */}
      {isEditing && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" /> Test Suite Management (Hidden & Private Cases)
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Hidden test cases are strictly executed inside Docker containers and never sent to candidate browsers.
            </p>
          </div>

          {/* Existing Test Cases Table */}
          <div className="space-y-3">
            {testCases.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                No test cases configured yet. Add test cases below.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Input</th>
                      <th className="py-2.5 px-3">Expected Output</th>
                      <th className="py-2.5 px-3">Marks</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {testCases.map((tc, idx) => (
                      <tr key={tc._id} className="text-slate-300">
                        <td className="py-2.5 px-3">{idx + 1}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              tc.isHidden
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {tc.isHidden ? 'HIDDEN' : 'PUBLIC'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate text-slate-400">
                          {tc.input || '(empty)'}
                        </td>
                        <td className="py-2.5 px-3 max-w-[200px] truncate text-emerald-400">
                          {tc.expectedOutput}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">{tc.marks}</td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            onClick={() => handleDeleteTestCase(tc._id)}
                            className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
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

          {/* Add New Test Case Form */}
          <form onSubmit={handleAddTestCase} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">+ Add New Test Case</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Standard Input (stdin):</label>
                <textarea
                  rows={3}
                  value={newTc.input}
                  onChange={(e) => setNewTc({ ...newTc, input: e.target.value })}
                  placeholder="Input provided to program..."
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-200"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Expected Output (stdout) *:</label>
                <textarea
                  rows={3}
                  required
                  value={newTc.expectedOutput}
                  onChange={(e) => setNewTc({ ...newTc, expectedOutput: e.target.value })}
                  placeholder="Exact expected standard output..."
                  className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-emerald-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-400 font-semibold">Marks:</label>
                  <input
                    type="number"
                    min={0}
                    value={newTc.marks}
                    onChange={(e) => setNewTc({ ...newTc, marks: Number(e.target.value) })}
                    className="w-16 px-2 py-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-white text-center"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newTcHidden"
                    checked={newTc.isHidden}
                    onChange={(e) => setNewTc({ ...newTc, isHidden: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <label htmlFor="newTcHidden" className="text-xs text-slate-300 font-semibold select-none cursor-pointer">
                    Hidden Test Case (Confidential)
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-sky-600/20"
              >
                + Save Test Case
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
