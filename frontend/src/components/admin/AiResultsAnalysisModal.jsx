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
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  BarChart2,
  FileText,
  Filter,
  Check,
  Copy,
  RefreshCw,
  Award,
  Layers,
  ShieldAlert,
  Users,
  GraduationCap,
  Printer,
  Compass,
  Briefcase,
  AlertOctagon,
} from 'lucide-react';

export default function AiResultsAnalysisModal({
  isOpen,
  onClose,
  activeFilters = {},
  availableExams = [],
  availableTechnologies = [],
  availableBatches = [],
}) {
  const { showAlert } = useModal();

  // Ollama Connection State (aligned with OllamaGuideCard standard)
  const [ollamaUrl, setOllamaUrl] = useState('http://127.0.0.1:11434');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [checking, setChecking] = useState(false);

  // Generation & Results State
  const [isGenerating, setIsGenerating] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [filteredStats, setFilteredStats] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [dataPurgedToast, setDataPurgedToast] = useState(false);

  // Active Review Tab: 'executive' | 'batches' | 'placement' | 'remediation' | 'curriculum' | 'integrity'
  const [activeTab, setActiveTab] = useState('executive');

  // Discover selected exam/batch/tech human-readable labels
  const selectedExamObj = availableExams.find(
    (e) => String(e._id) === String(activeFilters.examFilter)
  );
  const examTitle = selectedExamObj
    ? selectedExamObj.title
    : activeFilters.examFilter
    ? 'Filtered Examination'
    : 'All Examinations & Cohorts';

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
        filters: {
          examId: activeFilters.examFilter || undefined,
          technology: activeFilters.technologyFilter || undefined,
          batch: activeFilters.batchFilter || undefined,
          gender: activeFilters.genderFilter || undefined,
          resultStatus: activeFilters.resultStatusFilter || undefined,
          search: activeFilters.candidateSearch || undefined,
        },
      };

      const res = await api.post('/admin/ai/analyze-results', payload);
      if (res.data?.success && res.data?.data) {
        setAnalysisData(res.data.data.analysis);
        setFilteredStats(res.data.data.filteredStats);
      } else {
        setErrorMsg(res.data?.message || 'Failed to complete AI cohort analysis.');
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message ||
          'AI analysis failed. Please verify that Ollama is active on your machine and has adequate memory.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCutDataSharing = () => {
    setAnalysisData(null);
    setFilteredStats(null);
    setDataPurgedToast(true);
    setTimeout(() => {
      setDataPurgedToast(false);
    }, 4500);
  };

  // Generate downloadable Markdown report
  const handleDownloadReport = () => {
    if (!analysisData) return;

    const stats = filteredStats || {};
    const reportDate = new Date().toLocaleString();

    let md = `# INSTITUTIONAL ACADEMIC ASSESSMENT & PERFORMANCE REPORT
**Report Date:** ${reportDate}
**Evaluation Engine:** ${selectedModel} (Local In-Memory Ollama)
**Privacy Assurance:** 100% Local Ephemeral Execution (Zero Cloud PII Retention)

---

## 1. ASSESSMENT SCOPE & COHORT METRICS
- **Examination Title:** ${stats.examTitle || examTitle}
- **Filter Scope:** ${stats.filterSummary || 'Full Enrolled Cohort'}
- **Evaluated Candidates:** ${stats.totalCandidates || 0}
- **Pass Benchmark Ratio:** ${stats.passRate || '0%'} (${stats.passCount || 0} Passed | ${stats.failCount || 0} Failed | ${stats.terminatedCount || 0} Terminated)
- **Cohort Mean Score:** ${stats.averageScore || 0} / ${stats.maxPossibleScore || 100} (${stats.averagePercentage || 0}%)
- **Score Range:** Highest: ${stats.highestPercentage || 0}% | Lowest: ${stats.lowestPercentage || 0}%
- **Proctoring Violations Logged:** ${stats.totalViolations || 0} across ${stats.attemptsWithViolations || 0} student(s)

---

## 2. EXECUTIVE INSTITUTIONAL EVALUATION
**Institutional Health Grade:** ${analysisData.cohortHealthGrade || 'B'}
**Accreditation Justification:** ${analysisData.cohortHealthRationale || 'N/A'}

### Executive Summary:
${analysisData.executiveSummary || 'No executive narrative generated.'}

${analysisData.batchComparativeAnalysis ? `### Comparative Batch Analysis:\n${analysisData.batchComparativeAnalysis}\n` : ''}

---

## 3. BATCH-BY-BATCH COMPARATIVE BREAKDOWN
| Batch / Section | Evaluated Candidates | Passed | Pass Rate | Average Percentage |
| :--- | :---: | :---: | :---: | :---: |
${(stats.batchBreakdown || [])
  .map(
    (b) =>
      `| ${b.batch} | ${b.candidates} | ${b.passed} | ${b.passRate} | ${b.avgPercentage}% |`
  )
  .join('\n') || '| General Batch | ' + (stats.totalCandidates || 0) + ' | ' + (stats.passCount || 0) + ' | ' + (stats.passRate || '0%') + ' | ' + (stats.averagePercentage || 0) + '% |'}

---

## 4. TECHNOLOGY & SKILL DOMAIN BENCHMARKING
| Technology / Language | Evaluated Candidates | Passed | Pass Rate | Average Percentage |
| :--- | :---: | :---: | :---: | :---: |
${(stats.technologyBreakdown || [])
  .map(
    (t) =>
      `| ${t.technology} | ${t.candidates} | ${t.passed} | ${t.passRate} | ${t.avgPercentage}% |`
  )
  .join('\n') || '| Core Assessment Stack | ' + (stats.totalCandidates || 0) + ' | ' + (stats.passCount || 0) + ' | ' + (stats.passRate || '0%') + ' | ' + (stats.averagePercentage || 0) + '% |'}

---

## 5. PLACEMENT & TALENT READINESS MATRIX (TOP PERFORMERS)
| Rank | Candidate Name | Student ID | Batch | Technology | Score | Percentage |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
${(stats.topPerformers || [])
  .map(
    (p, i) =>
      `| ${i + 1} | ${p.name} | ${p.studentId || '-'} | ${p.batch || '-'} | ${p.technology || '-'} | ${p.score} | ${p.percentage}% |`
  )
  .join('\n') || '| - | No high-distinction records identified | - | - | - | - | - |'}

---

## 6. AT-RISK REMEDIATION ROSTER (MANDATORY LAB SUPPORT)
| Candidate Name | Student ID | Batch | Technology | Score % | Primary Flag |
| :--- | :---: | :---: | :---: | :---: | :--- |
${(stats.remediationRoster || [])
  .map(
    (r) =>
      `| ${r.name} | ${r.studentId || '-'} | ${r.batch || '-'} | ${r.technology || '-'} | ${r.percentage}% | ${r.reason} |`
  )
  .join('\n') || '| None | - | - | - | - | Cohort achieved 100% baseline pass benchmark |'}

---

## 7. PROCTORING & ACADEMIC INTEGRITY AUDIT
- **Integrity Compliance Score:** ${analysisData.integrityAndProctoringReview?.securityScore || 100} / 100
- **Cohort Security Classification:** ${analysisData.integrityAndProctoringReview?.riskLevel || 'LOW'} RISK
- **Integrity Observations:**
${analysisData.integrityAndProctoringReview?.observations || 'Proctoring parameters were maintained within acceptable standard deviations.'}

---

## 8. SYLLABUS & CURRICULUM BOTTLENECK DIAGNOSTICS
${(analysisData.curriculumAndQuestionDifficulty || [])
  .map(
    (g, i) =>
      `${i + 1}. **Skill Area:** ${g.area}\n   - **Observed Deficit:** ${g.observation}\n   - **Actionable Curriculum Modification:** ${g.recommendedAction}\n`
  )
  .join('\n')}

---

## 9. FACULTY DIRECTIVES & OPERATIONAL ROADMAP
${(analysisData.facultyDirectives || [])
  .map(
    (f, i) =>
      `${i + 1}. **[${f.urgency || 'Immediate'}] ${f.focusArea}:** ${f.directive}\n`
  )
  .join('\n')}

### Prioritized Interventions:
${(analysisData.actionableInterventions || [])
  .map(
    (act, i) =>
      `- **[${act.priority || 'MEDIUM'} PRIORITY] ${act.title}** (Target: ${act.targetGroup})\n  ${act.description}\n`
  )
  .join('\n')}

---

*Report generated securely via SkillCodex On-Premise Evaluation Engine. This data is ephemeral and cleared upon session termination.*
`;

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const cleanExam = (stats.examTitle || 'Cohort').replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `Institutional_Report_${cleanExam}_${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Open Print-Ready Institutional HTML Dossier with Official Sign-Off Block
  const handlePrintReport = () => {
    if (!analysisData) return;

    const stats = filteredStats || {};
    const reportDate = new Date().toLocaleString();

    const batchRows = (stats.batchBreakdown || [])
      .map(
        (b) => `
        <tr>
          <td><strong>${b.batch}</strong></td>
          <td style="text-align: center;">${b.candidates}</td>
          <td style="text-align: center;">${b.passed}</td>
          <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${b.passRate}</td>
          <td style="text-align: center;">${b.avgPercentage}%</td>
        </tr>`
      )
      .join('');

    const techRows = (stats.technologyBreakdown || [])
      .map(
        (t) => `
        <tr>
          <td><strong>${t.technology}</strong></td>
          <td style="text-align: center;">${t.candidates}</td>
          <td style="text-align: center;">${t.passed}</td>
          <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${t.passRate}</td>
          <td style="text-align: center;">${t.avgPercentage}%</td>
        </tr>`
      )
      .join('');

    const topRows = (stats.topPerformers || [])
      .map(
        (p, idx) => `
        <tr>
          <td style="text-align: center; font-weight: bold;">#${idx + 1}</td>
          <td><strong>${p.name}</strong></td>
          <td style="text-align: center;">${p.studentId || '-'}</td>
          <td style="text-align: center;">${p.batch || '-'}</td>
          <td style="text-align: center;">${p.technology || '-'}</td>
          <td style="text-align: center; font-weight: bold; color: #047857;">${p.score} (${p.percentage}%)</td>
          <td style="text-align: center;"><span style="background: #ecfdf5; color: #065f46; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600;">Interview Ready</span></td>
        </tr>`
      )
      .join('');

    const remediationRows = (stats.remediationRoster || [])
      .map(
        (r) => `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td style="text-align: center;">${r.studentId || '-'}</td>
          <td style="text-align: center;">${r.batch || '-'}</td>
          <td style="text-align: center; font-weight: bold; color: #b91c1c;">${r.percentage}%</td>
          <td>${r.reason}</td>
          <td style="font-weight: 600; color: #b45309;">Mandatory Lab Tutoring</td>
        </tr>`
      )
      .join('');

    const curriculumItems = (analysisData.curriculumAndQuestionDifficulty || [])
      .map(
        (c) => `
        <div style="margin-bottom: 12px; padding: 10px; background: #f8fafc; border-left: 4px solid #334155; border-radius: 4px;">
          <div style="font-weight: bold; font-size: 13px; color: #0f172a;">${c.area}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;"><strong>Observed Gap:</strong> ${c.observation}</div>
          <div style="font-size: 12px; color: #1e40af; margin-top: 2px;"><strong>Curriculum Modification:</strong> ${c.recommendedAction}</div>
        </div>`
      )
      .join('');

    const directivesItems = (analysisData.facultyDirectives || [])
      .map(
        (d) => `
        <li style="margin-bottom: 8px; font-size: 12px; color: #1e293b;">
          <strong style="color: #0f172a;">[${d.urgency || 'Immediate'} - ${d.focusArea}]:</strong> ${d.directive}
        </li>`
      )
      .join('');

    const printHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Institutional Academic Report - ${stats.examTitle || examTitle}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 15mm 20mm 15mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      line-height: 1.5;
      padding: 20px;
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .header {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 20px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .org-title {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sub-title {
      font-size: 13px;
      color: #475569;
      font-weight: 600;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-size: 11px;
      color: #64748b;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-bottom: 24px;
    }
    .kpi-card {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px;
      background: #f8fafc;
      text-align: center;
    }
    .kpi-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
      letter-spacing: 0.5px;
    }
    .kpi-val {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0;
    }
    .kpi-sub {
      font-size: 10px;
      color: #475569;
    }
    h2 {
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-bottom: 1.5px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    p {
      font-size: 12px;
      color: #334155;
      margin-bottom: 10px;
      line-height: 1.6;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-bottom: 18px;
    }
    th {
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      padding: 8px;
      text-align: left;
      font-weight: 700;
      color: #1e293b;
      text-transform: uppercase;
      font-size: 10px;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 7px 8px;
      color: #334155;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    .signoff-section {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px dashed #cbd5e1;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      page-break-inside: avoid;
    }
    .sign-box {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      background: #fafafa;
    }
    .sign-line {
      margin-top: 40px;
      border-top: 1px solid #0f172a;
      width: 80%;
      margin-left: auto;
      margin-right: auto;
    }
    .sign-name {
      font-size: 11px;
      font-weight: 700;
      color: #0f172a;
      margin-top: 6px;
    }
    .sign-role {
      font-size: 10px;
      color: #64748b;
    }
    .footer {
      margin-top: 24px;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #f1f5f9;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="org-title">Institutional Assessment & Performance Dossier</div>
      <div class="sub-title">${stats.examTitle || examTitle} &mdash; Official Evaluation Report</div>
    </div>
    <div class="meta-box">
      <div><strong>Date:</strong> ${reportDate}</div>
      <div><strong>Evaluation Scope:</strong> ${stats.filterSummary || 'Full Cohort'}</div>
      <div><strong>Local AI Engine:</strong> ${selectedModel} (In-Memory)</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Cohort Grade</div>
      <div class="kpi-val" style="color: #1e3a8a;">${analysisData.cohortHealthGrade || 'B'}</div>
      <div class="kpi-sub">${analysisData.cohortHealthRationale || 'Standard benchmark'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Pass Benchmark Ratio</div>
      <div class="kpi-val" style="color: #047857;">${stats.passRate || '0%'}</div>
      <div class="kpi-sub">${stats.passCount || 0} passed / ${stats.totalCandidates || 0} evaluated</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Cohort Mean Score</div>
      <div class="kpi-val">${stats.averagePercentage || 0}%</div>
      <div class="kpi-sub">Mean: ${stats.averageScore || 0} / ${stats.maxPossibleScore || 100} pts</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Integrity Security Index</div>
      <div class="kpi-val" style="color: #4338ca;">${analysisData.integrityAndProctoringReview?.securityScore || 95}/100</div>
      <div class="kpi-sub">${stats.totalViolations || 0} logged violation(s)</div>
    </div>
  </div>

  <h2>1. Executive Summary & Assessment Diagnostics</h2>
  <p>${analysisData.executiveSummary || 'Assessment evaluation completed.'}</p>
  ${analysisData.batchComparativeAnalysis ? `<p><strong>Comparative Batch Dynamics:</strong> ${analysisData.batchComparativeAnalysis}</p>` : ''}

  <h2>2. Batch-by-Batch Comparative Performance</h2>
  <table>
    <thead>
      <tr>
        <th>Batch / Section</th>
        <th style="text-align: center;">Evaluated</th>
        <th style="text-align: center;">Passed</th>
        <th style="text-align: center;">Pass Rate</th>
        <th style="text-align: center;">Average Score</th>
      </tr>
    </thead>
    <tbody>
      ${batchRows || '<tr><td colspan="5" style="text-align:center;">No batch records available</td></tr>'}
    </tbody>
  </table>

  <h2>3. Technology & Skill Domain Matrix</h2>
  <table>
    <thead>
      <tr>
        <th>Technology / Language</th>
        <th style="text-align: center;">Evaluated</th>
        <th style="text-align: center;">Passed</th>
        <th style="text-align: center;">Pass Rate</th>
        <th style="text-align: center;">Average Score</th>
      </tr>
    </thead>
    <tbody>
      ${techRows || '<tr><td colspan="5" style="text-align:center;">No technology records available</td></tr>'}
    </tbody>
  </table>

  <h2>4. Placement & Talent Readiness Matrix (Top Ranked)</h2>
  <table>
    <thead>
      <tr>
        <th style="text-align: center;">Rank</th>
        <th>Candidate Name</th>
        <th style="text-align: center;">Student ID</th>
        <th style="text-align: center;">Batch</th>
        <th style="text-align: center;">Technology</th>
        <th style="text-align: center;">Score</th>
        <th style="text-align: center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${topRows || '<tr><td colspan="7" style="text-align:center;">No distinction records available</td></tr>'}
    </tbody>
  </table>

  <h2>5. At-Risk Remediation Roster (Mandatory Faculty Follow-up)</h2>
  <table>
    <thead>
      <tr>
        <th>Candidate Name</th>
        <th style="text-align: center;">Student ID</th>
        <th style="text-align: center;">Batch</th>
        <th style="text-align: center;">Score</th>
        <th>Primary Flag</th>
        <th>Mandatory Action</th>
      </tr>
    </thead>
    <tbody>
      ${remediationRows || '<tr><td colspan="6" style="text-align:center;">No candidates flagged for remedial support</td></tr>'}
    </tbody>
  </table>

  <h2>6. Syllabus & Question Bottleneck Diagnostics</h2>
  ${curriculumItems || '<p>No specific curriculum bottlenecks flagged.</p>'}

  <h2>7. Faculty Directives & Action Roadmap</h2>
  <ul>
    ${directivesItems || '<li>Conduct standard semester review.</li>'}
  </ul>

  <div class="signoff-section">
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-name">Assessment Coordinator</div>
      <div class="sign-role">Examination Administrator</div>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-name">Head of Department (HOD)</div>
      <div class="sign-role">Faculty Academic Lead</div>
    </div>
    <div class="sign-box">
      <div class="sign-line"></div>
      <div class="sign-name">Dean of Academic Affairs</div>
      <div class="sign-role">Institutional Oversight</div>
    </div>
  </div>

  <div class="footer">
    Generated securely via SkillCodex On-Premise Evaluation Daemon &bull; Ephemeral Execution &bull; Confidential Institutional Document
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  </script>
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printHtml);
      printWindow.document.close();
    }
  };

  const handleCopySummary = () => {
    if (!analysisData) return;
    const summary = `${analysisData.executiveSummary}\n\nHealth Grade: ${analysisData.cohortHealthGrade} (${analysisData.cohortHealthRationale})`;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  // Build active filter tags
  const activeTags = [];
  if (activeFilters.examFilter) {
    activeTags.push({ label: 'Exam', val: examTitle });
  }
  if (activeFilters.technologyFilter) {
    activeTags.push({ label: 'Tech', val: activeFilters.technologyFilter });
  }
  if (activeFilters.batchFilter) {
    activeTags.push({ label: 'Batch', val: activeFilters.batchFilter });
  }
  if (activeFilters.resultStatusFilter) {
    activeTags.push({ label: 'Status', val: activeFilters.resultStatusFilter });
  }
  if (activeFilters.genderFilter) {
    activeTags.push({ label: 'Gender', val: activeFilters.genderFilter });
  }
  if (activeFilters.candidateSearch) {
    activeTags.push({ label: 'Search', val: `"${activeFilters.candidateSearch}"` });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-5xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header (Aligned with AiCodingQuestionModal & AdminAiExamGeneratorPage) */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-slate-200 shrink-0">
              <Sparkles className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  AI Results & Cohort Performance Analysis
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Local Ollama
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Synthesize student performance, batch diagnostics, talent benchmarks, and faculty directives
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
              <strong>100% Local In-Memory Analysis:</strong> Exam results are processed ephemerally on your local Ollama daemon. Zero cloud retention.
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

        {/* Purge Notification */}
        {dataPurgedToast && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Data sharing terminated. In-memory evaluation session and prompts have been completely purged.</span>
          </div>
        )}

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Section 1: Ollama Guide Card (Compact standard across exam creation) */}
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

          {/* Section 2: Active Evaluation Scope Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  Active Scope & Filter Context
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                {activeTags.length === 0 ? 'Full Assessment Cohort' : `${activeTags.length} filter(s) active`}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeTags.length === 0 ? (
                <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs">
                  All Examinations, Batches & Technologies (No Filter Restrictions)
                </span>
              ) : (
                activeTags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-xs"
                  >
                    <span className="text-slate-400 font-normal">{t.label}:</span>
                    <span className="font-semibold">{t.val}</span>
                  </span>
                ))
              )}
            </div>

            {/* Action to Generate Button */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {selectedModel ? (
                  <span>
                    Analysis will execute on local model: <strong>{selectedModel}</strong>
                  </span>
                ) : (
                  <span className="text-amber-600 font-semibold">
                    Please ensure local Ollama is active and pick a model
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleRunAnalysis}
                disabled={isGenerating || !selectedModel}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Cohort...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze Assessment Cohort</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Real-time Percentage & Step Progress */}
          {isGenerating && (
            <AiGenerationProgress
              isGenerating={isGenerating}
              type="analysis"
              modelName={selectedModel}
              itemCount={1}
              maxTimeoutSeconds={600}
            />
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 3: Review Analysis Report (Consistent with Step 2 in AdminAiExamGeneratorPage) */}
          {analysisData && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden space-y-6 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                    2
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Institutional Performance & Intelligence Report
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Accreditation metrics, comparative batch breakdown, talent readiness, and faculty directives
                    </p>
                  </div>
                </div>

                {/* Segmented Control Tabs (Matching AdminAiExamGeneratorPage) */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs overflow-x-auto max-w-full">
                  <button
                    type="button"
                    onClick={() => setActiveTab('executive')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'executive'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Executive Summary</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('batches')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'batches'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Batch Diagnostics</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('placement')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'placement'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>Placement Talent Matrix</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('remediation')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'remediation'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <AlertOctagon className="w-3.5 h-3.5" />
                    <span>At-Risk Remediation</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('curriculum')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'curriculum'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Curriculum Gaps</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('integrity')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                      activeTab === 'integrity'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Proctoring Audit</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: EXECUTIVE SUMMARY */}
              {activeTab === 'executive' && (
                <div className="space-y-6">
                  {/* Accreditation KPI Quad */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                          Institutional Grade
                        </span>
                        <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="my-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {analysisData.cohortHealthGrade || 'B'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {analysisData.cohortHealthRationale || 'Standard academic benchmark.'}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Pass Benchmark Ratio
                      </span>
                      <div className="my-2">
                        <span className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                          {filteredStats?.passRate || '0%'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {filteredStats?.passCount || 0} passed / {filteredStats?.totalCandidates || 0} evaluated
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Cohort Mean Score
                      </span>
                      <div className="my-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {filteredStats?.averagePercentage || 0}%
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Avg: {filteredStats?.averageScore || 0} / {filteredStats?.maxPossibleScore || 100} pts
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                        Security Index
                      </span>
                      <div className="my-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                          {analysisData.integrityAndProctoringReview?.securityScore || 95}/100
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {filteredStats?.totalViolations || 0} logged violation event(s)
                      </span>
                    </div>
                  </div>

                  {/* Executive Summary Narrative */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                    <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Executive Assessment & Accreditation Summary
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                      {analysisData.executiveSummary}
                    </p>
                    {analysisData.batchComparativeAnalysis && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300">
                        <strong className="text-slate-900 dark:text-slate-100">Comparative Dynamics: </strong>
                        {analysisData.batchComparativeAnalysis}
                      </div>
                    )}
                  </div>

                  {/* Strategic Insights Cards */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      Strategic Insights & Observed Indicators
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {(analysisData.keyInsights || []).map((ins, idx) => {
                        const isStrength = ins.type === 'strength';
                        const isWeakness = ins.type === 'weakness';
                        const isAlert = ins.type === 'alert';

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border flex flex-col justify-between ${
                              isStrength
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                                : isWeakness
                                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                                : isAlert
                                ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                                : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                                {ins.type || 'INSIGHT'}
                              </span>
                              {isStrength ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : isWeakness ? (
                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                              ) : isAlert ? (
                                <AlertCircle className="w-4 h-4 text-rose-600" />
                              ) : (
                                <TrendingUp className="w-4 h-4 text-blue-600" />
                              )}
                            </div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
                              {ins.title}
                            </h4>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                              {ins.detail}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Score Tier Distribution */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-blue-600" />
                      Academic Segmentation & Tier Distribution
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">Distinction (&ge;90%)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {filteredStats?.scoreBands?.['>=90%'] || 0}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {analysisData.performanceDistribution?.topBracketAnalysis}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-blue-600 dark:text-blue-400">Proficient (75-89%)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {filteredStats?.scoreBands?.['75-89%'] || 0}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          Solid technical proficiency meeting standard recruitment criteria.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">Developing (50-74%)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {filteredStats?.scoreBands?.['50-74%'] || 0}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {analysisData.performanceDistribution?.middleBracketAnalysis}
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-rose-600 dark:text-rose-400">Remediation (&lt;50%)</span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {filteredStats?.scoreBands?.['<50%'] || 0}
                          </span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                          {analysisData.performanceDistribution?.atRiskAnalysis}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: BATCH & TECH DIAGNOSTICS */}
              {activeTab === 'batches' && (
                <div className="space-y-6">
                  {/* Batch Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Batch-by-Batch Comparative Performance
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">
                        {filteredStats?.batchBreakdown?.length || 0} Cohort(s)
                      </span>
                    </div>

                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            <th className="py-2.5 px-4 font-semibold">Batch / Section</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Evaluated</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Passed</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Pass Benchmark</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Mean Score</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Status Tier</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(filteredStats?.batchBreakdown || []).map((b, idx) => {
                            const pctNum = parseFloat(b.passRate) || 0;
                            const isHigh = pctNum >= 80;
                            const isLow = pctNum < 50;

                            return (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                                  {b.batch}
                                </td>
                                <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-300">
                                  {b.candidates}
                                </td>
                                <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-300">
                                  {b.passed}
                                </td>
                                <td className="py-2.5 px-4 text-center font-bold">
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] ${
                                      isHigh
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : isLow
                                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                  >
                                    {b.passRate}
                                  </span>
                                </td>
                                <td className="py-2.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                                  {b.avgPercentage}%
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                      isHigh
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200'
                                        : isLow
                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                                        : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                                    }`}
                                  >
                                    {isHigh ? 'Leading' : isLow ? 'Remedial' : 'Standard'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Technology Table */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      Technology & Language Competency Breakdown
                    </h3>
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            <th className="py-2.5 px-4 font-semibold">Technology Stack</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Evaluated</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Passed</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Pass Rate</th>
                            <th className="py-2.5 px-4 font-semibold text-center">Mean Score</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(filteredStats?.technologyBreakdown || []).map((t, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-100">
                                {t.technology}
                              </td>
                              <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-300">
                                {t.candidates}
                              </td>
                              <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-300">
                                {t.passed}
                              </td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-800 dark:text-slate-100">
                                {t.passRate}
                              </td>
                              <td className="py-2.5 px-4 text-center font-semibold text-slate-700 dark:text-slate-200">
                                {t.avgPercentage}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: PLACEMENT TALENT MATRIX */}
              {activeTab === 'placement' && (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start gap-3">
                    <GraduationCap className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Distinction performers recommended for corporate recruitment, tier-1 technical interviews, and competitive hackathon placement.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          <th className="py-2.5 px-4 font-semibold text-center">Rank</th>
                          <th className="py-2.5 px-4 font-semibold">Candidate Name</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Student ID</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Batch</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Technology</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Score %</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Placement Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(filteredStats?.topPerformers || []).map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2.5 px-4 text-center font-bold text-slate-400">
                              #{idx + 1}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                              {p.name}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-500">
                              {p.studentId || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-300">
                              {p.batch || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-300">
                              {p.technology || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                              {p.percentage}%
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                Placement Ready
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: AT-RISK REMEDIATION ROSTER */}
              {activeTab === 'remediation' && (
                <div className="space-y-6">
                  <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3">
                    <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-800 dark:text-rose-300">
                      Students scoring below 50% or terminated due to policy non-compliance. Requires scheduled laboratory mentoring and test-case walkthrough.
                    </p>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                          <th className="py-2.5 px-4 font-semibold">Candidate Name</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Student ID</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Batch</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Score %</th>
                          <th className="py-2.5 px-4 font-semibold">Primary Risk Factor</th>
                          <th className="py-2.5 px-4 font-semibold text-center">Prescribed Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(filteredStats?.remediationRoster || []).map((r, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                              {r.name}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono text-[11px] text-slate-500">
                              {r.studentId || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center text-slate-600 dark:text-slate-300">
                              {r.batch || '-'}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-rose-600 dark:text-rose-400">
                              {r.percentage}%
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                              {r.reason}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                2-Hr Guided Lab
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Faculty Operational Directives */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Faculty Operational Directives
                    </h3>
                    <div className="space-y-2">
                      {(analysisData.facultyDirectives || []).map((dir, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 block">
                              {dir.focusArea}
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                              {dir.directive}
                            </p>
                          </div>
                          <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {dir.urgency || 'Immediate'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: CURRICULUM GAPS */}
              {activeTab === 'curriculum' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-2">
                    <Compass className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      Synthesized analysis of student submission traces, compiler outputs, and failed test cases to pinpoint recurring concept difficulties in the active filtered group.
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {(analysisData.curriculumAndQuestionDifficulty || []).map((gap, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5 md:max-w-xl">
                          <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                            {gap.area}
                          </span>
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                            {gap.observation}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 md:max-w-xs shrink-0">
                          <span className="font-semibold text-blue-600 dark:text-blue-400 block text-[11px] mb-0.5">
                            Recommended Modification:
                          </span>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300">
                            {gap.recommendedAction}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: PROCTORING AUDIT */}
              {activeTab === 'integrity' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Security Score
                      </span>
                      <div className="my-1.5">
                        <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                          {analysisData.integrityAndProctoringReview?.securityScore || 95}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Based on tab-switch and fullscreen escape tracking
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Risk Tier
                      </span>
                      <div className="my-1.5">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                            analysisData.integrityAndProctoringReview?.riskLevel === 'HIGH'
                              ? 'bg-rose-100 text-rose-800 border-rose-300'
                              : analysisData.integrityAndProctoringReview?.riskLevel === 'MEDIUM'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          }`}
                        >
                          {analysisData.integrityAndProctoringReview?.riskLevel || 'LOW'} RISK
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Cohort security classification
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Violations Count
                      </span>
                      <div className="my-1.5">
                        <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                          {filteredStats?.totalViolations || 0}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Across {filteredStats?.attemptsWithViolations || 0} candidate attempt(s)
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1 text-xs">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-blue-600" />
                      Proctoring Auditor Observations
                    </h4>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
                      {analysisData.integrityAndProctoringReview?.observations}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (Identical to Exam Creation Modals) */}
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
                  title="Print or save as PDF dossier with official sign-off section"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Dossier</span>
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
