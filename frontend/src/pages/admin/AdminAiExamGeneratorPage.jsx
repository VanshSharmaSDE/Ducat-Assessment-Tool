import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  Cpu,
  Terminal,
  FileCheck2,
  Clock,
  Award,
  Layers,
  HelpCircle,
  CheckSquare,
  Code2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Edit,
  ArrowRight,
  Shield,
  Laptop,
  Check
} from 'lucide-react';
import OllamaGuideCard from '../../components/admin/OllamaGuideCard';
import AiGenerationProgress from '../../components/admin/AiGenerationProgress';

export default function AdminAiExamGeneratorPage() {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Ollama Connection State
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [checking, setChecking] = useState(false);

  // Organizations, Technologies & Batches
  const [organizations, setOrganizations] = useState([]);
  const [availableTechs, setAvailableTechs] = useState([]);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Exam Configuration
  const [examConfig, setExamConfig] = useState({
    topic: '',
    title: '',
    description: '',
    instructions: '1. Duration is strictly timed on server.\n2. Code execution is not provided during exam.\n3. Solutions will be evaluated automatically against hidden test suites upon submission.',
    duration: 60,
    passingMarks: 40,
    difficulty: 'INTERMEDIATE',
    organization: '',
    targetTechnologies: [],
    targetBatches: [],
    codingCount: 2,
    mcqCount: 5,
    codingMarks: 20,
    mcqMarks: 5,
    customInstructions: '',
    restrictToLaptop: false,
    allowCodeRun: false,
    maxViolations: 5,
    isPublished: true,
  });

  // Generation & Review State
  const [generating, setGenerating] = useState(false);
  const [generationTime, setGenerationTime] = useState(0);
  const [saving, setSaving] = useState(false);
  const [generatedExam, setGeneratedExam] = useState(null);
  const [activeReviewTab, setActiveReviewTab] = useState('coding'); // 'coding' | 'mcq' | 'settings'

  // Load Initial Organizations
  useEffect(() => {
    async function loadData() {
      try {
        const orgRes = await api.get('/admin/organizations').catch(() => ({ data: { data: { organizations: [] } } }));
        const orgList = orgRes.data?.data?.organizations || [];
        setOrganizations(orgList);
        if (orgList.length > 0) {
          const firstOrg = orgList[0].name;
          setExamConfig((prev) => ({ ...prev, organization: firstOrg }));
          loadTechsAndBatches(firstOrg);
        }
      } catch (err) {
        console.error('Failed to load organizations', err);
      } finally {
        setLoadingOrgs(false);
      }
    }
    loadData();
    checkOllamaConnection();
  }, []);

  // Timer while generating
  useEffect(() => {
    let timer;
    if (generating) {
      setGenerationTime(0);
      timer = setInterval(() => {
        setGenerationTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [generating]);

  const loadTechsAndBatches = async (orgName) => {
    if (!orgName) {
      setAvailableTechs([]);
      setAvailableBatches([]);
      return;
    }
    try {
      const [techRes, batchRes] = await Promise.all([
        api.get(`/admin/technologies?organization=${encodeURIComponent(orgName)}`).catch(() => ({ data: { data: { technologies: [] } } })),
        api.get(`/admin/batches?organization=${encodeURIComponent(orgName)}`).catch(() => ({ data: { data: { batches: [] } } })),
      ]);

      const techList = techRes.data?.data?.technologies || [];
      const batchList = batchRes.data?.data?.batches || [];
      setAvailableTechs(techList);
      setAvailableBatches(batchList);

      setExamConfig((prev) => ({
        ...prev,
        targetTechnologies: techList.length > 0 ? [techList[0].name] : [],
        targetBatches: batchList.length > 0 ? [batchList[0].name] : [],
      }));
    } catch (err) {
      console.error('Failed to load techs/batches', err);
    }
  };

  const handleOrgChange = (orgName) => {
    setExamConfig((prev) => ({ ...prev, organization: orgName }));
    loadTechsAndBatches(orgName);
  };

  const checkOllamaConnection = async () => {
    try {
      setChecking(true);
      const res = await api.get(`/admin/ai/ollama/status?url=${encodeURIComponent(ollamaUrl)}`);
      const statusData = res.data?.data || {};
      setConnectionStatus(statusData);
      const modelList = statusData.models || [];
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        const coder = modelList.find((m) => m.name.toLowerCase().includes('coder'));
        setSelectedModel(coder ? coder.name : modelList[0].name);
      }
    } catch (_) {
      setConnectionStatus({ online: false, error: 'Connection failed' });
    } finally {
      setChecking(false);
    }
  };

  const calculatedTotal =
    examConfig.codingCount * examConfig.codingMarks + examConfig.mcqCount * examConfig.mcqMarks;

  const handleGenerate = async (e) => {
    e?.preventDefault();

    if (!selectedModel) {
      showAlert({
        title: 'Model Required',
        message: 'Please choose an installed Ollama model from the dropdown. Make sure Ollama is running on your desktop.',
        type: 'warning',
      });
      return;
    }

    if (!examConfig.topic.trim()) {
      showAlert({
        title: 'Subject Required',
        message: 'Please specify the examination topic or subject (e.g., "Fullstack Web & Algorithms in Python & JS").',
        type: 'warning',
      });
      return;
    }

    if (examConfig.codingCount === 0 && examConfig.mcqCount === 0) {
      showAlert({
        title: 'Question Count Required',
        message: 'Please set at least 1 coding question or 1 MCQ question for this examination.',
        type: 'warning',
      });
      return;
    }

    try {
      setGenerating(true);
      const res = await api.post(
        '/admin/ai/generate-exam',
        {
          baseUrl: ollamaUrl,
          model: selectedModel,
          topic: examConfig.topic.trim(),
          difficulty: examConfig.difficulty,
          codingCount: Number(examConfig.codingCount),
          mcqCount: Number(examConfig.mcqCount),
          codingMarks: Number(examConfig.codingMarks),
          mcqMarks: Number(examConfig.mcqMarks),
          targetTechnologies: examConfig.targetTechnologies,
          customInstructions: examConfig.customInstructions,
        },
        { timeout: 600000 } // 10 minutes for local LLM generation
      );

      const data = res.data?.data;
      if (!data) throw new Error('No exam data returned by local AI');

      setGeneratedExam(data);
      // Pre-fill generated titles if not explicitly set
      setExamConfig((prev) => ({
        ...prev,
        title: data.title || prev.title || `Assessment: ${examConfig.topic}`,
        description: data.description || prev.description,
        instructions: data.instructions || prev.instructions,
        duration: data.duration || prev.duration,
        passingMarks: data.passingMarks || prev.passingMarks,
      }));

      setActiveReviewTab(data.codingQuestions?.length > 0 ? 'coding' : 'mcq');
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Failed to generate examination via local Ollama.';
      const hint = err.response?.data?.hint;
      showAlert({
        title: 'Exam Generation Failed',
        message: hint ? `${errMsg}\n\nHint: ${hint}` : errMsg,
        type: 'error',
      });
    } finally {
      setGenerating(false);
    }
  };

  // Editing generated questions
  // System supported languages
  const SYSTEM_LANGUAGES = [
    { id: 'c', label: 'C' },
    { id: 'cpp', label: 'C++' },
    { id: 'java', label: 'Java' },
    { id: 'python', label: 'Python' },
    { id: 'javascript', label: 'JavaScript' },
    { id: 'sql', label: 'SQL' },
  ];

  // Editing generated questions
  const updateCodingQuestion = (index, field, value) => {
    if (!generatedExam) return;
    const nextCoding = [...generatedExam.codingQuestions];
    nextCoding[index] = { ...nextCoding[index], [field]: value };
    setGeneratedExam({ ...generatedExam, codingQuestions: nextCoding });
  };

  const removeCodingQuestion = (index) => {
    if (!generatedExam) return;
    const nextCoding = generatedExam.codingQuestions.filter((_, i) => i !== index);
    setGeneratedExam({ ...generatedExam, codingQuestions: nextCoding });
  };

  const toggleCodingLanguage = (qIndex, langId) => {
    if (!generatedExam) return;
    const nextCoding = [...generatedExam.codingQuestions];
    const current = nextCoding[qIndex].allowedLanguages || ['c', 'cpp', 'java', 'python', 'javascript'];
    let updated;
    if (current.includes(langId)) {
      if (current.length === 1) {
        showAlert({
          title: 'Language Required',
          message: 'At least one programming language must remain selected for this coding problem.',
          type: 'warning',
        });
        return;
      }
      updated = current.filter((l) => l !== langId);
    } else {
      updated = [...current, langId];
    }
    nextCoding[qIndex] = { ...nextCoding[qIndex], allowedLanguages: updated };
    setGeneratedExam({ ...generatedExam, codingQuestions: nextCoding });
  };

  const setOnlyCodingLanguage = (qIndex, langId) => {
    if (!generatedExam) return;
    const nextCoding = [...generatedExam.codingQuestions];
    nextCoding[qIndex] = { ...nextCoding[qIndex], allowedLanguages: [langId] };
    setGeneratedExam({ ...generatedExam, codingQuestions: nextCoding });
  };

  const selectAllCodingLanguages = (qIndex) => {
    if (!generatedExam) return;
    const nextCoding = [...generatedExam.codingQuestions];
    nextCoding[qIndex] = {
      ...nextCoding[qIndex],
      allowedLanguages: ['c', 'cpp', 'java', 'python', 'javascript', 'sql'],
    };
    setGeneratedExam({ ...generatedExam, codingQuestions: nextCoding });
  };

  const updateTestCase = (qIndex, tcIndex, field, value) => {
    if (!generatedExam) return;
    const nextCoding = [...generatedExam.codingQuestions];
    const testCases = [...(nextCoding[qIndex].testCases || [])];
    testCases[tcIndex] = { ...testCases[tcIndex], [field]: value };
    nextCoding[qIndex] = { ...nextCoding[qIndex], testCases };
    setGeneratedExam({ ...generatedExam, codingQuestions: nextCoding });
  };

  const addTestCase = (qIndex, isHidden = false) => {
    if (!generatedExam) return;
    const nextCoding = [...generatedExam.codingQuestions];
    const testCases = [...(nextCoding[qIndex].testCases || [])];
    testCases.push({
      input: '',
      expectedOutput: '',
      isHidden,
      marks: 5,
    });
    nextCoding[qIndex] = { ...nextCoding[qIndex], testCases };
    setGeneratedExam({ ...generatedExam, codingQuestions: nextCoding });
  };

  const removeTestCase = (qIndex, tcIndex) => {
    if (!generatedExam) return;
    const nextCoding = [...generatedExam.codingQuestions];
    const testCases = (nextCoding[qIndex].testCases || []).filter((_, i) => i !== tcIndex);
    nextCoding[qIndex] = { ...nextCoding[qIndex], testCases };
    setGeneratedExam({ ...generatedExam, codingQuestions: nextCoding });
  };

  const updateMcqQuestion = (index, field, value) => {
    if (!generatedExam) return;
    const nextMcq = [...generatedExam.mcqQuestions];
    nextMcq[index] = { ...nextMcq[index], [field]: value };
    setGeneratedExam({ ...generatedExam, mcqQuestions: nextMcq });
  };

  const updateMcqOption = (mqIndex, optIndex, newText) => {
    if (!generatedExam) return;
    const nextMcq = [...generatedExam.mcqQuestions];
    const options = [...(nextMcq[mqIndex].options || [])];
    options[optIndex] = { text: newText };
    nextMcq[mqIndex] = { ...nextMcq[mqIndex], options };
    setGeneratedExam({ ...generatedExam, mcqQuestions: nextMcq });
  };

  const removeMcqQuestion = (index) => {
    if (!generatedExam) return;
    const nextMcq = generatedExam.mcqQuestions.filter((_, i) => i !== index);
    setGeneratedExam({ ...generatedExam, mcqQuestions: nextMcq });
  };

  // Final Save to Database with Full Pre-Save Check
  const handleSaveExam = async () => {
    if (!generatedExam) return;

    if (!examConfig.organization) {
      showAlert({
        title: 'Organization Required',
        message: 'Please select an Organization for this examination.',
        type: 'warning',
      });
      return;
    }

    if (!examConfig.targetTechnologies || examConfig.targetTechnologies.length === 0) {
      showAlert({
        title: 'Technology Required',
        message: 'Please select at least one Target Technology.',
        type: 'warning',
      });
      return;
    }

    if (!examConfig.targetBatches || examConfig.targetBatches.length === 0) {
      showAlert({
        title: 'Batch Required',
        message: 'Please select at least one Target Batch.',
        type: 'warning',
      });
      return;
    }

    const currentTotal =
      (generatedExam.codingQuestions || []).reduce((s, q) => s + Number(q.marks || 0), 0) +
      (generatedExam.mcqQuestions || []).reduce((s, q) => s + Number(q.marks || 0), 0);

    if (currentTotal === 0) {
      showAlert({
        title: 'No Questions',
        message: 'Examination must contain at least one question with marks.',
        type: 'warning',
      });
      return;
    }

    // Full pre-save validation & language normalization
    const validatedCoding = (generatedExam.codingQuestions || []).map((cq) => {
      // 1. Ensure allowedLanguages contains only valid system languages
      const validLangs = (cq.allowedLanguages || []).filter((l) =>
        ['java', 'python', 'javascript', 'c', 'cpp', 'sql'].includes(l)
      );
      const finalLangs = validLangs.length > 0 ? validLangs : ['c', 'cpp', 'java', 'python', 'javascript'];

      // 2. Ensure test cases have at least 1 public and 1 hidden
      let tcList = Array.isArray(cq.testCases) ? [...cq.testCases] : [];
      if (tcList.length === 0) {
        tcList = [
          { input: '1', expectedOutput: '1', isHidden: false, marks: Math.round((cq.marks || 20) * 0.4) || 5 },
          { input: '0', expectedOutput: '0', isHidden: true, marks: Math.round((cq.marks || 20) * 0.6) || 5 },
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
        ...cq,
        allowedLanguages: finalLangs,
        testCases: tcList,
      };
    });

    try {
      setSaving(true);
      const res = await api.post('/admin/ai/save-generated-exam', {
        examConfig: {
          title: examConfig.title || generatedExam.title,
          description: examConfig.description || generatedExam.description,
          instructions: examConfig.instructions || generatedExam.instructions,
          duration: Number(examConfig.duration),
          passingMarks: Number(examConfig.passingMarks),
          difficulty: examConfig.difficulty,
          isPublished: examConfig.isPublished,
          organization: examConfig.organization,
          targetTechnologies: examConfig.targetTechnologies,
          targetBatches: examConfig.targetBatches,
          restrictToLaptop: examConfig.restrictToLaptop,
          allowCodeRun: examConfig.allowCodeRun,
          maxViolations: examConfig.maxViolations,
        },
        codingQuestions: validatedCoding,
        mcqQuestions: generatedExam.mcqQuestions || [],
      });

      const examData = res.data?.data?.exam;
      await showAlert({
        title: 'Assessment Created Successfully',
        message: `Examination "${examData?.title || 'Exam'}" and all ${res.data?.data?.questionsCount || 0} questions have been deployed and saved into the database!`,
        type: 'success',
      });

      navigate('/admin/exams');
    } catch (err) {
      showAlert({
        title: 'Save Failed',
        message: err.response?.data?.message || 'Failed to deploy exam to database.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Breadcrumb & Title */}
      <div>
        <Link
          to="/admin/exams"
          className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-2 inline-block font-semibold"
        >
          &larr; Back to Examinations
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2.5">
              <span>AI Examination Creator</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5" /> Local Ollama
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Create comprehensive examinations with coding challenges and MCQs using models running locally on your desktop.
            </p>
          </div>
        </div>
      </div>

      {/* Local Ollama Guide Card */}
      <OllamaGuideCard
        ollamaUrl={ollamaUrl}
        setOllamaUrl={setOllamaUrl}
        connectionStatus={connectionStatus}
        models={models}
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        onCheckConnection={checkOllamaConnection}
        checking={checking}
      />

      {/* Main Configuration Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
            1
          </div>
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Assessment Prompt & Structure Setup
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {/* Topic */}
          <div className="md:col-span-12 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Exam Subject / Assessment Topic *
            </label>
            <input
              type="text"
              value={examConfig.topic}
              onChange={(e) => setExamConfig({ ...examConfig, topic: e.target.value })}
              placeholder="e.g., Fullstack Java Spring & Microservices / Advanced Python & Algorithms / DSA Trees & Graphs"
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Organization */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Organization *
            </label>
            <select
              value={examConfig.organization}
              onChange={(e) => handleOrgChange(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {organizations.map((org) => (
                <option key={org._id || org.name} value={org.name}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Technology */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Technology *
            </label>
            <select
              value={examConfig.targetTechnologies[0] || ''}
              onChange={(e) =>
                setExamConfig({ ...examConfig, targetTechnologies: [e.target.value] })
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableTechs.map((t) => (
                <option key={t._id || t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Target Batch */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Target Batch *
            </label>
            <select
              value={examConfig.targetBatches[0] || ''}
              onChange={(e) =>
                setExamConfig({ ...examConfig, targetBatches: [e.target.value] })
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableBatches.map((b) => (
                <option key={b._id || b.name} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Difficulty Tier
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {['BEGINNER', 'INTERMEDIATE', 'ADVANCED'].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setExamConfig({ ...examConfig, difficulty: d })}
                  className={`py-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                    examConfig.difficulty === d
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Duration (Minutes)
            </label>
            <input
              type="number"
              min="10"
              max="360"
              value={examConfig.duration}
              onChange={(e) => setExamConfig({ ...examConfig, duration: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Passing Marks */}
          <div className="md:col-span-4 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Passing Marks
            </label>
            <input
              type="number"
              min="1"
              value={examConfig.passingMarks}
              onChange={(e) => setExamConfig({ ...examConfig, passingMarks: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Question Mix Configuration */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              Question Composition & Marks Breakdown
            </span>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              Calculated Total: {calculatedTotal} Marks
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Coding Count */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-blue-600" /> Coding Questions
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={examConfig.codingCount}
                onChange={(e) => setExamConfig({ ...examConfig, codingCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* Coding Marks */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Marks per Coding Problem
              </label>
              <input
                type="number"
                min="5"
                max="100"
                value={examConfig.codingMarks}
                onChange={(e) => setExamConfig({ ...examConfig, codingMarks: Math.max(1, parseInt(e.target.value, 10) || 20) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* MCQ Count */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-emerald-600" /> MCQ Questions
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={examConfig.mcqCount}
                onChange={(e) => setExamConfig({ ...examConfig, mcqCount: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              />
            </div>

            {/* MCQ Marks */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                Marks per MCQ Question
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={examConfig.mcqMarks}
                onChange={(e) => setExamConfig({ ...examConfig, mcqMarks: Math.max(1, parseInt(e.target.value, 10) || 5) })}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Custom Instructions */}
          <div className="space-y-1.5 pt-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Special AI Guidelines & Focus Areas (Optional)
            </label>
            <textarea
              rows={2}
              value={examConfig.customInstructions}
              onChange={(e) => setExamConfig({ ...examConfig, customInstructions: e.target.value })}
              placeholder="e.g., Focus on recursion, graph traversals, and dynamic programming. For MCQs, test tricky edge cases and time complexities."
              className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedModel ? (
              <span>
                Generation will execute on local model: <strong>{selectedModel}</strong>
              </span>
            ) : (
              <span className="text-amber-600 font-semibold">
                Please ensure local Ollama is active and pick a model
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={generating || !selectedModel}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Examination...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Examination</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Real-Time Progress, Percentage & Step Pipeline Indicator */}
      {generating && (
        <AiGenerationProgress
          isGenerating={generating}
          type="exam"
          modelName={selectedModel}
          itemCount={(Number(examConfig.codingCount) || 0) + (Number(examConfig.mcqCount) || 0)}
          maxTimeoutSeconds={600}
        />
      )}

      {/* Step 2: Generated Assessment Review & In-Place Editing */}
      {generatedExam && !generating && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-6 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                2
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Review & Edit Examination Content
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Verify questions, adjust marks, customize allowed compilers, and inspect test suites before saving
                </p>
              </div>
            </div>

            {/* Consistent Segmented Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveReviewTab('coding')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeReviewTab === 'coding'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5 text-blue-500" />
                <span>Coding Questions ({generatedExam.codingQuestions?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReviewTab('mcq')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeReviewTab === 'mcq'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>Multiple Choice ({generatedExam.mcqQuestions?.length || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveReviewTab('settings')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  activeReviewTab === 'settings'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>Examination Details</span>
              </button>
            </div>
          </div>

          {/* Tab Content: Coding Problems */}
          {activeReviewTab === 'coding' && (
            <div className="space-y-6">
              {generatedExam.codingQuestions?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No coding problems in this examination.
                </div>
              ) : (
                generatedExam.codingQuestions?.map((cq, idx) => (
                  <div
                    key={idx}
                    className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-800/40 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={cq.title}
                          onChange={(e) => updateCodingQuestion(idx, 'title', e.target.value)}
                          className="font-bold text-sm text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none focus:border-blue-500 px-1"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5">
                          <label className="text-[11px] font-bold text-slate-500">Marks:</label>
                          <input
                            type="number"
                            min="1"
                            value={cq.marks}
                            onChange={(e) => updateCodingQuestion(idx, 'marks', Number(e.target.value))}
                            className="w-16 px-2 py-1 text-xs font-bold text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                          />
                        </div>

                        <select
                          value={cq.difficulty}
                          onChange={(e) => updateCodingQuestion(idx, 'difficulty', e.target.value)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                        >
                          <option value="EASY">EASY</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="HARD">HARD</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => removeCodingQuestion(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Delete Problem"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Problem Statement:
                      </label>
                      <textarea
                        rows={3}
                        value={cq.description}
                        onChange={(e) => updateCodingQuestion(idx, 'description', e.target.value)}
                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Constraints & Formats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Input Format</label>
                        <input
                          type="text"
                          value={cq.inputFormat || ''}
                          onChange={(e) => updateCodingQuestion(idx, 'inputFormat', e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Output Format</label>
                        <input
                          type="text"
                          value={cq.outputFormat || ''}
                          onChange={(e) => updateCodingQuestion(idx, 'outputFormat', e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Constraints</label>
                        <input
                          type="text"
                          value={cq.constraints || ''}
                          onChange={(e) => updateCodingQuestion(idx, 'constraints', e.target.value)}
                          className="w-full mt-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono"
                        />
                      </div>
                    </div>

                    {/* Allowed Programming Languages */}
                    <div className="space-y-2 p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-blue-500" />
                          <span>Allowed Programming Languages *</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            (Select which compilers candidate can use for this problem)
                          </span>
                        </label>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          <button
                            type="button"
                            onClick={() => selectAllCodingLanguages(idx)}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            All Languages
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setOnlyCodingLanguage(idx, 'c')}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Only C
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setOnlyCodingLanguage(idx, 'python')}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Only Python
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => setOnlyCodingLanguage(idx, 'java')}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
                          >
                            Only Java
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {SYSTEM_LANGUAGES.map((lang) => {
                          const isSelected = (cq.allowedLanguages || []).includes(lang.id);
                          return (
                            <button
                              key={lang.id}
                              type="button"
                              onClick={() => toggleCodingLanguage(idx, lang.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                                isSelected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                  : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                              <span>{lang.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Test Cases Editor */}
                    <div className="p-3.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            Automated Evaluation Test Cases ({cq.testCases?.length || 0})
                          </span>
                          {cq.testCases?.some((tc) => !tc.isHidden) && cq.testCases?.some((tc) => tc.isHidden) ? (
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
                            onClick={() => addTestCase(idx, false)}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800 cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> + Public Case
                          </button>
                          <button
                            type="button"
                            onClick={() => addTestCase(idx, true)}
                            className="px-2 py-1 text-[11px] font-bold rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 hover:bg-purple-100 border border-purple-200 dark:border-purple-800 cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> + Hidden Case
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {cq.testCases?.map((tc, tcIdx) => (
                          <div
                            key={tcIdx}
                            className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400">Case #{tcIdx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => updateTestCase(idx, tcIdx, 'isHidden', !tc.isHidden)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                                    tc.isHidden
                                      ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  }`}
                                  title="Click to toggle Public / Hidden"
                                >
                                  {tc.isHidden ? 'Hidden (Private Test Case)' : 'Public (Sample Test Case)'}
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold">Marks:</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={tc.marks || 5}
                                    onChange={(e) => updateTestCase(idx, tcIdx, 'marks', Number(e.target.value))}
                                    className="w-12 px-1.5 py-0.5 text-xs text-center font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeTestCase(idx, tcIdx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete test case"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                              <div>
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                  Standard Input
                                </label>
                                <textarea
                                  rows={2}
                                  value={tc.input || ''}
                                  onChange={(e) => updateTestCase(idx, tcIdx, 'input', e.target.value)}
                                  placeholder="e.g. 5\n1 2 3 4 5"
                                  className="w-full mt-0.5 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono focus:outline-none focus:border-blue-500"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                  Expected Output
                                </label>
                                <textarea
                                  rows={2}
                                  value={tc.expectedOutput || ''}
                                  onChange={(e) => updateTestCase(idx, tcIdx, 'expectedOutput', e.target.value)}
                                  placeholder="e.g. 15"
                                  className="w-full mt-0.5 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-mono font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Content: MCQs */}
          {activeReviewTab === 'mcq' && (
            <div className="space-y-4">
              {generatedExam.mcqQuestions?.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No MCQ questions in this examination.
                </div>
              ) : (
                generatedExam.mcqQuestions?.map((mq, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-800/40 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={mq.title}
                          onChange={(e) => updateMcqQuestion(idx, 'title', e.target.value)}
                          className="font-bold text-xs text-slate-800 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-600 focus:outline-none px-1 flex-1"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-500">Marks:</span>
                        <input
                          type="number"
                          min="1"
                          value={mq.marks}
                          onChange={(e) => updateMcqQuestion(idx, 'marks', Number(e.target.value))}
                          className="w-14 px-2 py-1 text-xs font-bold text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeMcqQuestion(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question text */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Question Statement:
                      </label>
                      <textarea
                        rows={2}
                        value={mq.description}
                        onChange={(e) => updateMcqQuestion(idx, 'description', e.target.value)}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
                      />
                    </div>

                    {/* Options */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold">
                        <span>Options (Click the circle letter to mark as Correct Answer):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {mq.options?.map((opt, oIdx) => {
                          const isCorrect = mq.correctAnswer === oIdx;
                          return (
                            <div
                              key={oIdx}
                              className={`p-2 rounded-xl border flex items-center gap-2 transition-all ${
                                isCorrect
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              <button
                                type="button"
                                onClick={() => updateMcqQuestion(idx, 'correctAnswer', oIdx)}
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 cursor-pointer transition-all ${
                                  isCorrect
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-200'
                                }`}
                                title="Click to set as correct answer"
                              >
                                {String.fromCharCode(65 + oIdx)}
                              </button>
                              <input
                                type="text"
                                value={opt.text}
                                onChange={(e) => updateMcqOption(idx, oIdx, e.target.value)}
                                className={`flex-1 bg-transparent text-xs focus:outline-none font-medium ${
                                  isCorrect
                                    ? 'text-emerald-900 dark:text-emerald-200 font-bold'
                                    : 'text-slate-700 dark:text-slate-300'
                                }`}
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)} text`}
                              />
                              {isCorrect && (
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 shrink-0">
                                  Correct
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Explanation (Optional):
                      </label>
                      <input
                        type="text"
                        value={mq.explanation || ''}
                        onChange={(e) => updateMcqQuestion(idx, 'explanation', e.target.value)}
                        placeholder="Explanation of correct option"
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Tab Content: Exam Details & Settings */}
          {activeReviewTab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
              <div className="md:col-span-12 space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Examination Title
                </label>
                <input
                  type="text"
                  value={examConfig.title}
                  onChange={(e) => setExamConfig({ ...examConfig, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="md:col-span-12 space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Assessment Overview / Description
                </label>
                <textarea
                  rows={2}
                  value={examConfig.description}
                  onChange={(e) => setExamConfig({ ...examConfig, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="md:col-span-12 space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Candidate Instructions
                </label>
                <textarea
                  rows={3}
                  value={examConfig.instructions}
                  onChange={(e) => setExamConfig({ ...examConfig, instructions: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-[11px]"
                />
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="restrictLaptop"
                  checked={examConfig.restrictToLaptop}
                  onChange={(e) => setExamConfig({ ...examConfig, restrictToLaptop: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="restrictLaptop" className="font-bold text-slate-700 dark:text-slate-300">
                  Restrict to Laptop / PC only
                </label>
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowCodeRun"
                  checked={examConfig.allowCodeRun}
                  onChange={(e) => setExamConfig({ ...examConfig, allowCodeRun: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="allowCodeRun" className="font-bold text-slate-700 dark:text-slate-300">
                  Allow test code runs during exam
                </label>
              </div>

              <div className="md:col-span-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="publishDirect"
                  checked={examConfig.isPublished}
                  onChange={(e) => setExamConfig({ ...examConfig, isPublished: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="publishDirect" className="font-bold text-slate-700 dark:text-slate-300">
                  Publish Immediately (Active)
                </label>
              </div>
            </div>
          )}

          {/* Final Save Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500">
              Ready to deploy. Questions will be automatically created in your Question Bank and linked to the exam.
            </div>

            <button
              type="button"
              onClick={handleSaveExam}
              disabled={saving}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>
                {saving
                  ? 'Saving Examination...'
                  : 'Save & Create Examination'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
