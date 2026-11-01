import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import {
  Sparkles,
  X,
  Code2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  Save,
  RefreshCw,
  ArrowRight,
  Terminal,
  Trash2,
  Plus
} from 'lucide-react';
import OllamaGuideCard from './OllamaGuideCard';
import AiGenerationProgress from './AiGenerationProgress';

const SYSTEM_LANGUAGES = [
  { id: 'c', label: 'C' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'sql', label: 'SQL' },
];

const DEFAULT_LANGUAGES = ['c', 'cpp', 'java', 'python', 'javascript'];

export default function AiCodingQuestionModal({
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

  // Prompt Form State
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [marks, setMarks] = useState(20);
  const [allowedLanguages, setAllowedLanguages] = useState(DEFAULT_LANGUAGES);
  const [customInstructions, setCustomInstructions] = useState('');

  // Generation State
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState(null);
  const [activeTab, setActiveTab] = useState('preview'); // 'preview' | 'testcases'

  const checkConnection = async () => {
    try {
      setChecking(true);
      const res = await api.get(`/admin/ai/ollama/status?url=${encodeURIComponent(ollamaUrl)}`);
      const statusData = res.data?.data || {};
      setConnectionStatus(statusData);
      const modelList = statusData.models || [];
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        // Prefer coding models if present
        const coderModel = modelList.find((m) => m.name.toLowerCase().includes('coder'));
        setSelectedModel(coderModel ? coderModel.name : modelList[0].name);
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

  // Toggle language in pre-generation form
  const toggleFormLanguage = (langId) => {
    if (allowedLanguages.includes(langId)) {
      if (allowedLanguages.length === 1) return;
      setAllowedLanguages(allowedLanguages.filter((l) => l !== langId));
    } else {
      setAllowedLanguages([...allowedLanguages, langId]);
    }
  };

  // Editing generated question fields
  const updateQuestionField = (field, value) => {
    if (!generatedQuestion) return;
    setGeneratedQuestion((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleQuestionLanguage = (langId) => {
    if (!generatedQuestion) return;
    const current = generatedQuestion.allowedLanguages || DEFAULT_LANGUAGES;
    let next;
    if (current.includes(langId)) {
      if (current.length === 1) {
        showAlert({
          title: 'Language Required',
          message: 'At least one programming language must remain selected for this coding problem.',
          type: 'warning',
        });
        return;
      }
      next = current.filter((l) => l !== langId);
    } else {
      next = [...current, langId];
    }
    updateQuestionField('allowedLanguages', next);
  };

  const setOnlyQuestionLanguage = (langId) => {
    if (!generatedQuestion) return;
    updateQuestionField('allowedLanguages', [langId]);
  };

  const selectAllQuestionLanguages = () => {
    if (!generatedQuestion) return;
    updateQuestionField('allowedLanguages', SYSTEM_LANGUAGES.map((l) => l.id));
  };

  // Test cases editing
  const updateTestCase = (tcIndex, field, value) => {
    if (!generatedQuestion) return;
    const currentCases = [...(generatedQuestion.testCases || [])];
    currentCases[tcIndex] = {
      ...currentCases[tcIndex],
      [field]: value,
    };
    updateQuestionField('testCases', currentCases);
  };

  const addTestCase = (isHidden = false) => {
    if (!generatedQuestion) return;
    const currentCases = [...(generatedQuestion.testCases || [])];
    currentCases.push({
      input: '',
      expectedOutput: '',
      isHidden,
      marks: 5,
    });
    updateQuestionField('testCases', currentCases);
  };

  const removeTestCase = (tcIndex) => {
    if (!generatedQuestion) return;
    const currentCases = (generatedQuestion.testCases || []).filter((_, i) => i !== tcIndex);
    updateQuestionField('testCases', currentCases);
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
        message: 'Please enter a coding challenge topic or algorithm problem concept.',
        type: 'warning',
      });
      return;
    }

    try {
      setGenerating(true);
      const res = await api.post(
        '/admin/ai/generate-coding',
        {
          baseUrl: ollamaUrl,
          model: selectedModel,
          topic: topic.trim(),
          difficulty,
          marks: Number(marks),
          allowedLanguages,
          customInstructions,
        },
        { timeout: 600000 } // 10 minutes for local LLM generation
      );

      const q = res.data?.data?.question;
      if (!q) throw new Error('No question data returned by local AI model');

      // Ensure allowedLanguages is normalized to valid system languages
      const validLangs = (q.allowedLanguages || []).filter((l) =>
        SYSTEM_LANGUAGES.some((sl) => sl.id === l)
      );
      const finalLangs = validLangs.length > 0 ? validLangs : allowedLanguages;

      setGeneratedQuestion({
        ...q,
        allowedLanguages: finalLangs,
      });
      setActiveTab('preview');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to generate problem via local Ollama.';
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

  // Full validation before saving or inserting
  const validateAndNormalizeQuestion = () => {
    if (!generatedQuestion) return null;

    if (!generatedQuestion.title?.trim()) {
      showAlert({
        title: 'Title Required',
        message: 'Please enter a problem title before saving.',
        type: 'warning',
      });
      return null;
    }

    if (!generatedQuestion.description?.trim()) {
      showAlert({
        title: 'Description Required',
        message: 'Please enter a problem statement / description before saving.',
        type: 'warning',
      });
      return null;
    }

    // 1. Language validation: ensure only valid system languages exist
    const validLangs = (generatedQuestion.allowedLanguages || []).filter((l) =>
      SYSTEM_LANGUAGES.some((sl) => sl.id === l)
    );
    let finalLangs = validLangs;
    if (finalLangs.length === 0) {
      // Auto-infer from topic or default
      const topicLower = (topic + ' ' + generatedQuestion.title).toLowerCase();
      if (topicLower.includes('c ') || topicLower.includes('in c') || topicLower.includes('c program')) {
        finalLangs = ['c', 'cpp'];
      } else if (topicLower.includes('python') || topicLower.includes('py')) {
        finalLangs = ['python'];
      } else {
        finalLangs = DEFAULT_LANGUAGES;
      }
    }

    // 2. Test cases validation: must have at least 1 public and 1 hidden testcase
    let tcList = Array.isArray(generatedQuestion.testCases) ? [...generatedQuestion.testCases] : [];
    if (tcList.length === 0) {
      tcList = [
        { input: '1', expectedOutput: '1', isHidden: false, marks: 5 },
        { input: '2', expectedOutput: '2', isHidden: true, marks: 5 },
      ];
    } else {
      const hasPub = tcList.some((tc) => !tc.isHidden);
      const hasHid = tcList.some((tc) => tc.isHidden);
      if (!hasPub && tcList.length > 0) tcList[0].isHidden = false;
      if (!hasHid && tcList.length > 1) tcList[1].isHidden = true;
      else if (!hasHid && tcList.length === 1) {
        tcList.push({
          input: '0',
          expectedOutput: tcList[0].expectedOutput || '0',
          isHidden: true,
          marks: 5,
        });
      }
    }

    return {
      ...generatedQuestion,
      allowedLanguages: finalLangs,
      testCases: tcList,
      marks: Number(generatedQuestion.marks) || 20,
    };
  };

  const handleSaveToBank = async () => {
    const validated = validateAndNormalizeQuestion();
    if (!validated) return;

    try {
      setSaving(true);
      await api.post('/admin/questions', validated);
      await showAlert({
        title: 'Problem Created',
        message: `Coding problem "${validated.title}" with languages [${validated.allowedLanguages.join(', ')}] and ${validated.testCases?.length || 0} test cases saved to Question Bank!`,
        type: 'success',
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      showAlert({
        title: 'Save Failed',
        message: err.response?.data?.message || 'Failed to save question to database',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInsert = () => {
    const validated = validateAndNormalizeQuestion();
    if (!validated) return;

    if (onInsertToEditor) {
      onInsertToEditor(validated);
      onClose();
    }
  };

  const hasPublicTestcase = generatedQuestion?.testCases?.some((tc) => !tc.isHidden);
  const hasHiddenTestcase = generatedQuestion?.testCases?.some((tc) => tc.isHidden);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 shrink-0">
              <Code2 className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Generate Coding Question
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700">
                  Local LLM
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure parameters, preview problem statement, and verify test cases before saving
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

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Ollama Guide & Connection Bar */}
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

          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-8 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Problem Topic or Concept Prompt *
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., C Program for Palindrome Linked List / Matrix Spiral in C++ / Binary Search in Python"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
                Marks
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              />
            </div>

            {/* Allowed Languages Pre-Selection */}
            <div className="md:col-span-12 space-y-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-blue-500" />
                  <span>Target Allowed Languages</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (Select valid compilers candidate can submit with)
                  </span>
                </label>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setAllowedLanguages(SYSTEM_LANGUAGES.map((l) => l.id))}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    All
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setAllowedLanguages(['c'])}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    C Only
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setAllowedLanguages(['cpp'])}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    C++ Only
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setAllowedLanguages(['python'])}
                    className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                  >
                    Python Only
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {SYSTEM_LANGUAGES.map((lang) => {
                  const isSelected = allowedLanguages.includes(lang.id);
                  return (
                    <button
                      key={lang.id}
                      type="button"
                      onClick={() => toggleFormLanguage(lang.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                      <span>{lang.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-12 space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                Special Instructions (Optional)
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Include test cases with edge cases (empty array, single element). Ensure O(N) time complexity limit."
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Action to Generate */}
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
                  <span>Generating Question...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Question</span>
                </>
              )}
            </button>
          </div>

          {/* Real-time Percentage & Step-by-Step Progress */}
          {generating && (
            <AiGenerationProgress
              isGenerating={generating}
              type="coding"
              modelName={selectedModel}
              itemCount={1}
              maxTimeoutSeconds={600}
            />
          )}

          {/* Generated Problem Full Review & Edit Section */}
          {generatedQuestion && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-2xl bg-white dark:bg-slate-800/80 overflow-hidden shadow-xs space-y-0">
              {/* Review Header with Editable Title, Difficulty, Marks */}
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0">
                    #
                  </span>
                  <input
                    type="text"
                    value={generatedQuestion.title || ''}
                    onChange={(e) => updateQuestionField('title', e.target.value)}
                    placeholder="Problem Title"
                    className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none focus:border-blue-500 px-1 py-0.5 flex-1"
                  />
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                  <div className="flex items-center gap-1.5">
                    <label className="text-[11px] font-bold text-slate-500">Marks:</label>
                    <input
                      type="number"
                      min="1"
                      value={generatedQuestion.marks || 20}
                      onChange={(e) => updateQuestionField('marks', Number(e.target.value))}
                      className="w-16 px-2 py-1 text-xs font-bold text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <select
                    value={generatedQuestion.difficulty || 'MEDIUM'}
                    onChange={(e) => updateQuestionField('difficulty', e.target.value)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                  >
                    <option value="EASY">EASY</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HARD">HARD</option>
                  </select>

                  <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'preview'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      Problem Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('testcases')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                        activeTab === 'testcases'
                          ? 'bg-blue-600 text-white'
                          : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>Test Cases</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {generatedQuestion.testCases?.length || 0}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Editable Body Tabs */}
              <div className="p-5 text-xs space-y-4">
                {activeTab === 'preview' ? (
                  <>
                    {/* Allowed Programming Languages Selector */}
                    <div className="space-y-2 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-blue-500" />
                          <span>Allowed Programming Languages *</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            (Only verified system compilers can be selected)
                          </span>
                        </label>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={selectAllQuestionLanguages}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            All Languages
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setOnlyQuestionLanguage('c')}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Only C
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setOnlyQuestionLanguage('cpp')}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Only C++
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setOnlyQuestionLanguage('python')}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Only Python
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setOnlyQuestionLanguage('java')}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Only Java
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {SYSTEM_LANGUAGES.map((lang) => {
                          const isSelected = (generatedQuestion.allowedLanguages || []).includes(lang.id);
                          return (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => toggleQuestionLanguage(lang.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              <span>{lang.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Problem Description Textarea */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Problem Statement / Description:
                      </label>
                      <textarea
                        rows={4}
                        value={generatedQuestion.description || ''}
                        onChange={(e) => updateQuestionField('description', e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
                      />
                    </div>

                    {/* Input & Output Format */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Input Format
                        </label>
                        <textarea
                          rows={2}
                          value={generatedQuestion.inputFormat || ''}
                          onChange={(e) => updateQuestionField('inputFormat', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">
                          Output Format
                        </label>
                        <textarea
                          rows={2}
                          value={generatedQuestion.outputFormat || ''}
                          onChange={(e) => updateQuestionField('outputFormat', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* Constraints */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                        Constraints (Time, Space, Value ranges)
                      </label>
                      <input
                        type="text"
                        value={generatedQuestion.constraints || ''}
                        onChange={(e) => updateQuestionField('constraints', e.target.value)}
                        className="w-full px-3.5 py-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 rounded-xl text-xs font-mono text-amber-800 dark:text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </>
                ) : (
                  /* Test Cases Interactive Editor */
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Automated Test Cases ({generatedQuestion.testCases?.length || 0})
                        </span>
                        {hasPublicTestcase && hasHiddenTestcase ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Valid (Public & Hidden ready)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Needs at least 1 public & 1 hidden
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addTestCase(false)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Public Sample
                        </button>
                        <button
                          type="button"
                          onClick={() => addTestCase(true)}
                          className="px-2.5 py-1 text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Hidden Test Suite
                        </button>
                      </div>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-700">
                      {(generatedQuestion.testCases || []).map((tc, tcIdx) => (
                        <div
                          key={tcIdx}
                          className="p-3 bg-slate-50/50 dark:bg-slate-900/40 space-y-2 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400">
                                Case #{tcIdx + 1}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateTestCase(tcIdx, 'isHidden', !tc.isHidden)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 cursor-pointer border transition-colors ${
                                  tc.isHidden
                                    ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                }`}
                                title="Click to toggle Public / Hidden visibility"
                              >
                                {tc.isHidden ? (
                                  <>
                                    <EyeOff className="w-3 h-3" /> Hidden Test Suite
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3" /> Public Sample
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <label className="text-[10px] font-bold text-slate-400">Marks:</label>
                                <input
                                  type="number"
                                  min="1"
                                  value={tc.marks || 5}
                                  onChange={(e) => updateTestCase(tcIdx, 'marks', Number(e.target.value))}
                                  className="w-12 px-1.5 py-0.5 text-[11px] font-bold text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeTestCase(tcIdx)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                                title="Delete Test Case"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 font-sans mb-0.5">
                                Standard Input:
                              </div>
                              <textarea
                                rows={2}
                                value={tc.input || ''}
                                onChange={(e) => updateTestCase(tcIdx, 'input', e.target.value)}
                                placeholder="Raw input string or args"
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 font-sans mb-0.5">
                                Expected Output:
                              </div>
                              <textarea
                                rows={2}
                                value={tc.expectedOutput || ''}
                                onChange={(e) => updateTestCase(tcIdx, 'expectedOutput', e.target.value)}
                                placeholder="Exact output expected"
                                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 text-blue-600 dark:text-blue-400 font-bold"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {generatedQuestion && (
          <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2.5 bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                Languages: <strong className="text-slate-700 dark:text-slate-200 font-mono">[{generatedQuestion.allowedLanguages?.join(', ') || 'c, cpp'}]</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {onInsertToEditor && (
                <button
                  type="button"
                  onClick={handleInsert}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Insert into Editor</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveToBank}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save to Coding Question Bank'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
