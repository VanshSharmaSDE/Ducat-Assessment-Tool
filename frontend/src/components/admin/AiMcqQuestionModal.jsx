import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import {
  Sparkles,
  X,
  CheckSquare,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  Trash2,
  Check,
  ArrowRight
} from 'lucide-react';
import OllamaGuideCard from './OllamaGuideCard';
import AiGenerationProgress from './AiGenerationProgress';

export default function AiMcqQuestionModal({
  isOpen,
  onClose,
  onSuccess,
  onInsertToEditor,
}) {
  const { showAlert } = useModal();

  // Ollama Connection State
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [checking, setChecking] = useState(false);

  // Form State
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [count, setCount] = useState(3);
  const [marks, setMarks] = useState(5);
  const [customInstructions, setCustomInstructions] = useState('');

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  const checkConnection = async () => {
    try {
      setChecking(true);
      const res = await api.get(`/admin/ai/ollama/status?url=${encodeURIComponent(ollamaUrl)}`);
      const statusData = res.data?.data || {};
      setConnectionStatus(statusData);
      const modelList = statusData.models || [];
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        setSelectedModel(modelList[0].name);
      }
    } catch (_) {
      setConnectionStatus({ online: false, error: 'Connection failed' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkConnection();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Question editing handlers
  const updateQuestionField = (qIdx, field, value) => {
    const next = [...generatedQuestions];
    next[qIdx] = { ...next[qIdx], [field]: value };
    setGeneratedQuestions(next);
  };

  const updateQuestionOption = (qIdx, optIdx, newText) => {
    const next = [...generatedQuestions];
    const options = [...(next[qIdx].options || [])];
    options[optIdx] = { text: newText };
    next[qIdx] = { ...next[qIdx], options };
    setGeneratedQuestions(next);
  };

  const setCorrectOption = (qIdx, optIdx) => {
    const next = [...generatedQuestions];
    next[qIdx] = { ...next[qIdx], correctAnswer: optIdx };
    setGeneratedQuestions(next);
  };

  const removeQuestion = (qIdx) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== qIdx));
  };

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!selectedModel) {
      showAlert({
        title: 'Model Required',
        message: 'Please choose an active Ollama model. Ensure Ollama is running locally on your computer.',
        type: 'warning',
      });
      return;
    }

    if (!topic.trim()) {
      showAlert({
        title: 'Topic Required',
        message: 'Please enter a subject or concept topic for the MCQ questions.',
        type: 'warning',
      });
      return;
    }

    try {
      setGenerating(true);
      const res = await api.post(
        '/admin/ai/generate-mcq',
        {
          baseUrl: ollamaUrl,
          model: selectedModel,
          topic: topic.trim(),
          difficulty,
          count: Number(count),
          marks: Number(marks),
          customInstructions,
        },
        { timeout: 600000 } // 10 minutes for local LLM generation
      );

      const list = res.data?.data?.questions || [];
      if (list.length === 0) throw new Error('No MCQ questions returned by model');
      setGeneratedQuestions(list);
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to generate MCQs via local Ollama.';
      const hint = err.response?.data?.hint;
      showAlert({
        title: 'Generation Failed',
        message: hint ? `${errMsg}\n\nHint: ${hint}` : errMsg,
        type: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  // Full pre-save validation
  const validateMcqs = (questions) => {
    if (!questions || questions.length === 0) {
      showAlert({
        title: 'No Questions',
        message: 'There are no questions to save.',
        type: 'warning',
      });
      return null;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.title?.trim()) {
        showAlert({
          title: 'Title Required',
          message: `Question #${i + 1} is missing a title. Please enter a title before saving.`,
          type: 'warning',
        });
        return null;
      }

      if (!q.description?.trim()) {
        showAlert({
          title: 'Prompt Required',
          message: `Question #${i + 1} ("${q.title}") is missing its question statement.`,
          type: 'warning',
        });
        return null;
      }

      if (!q.options || q.options.length < 2) {
        showAlert({
          title: 'Options Required',
          message: `Question #${i + 1} must have at least 2 options.`,
          type: 'warning',
        });
        return null;
      }

      const emptyOptIndex = q.options.findIndex((opt) => !opt.text?.trim());
      if (emptyOptIndex !== -1) {
        showAlert({
          title: 'Empty Option',
          message: `Question #${i + 1} has an empty option (${String.fromCharCode(65 + emptyOptIndex)}). Please enter text for all options.`,
          type: 'warning',
        });
        return null;
      }

      const cAns = Number(q.correctAnswer);
      if (isNaN(cAns) || cAns < 0 || cAns >= q.options.length) {
        showAlert({
          title: 'Correct Answer Invalid',
          message: `Question #${i + 1} has an invalid correct answer selected. Click on one of the option letters to mark it correct.`,
          type: 'warning',
        });
        return null;
      }
    }

    return questions.map((q) => ({
      ...q,
      type: 'MCQ',
      marks: Number(q.marks) || 5,
      correctAnswer: Number(q.correctAnswer) || 0,
    }));
  };

  const handleSaveAll = async () => {
    const validated = validateMcqs(generatedQuestions);
    if (!validated) return;

    try {
      setSaving(true);
      let successCount = 0;
      for (const q of validated) {
        await api.post('/admin/questions', q);
        successCount++;
      }

      await showAlert({
        title: 'MCQs Saved',
        message: `Successfully validated and saved ${successCount} MCQ question(s) to the Question Bank!`,
        type: 'success',
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showAlert({
        title: 'Save Failed',
        message: err.response?.data?.message || 'Failed to save questions to database',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInsertSingle = (q) => {
    const validated = validateMcqs([q]);
    if (!validated || validated.length === 0) return;

    if (onInsertToEditor) {
      onInsertToEditor(validated[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 shrink-0">
              <CheckSquare className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Generate Multiple Choice Questions
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                  Local LLM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Generate questions, verify answer keys, and customize options before saving
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <OllamaGuideCard
            compact={true}
            ollamaUrl={ollamaUrl}
            setOllamaUrl={setOllamaUrl}
            connectionStatus={connectionStatus}
            models={models}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            onCheckConnection={checkConnection}
            checking={checking}
          />

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Subject or Topic Prompt *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Python Generators & Asyncio / SQL Joins & Query Plans"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Questions
              </label>
              <input
                type="number"
                min="1"
                max="15"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Marks / Q
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            <div className="md:col-span-12 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Special Instructions (Optional)
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Focus on output prediction code snippets and subtle common gotchas."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating || !selectedModel}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {generating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Questions...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Questions</span>
                </>
              )}
            </button>
          </div>

          {/* Real-time Percentage & Step-by-Step Progress */}
          {generating && (
            <AiGenerationProgress
              isGenerating={generating}
              type="mcq"
              modelName={selectedModel}
              itemCount={Number(count) || 3}
              maxTimeoutSeconds={600}
            />
          )}

          {/* Generated MCQs Editable Review List */}
          {generatedQuestions.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Generated Questions ({generatedQuestions.length})
                </h4>
                <span className="text-xs text-slate-500">
                  Total Marks:{' '}
                  {generatedQuestions.reduce((sum, q) => sum + Number(q.marks || 0), 0)} pts
                </span>
              </div>

              <div className="space-y-4">
                {generatedQuestions.map((q, qIdx) => (
                  <div
                    key={qIdx}
                    className="p-4 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-3 shadow-xs"
                  >
                    {/* Header: Title, Marks, Difficulty, Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-100 dark:border-slate-700 pb-2.5">
                      <div className="flex-1 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={q.title || ''}
                          onChange={(e) => updateQuestionField(qIdx, 'title', e.target.value)}
                          placeholder="Question Title / Headline"
                          className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none focus:border-blue-500 px-1 py-0.5 flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-medium text-slate-500">Marks:</label>
                          <input
                            type="number"
                            min="1"
                            value={q.marks || 5}
                            onChange={(e) => updateQuestionField(qIdx, 'marks', Number(e.target.value))}
                            className="w-14 px-2 py-1 text-xs font-bold text-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                          />
                        </div>

                        <select
                          value={q.difficulty || 'MEDIUM'}
                          onChange={(e) => updateQuestionField(qIdx, 'difficulty', e.target.value)}
                          className="px-2 py-1 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                        >
                          <option value="EASY">EASY</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HARD">HARD</option>
                        </select>

                        {onInsertToEditor && (
                          <button
                            type="button"
                            onClick={() => handleInsertSingle(q)}
                            className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shrink-0 cursor-pointer flex items-center gap-1"
                            title="Insert this question into editor"
                          >
                            <ArrowRight className="w-3 h-3" />
                            <span>Use</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => removeQuestion(qIdx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                          title="Remove Question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Question Prompt / Description */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        Question Statement / Prompt:
                      </label>
                      <textarea
                        rows={2}
                        value={q.description || ''}
                        onChange={(e) => updateQuestionField(qIdx, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-medium"
                      />
                    </div>

                    {/* Editable Options Grid & Correct Answer Selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase">
                        <span>Options (Click letter to set Correct Answer)</span>
                        <span className="text-emerald-600 dark:text-emerald-400 normal-case font-semibold">
                          Selected: Option {String.fromCharCode(65 + Number(q.correctAnswer || 0))} is correct
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {q.options?.map((opt, oIdx) => {
                          const isCorrect = Number(q.correctAnswer) === oIdx;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-xl border flex items-center gap-2 transition-colors ${
                                isCorrect
                                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => setCorrectOption(qIdx, oIdx)}
                                className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-transform hover:scale-105 cursor-pointer ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-200 dark:hover:bg-emerald-900'
                                }`}
                                title={`Click to designate Option ${String.fromCharCode(65 + oIdx)} as correct answer`}
                              >
                                {isCorrect ? <Check className="w-3.5 h-3.5" /> : String.fromCharCode(65 + oIdx)}
                              </button>

                              <input
                                type="text"
                                value={opt.text || ''}
                                onChange={(e) => updateQuestionOption(qIdx, oIdx, e.target.value)}
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                className={`flex-1 bg-transparent border-0 focus:outline-none text-xs font-medium ${
                                  isCorrect
                                    ? 'text-emerald-900 dark:text-emerald-200 font-semibold'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1 pt-1">
                      <label className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                        Explanation (Shown to students in review):
                      </label>
                      <input
                        type="text"
                        value={q.explanation || ''}
                        onChange={(e) => updateQuestionField(qIdx, 'explanation', e.target.value)}
                        placeholder="Brief explanation of why this answer is correct..."
                        className="w-full px-3 py-1.5 bg-blue-50/40 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 rounded-xl text-xs text-blue-800 dark:text-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-500 font-medium"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {generatedQuestions.length > 0 && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Review & edit any fields before saving to the question bank.
            </span>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {saving
                  ? 'Saving Questions...'
                  : `Save to Question Bank (${generatedQuestions.length})`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
