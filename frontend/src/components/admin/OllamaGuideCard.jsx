import React, { useState } from 'react';
import {
  Terminal,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Layers,
  HelpCircle,
  Radio,
  Clock
} from 'lucide-react';

const RECOMMENDED_MODELS = [
  { name: 'qwen2.5-coder:7b', desc: 'Best for coding problems, algorithmic constraints & test cases', tag: 'Coding Specialist' },
  { name: 'llama3.2', desc: 'Ultra-fast, lightweight 3B model for quick generation', tag: 'Speed & General' },
  { name: 'deepseek-r1:8b', desc: 'Advanced step-by-step reasoning & complex algorithm edge cases', tag: 'Reasoning' },
  { name: 'mistral', desc: 'Strong general instruction following and conceptual MCQs', tag: 'Versatile' },
  { name: 'codellama', desc: 'Specialized Meta model for code generation and analysis', tag: 'Code Generation' },
];

export default function OllamaGuideCard({
  ollamaUrl = 'http://127.0.0.1:11434',
  setOllamaUrl,
  connectionStatus,
  models = [],
  selectedModel,
  setSelectedModel,
  onCheckConnection,
  checking = false,
  compact = false,
}) {
  const [copiedCmd, setCopiedCmd] = useState('');
  const [showGuide, setShowGuide] = useState(!compact && !connectionStatus?.online);

  const handleCopy = (cmd) => {
    navigator.clipboard.writeText(cmd);
    setCopiedCmd(cmd);
    setTimeout(() => setCopiedCmd(''), 2000);
  };

  const isConnected = connectionStatus?.online;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden transition-all">
      {/* Header bar with status and toggle */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 shrink-0">
            <Cpu className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Local LLM Engine (Ollama)
              </h3>
              {isConnected ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online ({models.length} model{models.length !== 1 ? 's' : ''})
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Offline
                </span>
              )}
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800" title="Extended timeout ensures slower local CPU/GPU models have ample time">
                <Clock className="w-3 h-3" />
                10m Timeout
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Runs locally on your desktop. Exam creation and problem quality depend on your active model.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={onCheckConnection}
            disabled={checking}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin text-blue-600' : ''}`} />
            <span>{checking ? 'Checking...' : 'Check Connection'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowGuide(!showGuide)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <span>{showGuide ? 'Hide Instructions' : 'View Instructions'}</span>
            {showGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Connection Controls */}
      <div className="p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          {/* Host URL */}
          <div className="md:col-span-5 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Ollama Host Endpoint
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://127.0.0.1:11434"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {ollamaUrl !== 'http://127.0.0.1:11434' && (
                <button
                  type="button"
                  onClick={() => setOllamaUrl('http://127.0.0.1:11434')}
                  className="px-2 py-2 text-[11px] text-blue-600 hover:underline shrink-0"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Model Selector */}
          <div className="md:col-span-7 space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Selected Local Model</span>
              {selectedModel && (
                <span className="text-[10px] text-slate-400 font-normal">
                  Active model for generation
                </span>
              )}
            </label>
            {models.length > 0 ? (
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select an installed model --</option>
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name} {m.size ? `(${m.size})` : ''} {m.parameterSize ? `• ${m.parameterSize}` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center justify-between">
                <span>No local models detected. Make sure Ollama is running and a model is pulled.</span>
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  className="text-xs font-bold underline hover:text-amber-900 ml-2 shrink-0 cursor-pointer"
                >
                  See how
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Selected model specs pill */}
        {selectedModel && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Active:</span>
            <span className="font-mono bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-800 font-bold">
              {selectedModel}
            </span>
            {models.find((m) => m.name === selectedModel)?.size && (
              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                Size: {models.find((m) => m.name === selectedModel).size}
              </span>
            )}
            {selectedModel.toLowerCase().includes('coder') && (
              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800 flex items-center gap-1 font-semibold">
                <Sparkles className="w-3 h-3" /> Coding Specialist Model
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expandable Setup & Instruction Walkthrough */}
      {showGuide && (
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              How to Setup & Run Ollama Locally
            </h4>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              <span>Download Ollama</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Steps */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Step 1 */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  1
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Install Ollama
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Install Ollama on your Windows, Mac, or Linux desktop from{' '}
                <a
                  href="https://ollama.com/download"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 underline"
                >
                  ollama.com
                </a>
                .
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  2
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Pull & Run a Model
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Open Command Prompt or Terminal and launch your model of choice. It will auto-download on first run.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3 bg-white dark:bg-slate-800/80 rounded-xl border border-slate-200/80 dark:border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                  3
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  Generate Assessments
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Click "Check Connection", choose your model, and generate coding problems, MCQs, or full exams.
              </p>
            </div>
          </div>

          {/* Recommended Models with Quick Copy Commands */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Recommended Terminal Commands (Click to Copy):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {RECOMMENDED_MODELS.map((item) => {
                const cmd = `ollama run ${item.name}`;
                const isCopied = copiedCmd === cmd;
                return (
                  <div
                    key={item.name}
                    className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex flex-col justify-between gap-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100">
                            {item.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-tight mt-0.5">
                          {item.desc}
                        </p>
                      </div>
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                        {item.tag}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopy(cmd)}
                      className={`w-full mt-1 px-2.5 py-1.5 rounded-lg text-[11px] font-mono font-medium flex items-center justify-between transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700/60 hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{cmd}</span>
                      {isCopied ? (
                        <Check className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <strong>Why Local LLM?</strong> Your exam prompts, student questions, and test suites are processed 100% privately on your machine with zero cloud fees and full data privacy. Problem depth, starter code accuracy, and test case quality scale directly with the model you run (e.g. <code>qwen2.5-coder:7b</code> excels at complex algorithm problems and multi-case test suites).
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
