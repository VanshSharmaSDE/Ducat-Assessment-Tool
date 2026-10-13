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

const toLocalDatetimeInput = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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
    allowCodeRun: false,
    isPublished: true,
    questions: [], // [{ questionId, marks, order, title }]
  });

  useEffect(() => {
    async function loadInitial() {
      try {
        const qRes = await api.get('/admin/questions');
        setAvailableQuestions(qRes.data?.data?.questions || []);

        if (isEditing) {
          const eRes = await api.get(`/admin/exams/${id}`);
          const ex = eRes.data?.data?.exam || eRes.data?.data;

          if (ex) {
            setFormData({
              title: ex.title || '',
              description: ex.description || '',
              instructions: ex.instructions || '',
              duration: ex.duration !== undefined ? Number(ex.duration) : 60,
              startDate: toLocalDatetimeInput(ex.startDate) || (new Date().toISOString().split('T')[0] + 'T00:00'),
              endDate: toLocalDatetimeInput(ex.endDate) || (new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0] + 'T23:59'),
              totalMarks: ex.totalMarks !== undefined ? Number(ex.totalMarks) : 100,
              passingMarks: ex.passingMarks !== undefined ? Number(ex.passingMarks) : 40,
              difficulty: ex.difficulty || 'INTERMEDIATE',
              maxViolations: ex.maxViolations !== undefined ? Number(ex.maxViolations) : 5,
              allowCodeRun: ex.allowCodeRun !== undefined ? Boolean(ex.allowCodeRun) : false,
              isPublished: ex.isPublished !== undefined ? Boolean(ex.isPublished) : true,
              questions: Array.isArray(ex.questions)
                ? ex.questions.map((q) => ({
                    questionId: q._id || q.questionId,
                    marks: Number(q.marks) || 20,
                    title: q.title || 'Question',
                  }))
                : [],
            });
          }
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
        allowCodeRun: Boolean(formData.allowCodeRun),
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
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
        <Link to="/admin/exams" className="text-xs text-slate-500 hover:text-slate-800 transition-colors mb-3 inline-block">
          &larr; Back to Examinations
        </Link>
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          {isEditing ? 'Edit Examination' : 'Create Examination Wizard'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Configure assessment details, scheduling, and test problems</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-200 pb-4">
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
                  ? 'bg-blue-50 border-blue-300 text-blue-600 font-bold'
                  : isDone
                  ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'bg-slate-200 text-slate-500'
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
      <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6 shadow-sm">
        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800">Step 1: General Details</h2>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Assessment Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. Standard Algorithmic Assessment 2026"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary of skills assessed..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Instructions for Candidates
              </label>
              <textarea
                rows={4}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white font-mono transition-all"
              />
            </div>
          </div>
        )}

        {/* Step 2: Exam Settings */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-800">Step 2: Scheduling & Rules</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={360}
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                >
                  <option value="BEGINNER">BEGINNER</option>
                  <option value="INTERMEDIATE">INTERMEDIATE</option>
                  <option value="ADVANCED">ADVANCED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Passing Marks
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.passingMarks}
                  onChange={(e) => setFormData({ ...formData, passingMarks: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Max Proctoring Violations Before Terminating
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={formData.maxViolations}
                  onChange={(e) => setFormData({ ...formData, maxViolations: Number(e.target.value) })}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
              </div>

              <div className="sm:col-span-2 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Candidate Code Testing</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                        formData.allowCodeRun
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {formData.allowCodeRun ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Allow students to test-run their programs with custom input in the IDE during this examination. Hidden test suites remain private and final assessment scoring is not affected.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.allowCodeRun)}
                    onChange={(e) => setFormData({ ...formData, allowCodeRun: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Add Questions */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Step 3: Select Assessment Questions</h2>
                <p className="text-xs text-slate-500 font-medium">Total Marks: {formData.totalMarks}</p>
              </div>
            </div>

            {/* Selected Questions */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Assigned Questions ({formData.questions.length})
              </h4>

              {formData.questions.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 text-center">
                  No questions selected yet. Choose from the question bank below.
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                  {formData.questions.map((q, idx) => (
                    <div
                      key={q.questionId}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4 text-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-blue-600 font-bold">#{idx + 1}</span>
                        <span className="font-semibold text-slate-800 truncate">{q.title}</span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <label className="text-slate-500">Marks:</label>
                          <input
                            type="number"
                            min={1}
                            value={q.marks}
                            onChange={(e) => handleQuestionMarksChange(q.questionId, e.target.value)}
                            className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 text-center focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveQuestion(q.questionId)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
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
            <div className="space-y-2 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Available In Question Bank
              </h4>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-2">
                {availableQuestions.map((q) => {
                  const isAdded = formData.questions.some((item) => item.questionId === q._id);
                  return (
                    <div
                      key={q._id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-slate-300 transition-colors"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{q.title}</span>
                        <span className="ml-2 text-[10px] text-slate-500 font-mono">({q.difficulty} • {q.marks} Marks)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddQuestion(q)}
                        disabled={isAdded}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                          isAdded
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-500 text-white font-bold transition-colors'
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
            <h2 className="text-base font-bold text-slate-800">Step 4: Summary & Publish Status</h2>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Title:</span>
                <span className="font-bold text-slate-800">{formData.title || 'Untitled'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Duration:</span>
                <span className="font-mono text-slate-800">{formData.duration} Minutes</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Total Marks:</span>
                <span className="font-mono text-slate-800">{formData.totalMarks} (Pass: {formData.passingMarks})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Problems Selected:</span>
                <span className="font-bold text-blue-600">{formData.questions.length} Questions</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Scheduled:</span>
                <span className="text-slate-700">
                  {new Date(formData.startDate).toLocaleString()} to {new Date(formData.endDate).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200">
                <span className="text-slate-500">Candidate Code Testing:</span>
                <span className={`font-semibold ${formData.allowCodeRun ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {formData.allowCodeRun ? 'Enabled (Run with custom input)' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="isPublished"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-white border-slate-300 accent-blue-600 cursor-pointer"
              />
              <label htmlFor="isPublished" className="text-xs text-slate-700 select-none cursor-pointer">
                <strong>Publish Immediately:</strong> Make assessment visible to candidates right away.
              </label>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex justify-between pt-4 border-t border-slate-200">
          <button
            type="button"
            disabled={step === 1}
            onClick={() => setStep(step - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 disabled:opacity-30 hover:bg-slate-100 bg-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm shadow-blue-600/15"
            >
              Next Step <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={saving}
              onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/15"
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
