import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Clock,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

export default function AiGenerationProgress({
  isGenerating,
  type = 'exam', // 'exam' | 'coding' | 'mcq'
  modelName = '',
  itemCount = 1,
  maxTimeoutSeconds = 600, // 10 minutes
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [progress, setProgress] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const stepsConfig = {
    exam: [
      { id: 'init', label: 'Model Initialization', detail: 'Connecting to local Ollama and establishing context' },
      { id: 'blueprint', label: 'Structure Analysis', detail: 'Deconstructing syllabus, difficulty parameters, and problem distribution' },
      { id: 'synthesis', label: 'Problem & Question Drafting', detail: 'Formulating statements, constraints, and initial code templates' },
      { id: 'testsuite', label: 'Evaluation Suites', detail: 'Generating automated public/hidden test suites and options' },
      { id: 'validate', label: 'Schema Validation', detail: 'Verifying strict JSON response format and normalizing languages' },
    ],
    coding: [
      { id: 'init', label: 'Model Initialization', detail: 'Establishing local LLM context for coding evaluation' },
      { id: 'statement', label: 'Problem Formulation', detail: 'Drafting algorithmic statement, I/O formats, and constraints' },
      { id: 'edgecases', label: 'Sample Cases', detail: 'Formulating representative sample inputs and boundary cases' },
      { id: 'testcases', label: 'Test Suite Generation', detail: 'Synthesizing automated public samples and hidden testcases' },
      { id: 'validate', label: 'Schema Verification', detail: 'Verifying compiler compatibility and output integrity' },
    ],
    mcq: [
      { id: 'init', label: 'Model Initialization', detail: 'Establishing local LLM context for multiple-choice generation' },
      { id: 'concept', label: 'Concept Analysis', detail: 'Analyzing technical topics, code prediction snippets, and core ideas' },
      { id: 'questions', label: 'Option Formulation', detail: 'Drafting question prompts and 4 distinct options' },
      { id: 'answers', label: 'Answer Key', detail: 'Verifying single correct answer index and clear explanation' },
      { id: 'validate', label: 'Schema Verification', detail: 'Verifying option integrity and array formatting' },
    ],
    analysis: [
      { id: 'init', label: 'Model Initialization', detail: 'Connecting to local Ollama and verifying local model context' },
      { id: 'cohort', label: 'Filtered Cohort Synthesis', detail: 'Deconstructing active filters, scoring distributions, and violation statistics' },
      { id: 'trends', label: 'Pattern & Anomaly Detection', detail: 'Analyzing score brackets, failure clusters, and question difficulty' },
      { id: 'recommendations', label: 'Intelligence Formulation', detail: 'Synthesizing strengths, risk factors, and actionable remediation' },
      { id: 'validate', label: 'Report Finalization', detail: 'Verifying structured intelligence and preparing export report' },
    ],
  };

  const steps = stepsConfig[type] || stepsConfig.coding;
  const estimatedTargetDuration = type === 'exam' ? 120 : type === 'mcq' ? 45 + (itemCount * 8) : type === 'analysis' ? 50 : 55;

  useEffect(() => {
    if (!isGenerating) {
      setElapsedSeconds(0);
      setProgress(0);
      setCurrentStepIndex(0);
      return;
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);

      let pct;
      if (elapsed < 6) {
        pct = (elapsed / 6) * 16;
      } else if (elapsed < 20) {
        pct = 16 + ((elapsed - 6) / 14) * 22;
      } else if (elapsed < 50) {
        pct = 38 + ((elapsed - 20) / 30) * 32;
      } else if (elapsed < estimatedTargetDuration) {
        pct = 70 + ((elapsed - 50) / (estimatedTargetDuration - 50)) * 20;
      } else {
        const overtime = elapsed - estimatedTargetDuration;
        pct = Math.min(98, 90 + (overtime / 150) * 8);
      }

      const roundedPct = Math.min(98, Math.max(1, Math.round(pct)));
      setProgress(roundedPct);

      if (roundedPct < 18) setCurrentStepIndex(0);
      else if (roundedPct < 40) setCurrentStepIndex(1);
      else if (roundedPct < 68) setCurrentStepIndex(2);
      else if (roundedPct < 88) setCurrentStepIndex(3);
      else setCurrentStepIndex(4);
    }, 400);

    return () => clearInterval(interval);
  }, [isGenerating, type, estimatedTargetDuration]);

  if (!isGenerating) return null;

  const formatTime = (totalSec) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const activeStep = steps[currentStepIndex] || steps[0];

  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
      {/* Top Header: Progress percentage & Model info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
            <Cpu className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Generating with Local Model
              </h4>
              {modelName && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {modelName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span className="font-medium text-slate-700 dark:text-slate-300">{activeStep.label}:</span>{' '}
              {activeStep.detail}
            </p>
          </div>
        </div>

        {/* Live Percentage & Timers */}
        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatTime(elapsedSeconds)}</span>
              <span className="text-slate-400">/ {formatTime(maxTimeoutSeconds)}</span>
            </div>
            <span className="text-[10px] text-slate-400">Timeout 10m</span>
          </div>

          <div className="px-3 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center min-w-[54px]">
            <span className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
              {progress}%
            </span>
          </div>
        </div>
      </div>

      {/* Main Clean Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium px-0.5">
          <span>Phase {currentStepIndex + 1} of {steps.length}</span>
          <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />
            <span>Processing tokens locally</span>
          </span>
        </div>
      </div>

      {/* Step Pipeline Visualization */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {steps.map((st, sIdx) => {
          const isDone = sIdx < currentStepIndex;
          const isCurrent = sIdx === currentStepIndex;

          return (
            <div
              key={st.id}
              className={`p-2 rounded-xl border text-center transition-colors ${
                isDone
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400'
                  : isCurrent
                  ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-50/50 dark:bg-slate-800/30 border-slate-200/50 dark:border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center justify-center mb-1">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : isCurrent ? (
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
                ) : (
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 text-[9px] font-medium text-slate-400 flex items-center justify-center">
                    {sIdx + 1}
                  </span>
                )}
              </div>
              <p
                className={`text-[10px] font-medium truncate leading-tight ${
                  isDone
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : isCurrent
                    ? 'text-blue-700 dark:text-blue-300 font-semibold'
                    : 'text-slate-400'
                }`}
                title={st.label}
              >
                {st.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Local Safety Note */}
      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
        <span className="truncate">
          Local inference on your device. Generation time varies based on model size and CPU/GPU hardware.
        </span>
      </div>
    </div>
  );
}
