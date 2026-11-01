import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { useModal } from '../../context/ModalContext';
import OllamaGuideCard from './OllamaGuideCard';
import AiGenerationProgress from './AiGenerationProgress';
import {
  Sparkles,
  X,
  ShieldCheck,
  Download,
  Trash2,
  AlertTriangle,
  FileCode,
  Check,
  Copy,
  RefreshCw,
  Award,
  ShieldAlert,
  Code2,
  Printer,
  Compass,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export default function AiCandidateReviewModal({
  isOpen,
  onClose,
  attemptId,
  candidateName = 'Candidate',
  examTitle = 'Assessment',
}) {
  const { showAlert } = useModal();

  // Ollama Connection State (aligned with OllamaGuideCard standard)
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [checking, setChecking] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [candidateSummary, setCandidateSummary] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [dataPurgedToast, setDataPurgedToast] = useState(false);

  const checkConnection = async () => {
    try {
      setChecking(true);
      const res = await api.get(`/admin/ai/ollama/status?url=${encodeURIComponent(ollamaUrl)}`);
      const statusData = res.data?.data || {};
      setConnectionStatus(statusData);
      const modelList = statusData.models || [];
      setModels(modelList);
      if (modelList.length > 0 && !selectedModel) {
        const preferred = modelList.find((m) =>
          /qwen|llama3|mistral|deepseek|codellama/i.test(m.name)
        );
        setSelectedModel(preferred ? preferred.name : modelList[0].name);
      }
    } catch (_) {
      setConnectionStatus({ online: false, error: 'Connection failed' });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setDataPurgedToast(false);
      checkConnection();
    }
  }, [isOpen]);

  const handleRunAnalysis = async () => {
    if (!selectedModel) {
      showAlert({
        title: 'Model Required',
        message: 'Please choose an installed Ollama model from the dropdown. Make sure Ollama is running locally.',
        type: 'warning',
      });
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');
    setDataPurgedToast(false);

    try {
      const payload = {
        baseUrl: ollamaUrl,
        model: selectedModel,
        attemptId,
      };

      const res = await api.post(`/admin/ai/analyze-candidate/${attemptId}`, payload);
      if (res.data?.success && res.data?.data) {
        setAnalysisData(res.data.data.analysis);
        setCandidateSummary(res.data.data.candidateSummary);
      } else {
        setErrorMsg(res.data?.message || 'Failed to complete candidate AI review.');
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          'AI review failed. Please check your local Ollama connection.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCutDataSharing = () => {
    setAnalysisData(null);
    setCandidateSummary(null);
    setDataPurgedToast(true);
    setTimeout(() => {
      setDataPurgedToast(false);
    }, 4500);
  };

  const handleDownloadReport = () => {
    if (!analysisData) return;

    const summary = candidateSummary || {};
    const reportDate = new Date().toLocaleString();

    let md = `# AI CANDIDATE CODE & TECHNICAL PERFORMANCE DOSSIER
**Candidate:** ${summary.candidateName || candidateName} (ID: ${summary.studentId || 'N/A'})
**Examination:** ${summary.examTitle || examTitle}
**Report Timestamp:** ${reportDate}
**Evaluation Engine:** ${selectedModel} (Local In-Memory Ollama)
**Privacy Assurance:** 100% Local Ephemeral Execution (Zero Cloud Data Stored)

---

## 1. ASSESSMENT SUMMARY & SCORECARD
- **Final Result:** ${summary.resultStatus || 'PENDING'}
- **Score:** ${summary.totalScore || 0} / ${summary.maxScore || 100} (${summary.percentage || 0}%)
- **Technical Competency Tier:** ${analysisData.competencyLevel || 'Proficient'} (Score: ${analysisData.competencyScore || 0}/100)
- **Duration on Exam:** ${summary.timeSpentMinutes || 0} minutes
- **Recorded Integrity Violations:** ${summary.violationCount || 0}

---

## 2. TECHNICAL PERFORMANCE EVALUATION
${analysisData.overallSummary || 'No technical summary provided.'}

---

## 3. IDENTIFIED KEY STRENGTHS
${(analysisData.strengths || [])
  .map((s, i) => `${i + 1}. **${s.title}**: ${s.detail}`)
  .join('\n')}

---

## 4. DETECTED WEAKNESSES & LOGICAL BOTTLENECKS
${(analysisData.weaknesses || [])
  .map((w, i) => `${i + 1}. **${w.title}**: ${w.detail}`)
  .join('\n')}

---

## 5. CODE ARCHITECTURE & TIME/SPACE COMPLEXITY
- **Estimated Time Complexity:** ${analysisData.complexityAndEfficiency?.timeComplexity || 'O(N)'}
- **Estimated Space Complexity:** ${analysisData.complexityAndEfficiency?.spaceComplexity || 'O(1)'}
- **Efficiency Feedback:**
${analysisData.complexityAndEfficiency?.notes || 'Normal complexity metrics.'}

---

## 6. PROCTORING & ACADEMIC INTEGRITY AUDIT
- **Security Audit Status:** ${analysisData.integrityReview?.status || 'CLEAN'}
- **Auditor Comments:**
${analysisData.integrityReview?.comments || 'Normal focus metrics observed.'}

---

## 7. RECOMMENDED LEARNING PATHWAY
${(analysisData.learningPath || [])
  .map(
    (lp, i) =>
      `${i + 1}. **Topic:** ${lp.topic}\n   - **Reason:** ${lp.reason}\n   - **Curated Resources:** ${lp.resources || 'Standard documentation'}`
  )
  .join('\n\n')}

---
*Generated securely via SkillCodex On-Premise Evaluation Daemon.*
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanName = (summary.candidateName || candidateName).replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `Candidate_AI_Review_${cleanName}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    if (!analysisData) return;

    const summary = candidateSummary || {};
    const reportDate = new Date().toLocaleString();

    const strengthsList = (analysisData.strengths || [])
      .map((s) => `<li><strong>${s.title}:</strong> ${s.detail}</li>`)
      .join('');

    const weaknessesList = (analysisData.weaknesses || [])
      .map((w) => `<li><strong>${w.title}:</strong> ${w.detail}</li>`)
      .join('');

    const learningItems = (analysisData.learningPath || [])
      .map(
        (lp) => `
        <div style="margin-bottom: 8px; padding: 8px; background: #f8fafc; border-left: 3px solid #334155; border-radius: 4px;">
          <div style="font-weight: bold; font-size: 12px; color: #0f172a;">${lp.topic}</div>
          <div style="font-size: 11px; color: #475569;">${lp.reason}</div>
          ${lp.resources ? `<div style="font-size: 11px; color: #1e3a8a; margin-top: 2px;"><strong>Resources:</strong> ${lp.resources}</div>` : ''}
        </div>`
      )
      .join('');

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Candidate AI Technical Audit - ${summary.candidateName || candidateName}</title>
  <style>
    @page { size: A4; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 10px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
    .sub { font-size: 12px; color: #475569; font-weight: 600; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
    .kpi-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; background: #f8fafc; text-align: center; }
    .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #64748b; }
    .kpi-val { font-size: 20px; font-weight: 800; color: #0f172a; margin: 2px 0; }
    .kpi-sub { font-size: 10px; color: #475569; }
    h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 16px; margin-bottom: 8px; color: #0f172a; }
    p { font-size: 11.5px; color: #334155; margin-bottom: 8px; }
    ul { font-size: 11.5px; color: #334155; margin-left: 18px; margin-bottom: 8px; }
    li { margin-bottom: 4px; }
    .footer { margin-top: 24px; font-size: 9px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">Candidate Technical & Code Audit Report</div>
      <div class="sub">${summary.candidateName || candidateName} &bull; ${summary.examTitle || examTitle}</div>
    </div>
    <div style="text-align: right; font-size: 10px; color: #64748b;">
      <div><strong>Date:</strong> ${reportDate}</div>
      <div><strong>Student ID:</strong> ${summary.studentId || 'N/A'}</div>
      <div><strong>Model:</strong> ${selectedModel}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Competency Tier</div>
      <div class="kpi-val" style="color: #1e3a8a;">${analysisData.competencyLevel || 'Proficient'}</div>
      <div class="kpi-sub">Score: ${analysisData.competencyScore || 0}/100</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Assessment Result</div>
      <div class="kpi-val" style="color: ${summary.resultStatus === 'PASS' ? '#047857' : '#b91c1c'};">${summary.resultStatus || 'PENDING'}</div>
      <div class="kpi-sub">${summary.percentage || 0}% (${summary.totalScore || 0}/${summary.maxScore || 100})</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Time Spent</div>
      <div class="kpi-val">${summary.timeSpentMinutes || 0}m</div>
      <div class="kpi-sub">Active duration</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Proctoring Status</div>
      <div class="kpi-val" style="color: #4338ca;">${analysisData.integrityReview?.status || 'CLEAN'}</div>
      <div class="kpi-sub">${summary.violationCount || 0} violation(s)</div>
    </div>
  </div>

  <h2>1. Executive Technical Summary</h2>
  <p>${analysisData.overallSummary || 'No summary provided.'}</p>

  <h2>2. Key Strengths & Problem Solving Acumen</h2>
  <ul>${strengthsList || '<li>Standard problem solving demonstrated.</li>'}</ul>

  <h2>3. Logical Deficits & Optimization Opportunities</h2>
  <ul>${weaknessesList || '<li>No major code vulnerabilities detected.</li>'}</ul>

  <h2>4. Algorithmic Complexity</h2>
  <p><strong>Time:</strong> ${analysisData.complexityAndEfficiency?.timeComplexity || 'O(N)'} &bull; <strong>Space:</strong> ${analysisData.complexityAndEfficiency?.spaceComplexity || 'O(1)'}</p>
  <p>${analysisData.complexityAndEfficiency?.notes || ''}</p>

  <h2>5. Prescribed Learning Pathway</h2>
  ${learningItems || '<p>Continue regular coding curriculum.</p>'}

  <div class="footer">
    SkillCodex Technical Evaluation Daemon &bull; Ephemeral Local Analysis &bull; Confidential Candidate Dossier
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 400);
    };
  </script>
</body>
</html>`;

    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(printHtml);
      printWin.document.close();
    }
  };

  const handleCopySummary = () => {
    if (!analysisData) return;
    const summary = `${analysisData.overallSummary}\n\nCompetency Level: ${analysisData.competencyLevel} (${analysisData.competencyScore}/100)`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 shrink-0">
              <Sparkles className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Candidate AI Technical Code & Performance Review
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Local Ollama
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Review submitted logic, test case execution, code complexity, and proctoring trace for {candidateName}
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

        {/* Ephemeral Privacy Banner */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>100% Local In-Memory Analysis:</strong> Candidate code and submission records are processed ephemerally on your local Ollama daemon.
            </span>
          </div>

          {analysisData && (
            <button
              type="button"
              onClick={handleCutDataSharing}
              className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-medium cursor-pointer"
              title="Clear memory session and purge all AI prompts"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Cut Sharing & Clear Session</span>
            </button>
          )}
        </div>

        {/* Purge Toast */}
        {dataPurgedToast && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>AI review data purged from memory. Context cleared.</span>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Ollama Guide Card (Compact) */}
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

          {/* Trigger Card (Step 1) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Candidate Evaluation Context
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                Target: {candidateName}
              </span>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300">
              <p>
                Evaluation target: <strong>{examTitle}</strong>. The local AI will analyze the candidate's compiler outputs, test suite pass rates, algorithmic edge cases, and code complexity.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {selectedModel ? (
                  <span>
                    Model: <strong>{selectedModel}</strong>
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">
                    Select a local model above
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isGenerating || !selectedModel}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Reviewing Candidate Code...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Start Technical Audit</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-time Progress */}
          {isGenerating && (
            <AiGenerationProgress
              isGenerating={isGenerating}
              type="analysis"
              modelName={selectedModel}
              itemCount={1}
              maxTimeoutSeconds={600}
            />
          )}

          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 2: Review Findings (Step 2) */}
          {analysisData && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden space-y-6 p-6">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    Technical Audit & Code Evaluation Findings
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Individual competency tier, strengths, logical deficits, and prescribed learning path
                  </p>
                </div>
              </div>

              {/* Metrics Quad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Competency Tier
                  </span>
                  <div className="my-1.5">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {analysisData.competencyLevel || 'Proficient'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Audit Score: {analysisData.competencyScore || 0}/100
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Assessment Result
                  </span>
                  <div className="my-1.5">
                    <span
                      className={`text-2xl font-bold ${
                        candidateSummary?.resultStatus === 'PASS'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {candidateSummary?.resultStatus || 'N/A'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {candidateSummary?.totalScore || 0} / {candidateSummary?.maxScore || 100} ({candidateSummary?.percentage || 0}%)
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Time Spent
                  </span>
                  <div className="my-1.5">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {candidateSummary?.timeSpentMinutes || 0}m
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Active session duration
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                    Proctoring Audit
                  </span>
                  <div className="my-1.5">
                    <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      {analysisData.integrityReview?.status || 'CLEAN'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {candidateSummary?.violationCount || 0} violation(s) logged
                  </span>
                </div>
              </div>

              {/* Technical Summary */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" />
                  Candidate Technical Summary
                </h3>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-1">
                  {analysisData.overallSummary}
                </p>
              </div>

              {/* Strengths & Weaknesses Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 space-y-2.5">
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Observed Key Strengths
                  </h4>
                  <div className="space-y-2">
                    {(analysisData.strengths || []).map((s, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-emerald-100 dark:border-emerald-900/40 text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                          {s.title}
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                          {s.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 space-y-2.5">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Logical Deficits & Vulnerabilities
                  </h4>
                  <div className="space-y-2">
                    {(analysisData.weaknesses || []).map((w, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-amber-100 dark:border-amber-900/40 text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                          {w.title}
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                          {w.detail}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Code Complexity & Architecture */}
              {analysisData.complexityAndEfficiency && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-blue-600" />
                    Algorithm Complexity & Code Quality
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Estimated Time Complexity:</span>
                      <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                        {analysisData.complexityAndEfficiency.timeComplexity || 'O(N)'}
                      </span>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-[11px] font-bold text-slate-500 block mb-1">Estimated Space Complexity:</span>
                      <span className="text-sm font-mono font-bold text-slate-900 dark:text-slate-100">
                        {analysisData.complexityAndEfficiency.spaceComplexity || 'O(1)'}
                      </span>
                    </div>
                  </div>
                  {analysisData.complexityAndEfficiency.notes && (
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                      {analysisData.complexityAndEfficiency.notes}
                    </p>
                  )}
                </div>
              )}

              {/* Prescribed Learning Pathway */}
              {analysisData.learningPath && analysisData.learningPath.length > 0 && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    Recommended Learning Pathway
                  </h4>
                  <div className="space-y-2">
                    {analysisData.learningPath.map((lp, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block mb-0.5">
                          {idx + 1}. {lp.topic}
                        </span>
                        <p className="text-slate-600 dark:text-slate-300 text-[11px] mb-1">
                          {lp.reason}
                        </p>
                        {lp.resources && (
                          <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
                            Suggested Resources: {lp.resources}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Model:</span>
            <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
              {selectedModel || 'None active'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>

            {analysisData && (
              <>
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintReport}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Print or save as PDF"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Scorecard</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Report (.md)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
