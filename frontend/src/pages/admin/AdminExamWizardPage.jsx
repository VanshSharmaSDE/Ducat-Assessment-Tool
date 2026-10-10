import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import {
  FileCheck2,
  Settings,
  HelpCircle,
  Eye,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Trash2,
  Plus,
  AlertCircle,
  Save
} from 'lucide-react';

export default function AdminExamWizardPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Available questions from bank
  const [availableQuestions, setAvailableQuestions] = useState([]);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '1. Duration is strictly timed on server.\n2. Code execution is not provided during exam.\n3. Solutions will be evaluated automatically against hidden test suites upon submission.',
    duration: 60,
    startDate: new Date().toISOString().split('T')[0] + 'T00:00',
    endDate: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0] + 'T23:59',
    totalMarks: 100,
    passingMarks: 40,
    difficulty: 'INTERMEDIATE',
    maxViolations: 5,
    isPublished: true,
    questions: [], // [{ questionId, marks, order, title }]
  });

  useEffect(() => {
    async function loadInitial() {
      try {
        const qRes = await api.get('/admin/questions');
        setAvailableQuestions(qRes.data.data.questions || []);

        if (isEditing) {
          const eRes = await api.get(`/admin/exams/${id}`);
          const ex = eRes.data.data.exam;

          setFormData({
            title: ex.title,
            description: ex.description || '',
            instructions: ex.instructions || '',
            duration: ex.duration,
            startDate: new Date(ex.startDate).toISOString().slice(0, 16),
            endDate: new Date(ex.endDate).toISOString().slice(0, 16),
            totalMarks: ex.totalMarks,
            passingMarks: ex.passingMarks,
            difficulty: ex.difficulty || 'INTERMEDIATE',
            maxViolations: ex.maxViolations || 5,
            isPublished: ex.isPublished ?? true,
            questions: ex.questions.map((q) => ({
              questionId: q._id || q.questionId,
              marks: q.marks,
              title: q.title,
            })),
          });
        }
      } catch (err) {
        setError('Failed to load initial data');
      } finally {
        setLoading(false);
      }
    }
    loadInitial();
  }, [id, isEditing]);

  const handleAddQuestion = (q) => {
    if (formData.questions.some((item) => item.questionId === q._id)) return;
    const newQuestions = [
      ...formData.questions,
      {
        questionId: q._id,
        marks: q.marks || 20,
        title: q.title,
      },
    ];

    const total = newQuestions.reduce((acc, curr) => acc + Number(curr.marks), 0);
    setFormData({
      ...formData,
      questions: newQuestions,
      totalMarks: total,
    });
  };

  const handleRemoveQuestion = (qId) => {
    const newQuestions = formData.questions.filter((item) => item.questionId !== qId);
    const total = newQuestions.reduce((acc, curr) => acc + Number(curr.marks), 0);
    setFormData({
      ...formData,
      questions: newQuestions,
      totalMarks: total,
    });
  };

  const handleQuestionMarksChange = (qId, marks) => {
    const newQuestions = formData.questions.map((item) =>
      item.questionId === qId ? { ...item, marks: Number(marks) } : item
    );
    const total = newQuestions.reduce((acc, curr) => acc + Number(curr.marks), 0);
    setFormData({
      ...formData,
      questions: newQuestions,
      totalMarks: total,
    });
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Please provide an assessment title.');
      setStep(1);
      return;
    }

    if (formData.questions.length === 0) {
      setError('Please add at least one coding question.');
      setStep(3);
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        instructions: formData.instructions,
        duration: Number(formData.duration),
        startDate: new Date(formData.startDate),
        endDate: new Date(formData.endDate),
        totalMarks: Number(formData.totalMarks),
        passingMarks: Number(formData.passingMarks),
        difficulty: formData.difficulty,
        maxViolations: Number(formData.maxViolations),
        isPublished: formData.isPublished,
        status: formData.isPublished ? 'ACTIVE' : 'DRAFT',
        questions: formData.questions.map((q, idx) => ({
          questionId: q.questionId,
          marks: Number(q.marks),
          order: idx + 1,
        })),
      };

      if (isEditing) {
        await api.put(`/admin/exams/${id}`, payload);
      } else {
        await api.post('/admin/exams', payload);
      }

      navigate('/admin/exams');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save examination.');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const steps = [
    { num: 1, title: 'Basic Information', icon: FileCheck2 },
    { num: 2, title: 'Exam Settings', icon: Settings },
    { num: 3, title: 'Questions & Marks', icon: HelpCircle },
    { num: 4, title: 'Review & Publish', icon: Eye },
  ];

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto w-full space-y-8">
      <div>
        <Link to="/admin/exams" className="text-xs text-slate-400 hover:text-white transition-colors mb-3 inline-block">
          &larr; Back to Examinations
        </Link>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          {isEditing ? 'Edit Examination' : 'Create Examination Wizard'}
        </h1>
        <p className="text-sm text-slate-400 mt-1">Configure assessment details, scheduling, and test problems</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-800 pb-4">
        {steps.map((s) => {
          const Icon = s.icon;
          const isActive = step === s.num;
          const isDone = step > s.num;

          return (
            <button
              key={s.num}
              onClick={() => setStep(s.num)}
              className={`p-3 rounded-xl text-left border transition-all flex items-center gap-3 ${
                isActive
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 font-bold'
                  : isDone
                  ? 'bg-slate-900 border-slate-700 text-slate-300'
                  : 'bg-slate-900/40 border-slate-800 text-slate-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950'
                    : isDone
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : s.num}
              </div>
              <span className="text-xs truncate">{s.title}</span>
            </button>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Step 1: General Details</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Assessment Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Standard Algorithmic Assessment 2026"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary of skills assessed..."
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Instructions for Candidates
              </label>
              <textarea
                rows={4}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
              />
            </div>
          </div>
        )}

        {/* Step 2: Exam Settings */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-white">Step 2: Scheduling & Rules</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={360}
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
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
                  <option value="BEGINNER">BEGINNER</option>
                  <option value="INTERMEDIATE">INTERMEDIATE</option>
                  <option value="ADVANCED">ADVANCED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Passing Marks
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.passingMarks}
                  onChange={(e) => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Max Proctoring Violations Before Terminating
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.maxViolations}
                  onChange={(e) => setFormData({ ...formData, maxViolations: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Add Questions */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Step 3: Select Assessment Questions</h2>
                <p className="text-xs text-slate-400">Total Marks: {formData.totalMarks}</p>
              </div>
            </div>

            {/* Selected Questions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Assigned Questions ({formData.questions.length})
              </h4>

              {formData.questions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
                  No questions selected yet. Choose from the question bank below.
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.questions.map((q, idx) => (
                    <div
                      key={q.questionId}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-sky-400 font-bold">#{idx + 1}</span>
                        <span className="font-semibold text-white truncate">{q.title}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <label className="text-slate-500">Marks:</label>
                          <input
                            type="number"
                            min={1}
                            value={q.marks}
                            onChange={(e) => handleQuestionMarksChange(q.questionId, e.target.value)}
                            className="w-16 px-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white text-center"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.questionId)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Question Bank Picker */}
            <div className="space-y-2 pt-4 border-t border-slate-800">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Available In Question Bank
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2">
                {availableQuestions.map((q) => {
                  const isAdded = formData.questions.some((item) => item.questionId === q._id);
                  return (
                    <div
                      key={q._id}
                      className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-200">{q.title}</span>
                        <span className="ml-2 text-[10px] text-slate-500 font-mono">({q.difficulty} • {q.marks} Marks)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion(q)}
                        disabled={isAdded}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          isAdded
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                        }`}
                      >
                        {isAdded ? 'Added' : '+ Add'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review & Publish */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-base font-bold text-white">Step 4: Summary & Publish Status</h2>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Title:</span>
                <span className="font-bold text-white">{formData.title || 'Untitled'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Duration:</span>
                <span className="font-mono text-white">{formData.duration} Minutes</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Total Marks:</span>
                <span className="font-mono text-white">{formData.totalMarks} (Pass: {formData.passingMarks})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Problems Selected:</span>
                <span className="font-bold text-amber-400">{formData.questions.length} Questions</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/80">
                <span className="text-slate-400">Scheduled:</span>
                <span className="text-slate-300">
                  {new Date(formData.startDate).toLocaleString()} to {new Date(formData.endDate).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-950 rounded-xl border border-slate-800">
              <input
                type="checkbox"
                id="isPublished"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700"
              />
              <label htmlFor="isPublished" className="text-xs text-slate-300 select-none cursor-pointer">
                <strong>Publish Immediately:</strong> Make assessment visible to candidates right away.
              </label>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex justify-between pt-4 border-t border-slate-800">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-700 text-xs font-semibold text-slate-300 disabled:opacity-30 hover:bg-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-lg shadow-amber-500/20"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Assessment...' : isEditing ? 'Save Changes' : 'Publish Examination'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
