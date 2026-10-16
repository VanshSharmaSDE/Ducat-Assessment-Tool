import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import {
  CheckSquare,
  Save,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Layers,
  Award
} from 'lucide-react';

export default function AdminMcqQuestionEditorPage() {
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
    difficulty: 'MEDIUM',
    marks: 5,
    explanation: '',
    options: [
      { text: '' },
      { text: '' },
      { text: '' },
      { text: '' },
    ],
    correctAnswer: 0,
  });

  useEffect(() => {
    async function loadQuestion() {
      if (!isEditing) return;
      try {
        const res = await api.get(`/admin/questions/${id}`);
        const q = res.data.data.question;
        setFormData({
          title: q.title || '',
          description: q.description || '',
          difficulty: q.difficulty || 'MEDIUM',
          marks: q.marks !== undefined ? Number(q.marks) : 5,
          explanation: q.explanation || '',
          options: q.options?.length >= 2 ? q.options : [{ text: '' }, { text: '' }],
          correctAnswer: q.correctAnswer !== undefined && q.correctAnswer !== null ? Number(q.correctAnswer) : 0,
        });
      } catch (err) {
        setError('Failed to load MCQ question details');
      } finally {
        setLoading(false);
      }
    }
    loadQuestion();
  }, [id, isEditing]);

  const handleOptionChange = (idx, value) => {
    const next = [...formData.options];
    next[idx] = { ...next[idx], text: value };
    setFormData({ ...formData, options: next });
  };

  const handleAddOption = () => {
    if (formData.options.length >= 8) {
      setError('A maximum of 8 options is supported');
      return;
    }
    setFormData({
      ...formData,
      options: [...formData.options, { text: '' }],
    });
  };

  const handleRemoveOption = (idx) => {
    if (formData.options.length <= 2) {
      setError('An MCQ question must have at least 2 options');
      return;
    }
    const next = formData.options.filter((_, i) => i !== idx);
    let nextCorrect = formData.correctAnswer;
    if (nextCorrect === idx) {
      nextCorrect = 0;
    } else if (nextCorrect > idx) {
      nextCorrect -= 1;
    }
    setFormData({
      ...formData,
      options: next,
      correctAnswer: nextCorrect,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.title.trim()) {
      setError('Question title / problem statement is required');
      await showAlert({
        title: 'Validation Error',
        message: 'Question title / problem statement is required.',
        type: 'warning',
      });
      return;
    }

    const filledOptions = formData.options.filter((opt) => opt.text.trim().length > 0);
    if (filledOptions.length < 2) {
      setError('Please provide at least 2 valid option texts');
      await showAlert({
        title: 'Validation Error',
        message: 'Please provide at least 2 valid option texts.',
        type: 'warning',
      });
      return;
    }

    if (formData.options.some((opt) => !opt.text.trim())) {
      setError('All option fields must have text. Remove empty options if unused.');
      await showAlert({
        title: 'Validation Error',
        message: 'All option fields must have text. Remove empty options if unused.',
        type: 'warning',
      });
      return;
    }

    if (formData.correctAnswer < 0 || formData.correctAnswer >= formData.options.length) {
      setError('Please select a valid correct answer option');
      await showAlert({
        title: 'Validation Error',
        message: 'Please select a valid correct answer option.',
        type: 'warning',
      });
      return;
    }

    const isNew = !isEditing;
    const confirmed = await showConfirm({
      title: isNew ? 'Create MCQ Question' : 'Update MCQ Question',
      message: isNew
        ? `Are you sure you want to create the multiple-choice question "${formData.title.trim()}"?`
        : `Are you sure you want to save changes to the multiple-choice question "${formData.title.trim()}"?`,
      confirmText: isNew ? 'Create MCQ' : 'Save Changes',
      cancelText: 'Cancel',
      type: 'info',
      isDanger: false,
    });
    if (!confirmed) {
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || formData.title.trim(),
        type: 'MCQ',
        difficulty: formData.difficulty,
        marks: Number(formData.marks) || 5,
        explanation: formData.explanation.trim(),
        options: formData.options.map((opt) => ({ text: opt.text.trim() })),
        correctAnswer: Number(formData.correctAnswer),
      };

      if (isEditing) {
        await api.put(`/admin/questions/${id}`, payload);
        await showAlert({
          title: 'MCQ Question Updated',
          message: 'Multiple-choice question updated successfully!',
          type: 'success',
        });
        setSuccess('MCQ question updated successfully!');
      } else {
        await api.post('/admin/questions', payload);
        await showAlert({
          title: 'MCQ Question Created',
          message: 'Multiple-choice question created successfully!',
          type: 'success',
        });
        navigate('/admin/mcq-questions');
        return;
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save MCQ question';
      setError(msg);
      await showAlert({
        title: 'Save Failed',
        message: msg,
        type: 'error',
      });
    } finally {
      setSaving(false);
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
    <div className="p-6 md:p-8 space-y-6 max-w-4xl mx-auto w-full">
      <div>
        <Link to="/admin/mcq-questions" className="text-xs text-slate-500 hover:text-slate-800 transition-colors mb-3 inline-block">
          &larr; Back to MCQ Question Bank
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
          <CheckSquare className="w-7 h-7 text-blue-600" />
          {isEditing ? 'Edit MCQ Question' : 'Create New MCQ Question'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure question statement, options, correct choice, and scoring weight
        </p>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-5">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Question Details
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Question Title / Statement <span className="text-red-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Which data structure operates on a First-In, First-Out (FIFO) basis?"
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Detailed Description / Code Snippet / Context (Optional)
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional additional context, instructions, or code snippet to accompany the question..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Difficulty Level
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Marks / Points <span className="text-red-500 font-bold ml-0.5">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                required
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        {/* Options & Correct Answer Selection */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Options & Correct Answer
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Select the radio button next to the option that represents the correct answer
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddOption}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Option</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {formData.options.map((opt, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const isCorrect = formData.correctAnswer === idx;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${
                    isCorrect
                      ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Radio for Correct Answer */}
                  <label className="flex items-center gap-2 cursor-pointer shrink-0">
                    <input
                      type="radio"
                      name="correctOptionRadio"
                      checked={isCorrect}
                      onChange={() => setFormData({ ...formData, correctAnswer: idx })}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isCorrect ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-slate-200 text-slate-700'
                    }`}>
                      {letter}
                    </span>
                  </label>

                  {/* Option Text Input */}
                  <input
                    type="text"
                    required
                    value={opt.text}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`Enter text for Option ${letter}...`}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs transition-colors focus:outline-none focus:ring-1 ${
                      isCorrect
                        ? 'bg-white border border-emerald-300 text-slate-800 font-medium focus:ring-emerald-500'
                        : 'bg-white border border-slate-200 text-slate-700 focus:ring-blue-500'
                    }`}
                  />

                  {/* Correct Badge */}
                  {isCorrect ? (
                    <span className="shrink-0 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      Correct Answer
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, correctAnswer: idx })}
                      className="shrink-0 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors"
                    >
                      Set as Correct
                    </button>
                  )}

                  {/* Remove Button */}
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors rounded-lg hover:bg-white"
                      title="Remove option"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Answer Explanation */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-blue-600" />
            Solution Explanation (Optional)
          </h2>
          <div>
            <textarea
              rows={2}
              value={formData.explanation}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              placeholder="Explain why this answer is correct (revealed to admins and in performance reports)..."
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all leading-relaxed"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/admin/mcq-questions"
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving MCQ...' : isEditing ? 'Save Changes' : 'Create MCQ'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
