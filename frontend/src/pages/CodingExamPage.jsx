import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Editor from "@monaco-editor/react";
import api from "../api/axios";
import { useSocket } from "../context/SocketContext";
import logo from "../assets/logo.jpeg";
import {
  Clock,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  FileCode,
  ShieldAlert,
  Loader2,
  AlertCircle,
  Monitor,
  Eye,
  Play,
  Terminal,
  X,
  ChevronUp,
  ChevronDown,
  CheckSquare,
} from "lucide-react";

const DEFAULT_TEMPLATES = {
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your code here
        
    }
}
`,
  python: `# Write your Python code here
`,
  javascript: `// Write your JavaScript code here
`,
};

export default function CodingExamPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const [exam, setExam] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [qId]: { language, code } }
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [violationCount, setViolationCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenModal, setShowFullscreenModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [terminatedModal, setTerminatedModal] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));
  const [customInputs, setCustomInputs] = useState({}); // { [key]: string }
  const [selectedCaseIndices, setSelectedCaseIndices] = useState({}); // { [qId]: number | 'custom' }
  const [runOutputs, setRunOutputs] = useState({}); // { [qId]: { status, stdout, stderr, compileOutput, executionTime } }
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [showConsoleDrawer, setShowConsoleDrawer] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState("input"); // "input" | "output"
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  const hasEnteredFullscreenRef = useRef(false);

  // Top-Level Memoized Questions - MUST be called unconditionally on EVERY render
  const validQuestions = useMemo(() => {
    return Array.isArray(exam?.questions) ? exam.questions.filter(Boolean) : [];
  }, [exam?.questions]);

  const currentQ = validQuestions[currentQIndex] || validQuestions[0] || null;
  const currentQId = currentQ?._id || "";
  const currentQIsMcq = (currentQ?.type || 'CODING') === 'MCQ';

  // Top-Level Sample Test Cases Memo - MUST be called unconditionally on EVERY render
  const currentCases = useMemo(() => {
    if (!currentQ) return [];
    if (Array.isArray(currentQ.sampleTestCases) && currentQ.sampleTestCases.length > 0) {
      return currentQ.sampleTestCases;
    }
    if (Array.isArray(currentQ.examples) && currentQ.examples.length > 0) {
      return currentQ.examples.map((ex, idx) => ({
        _id: `ex_${idx}`,
        input: ex.input || "",
        expectedOutput: ex.output || "",
      }));
    }
    return [];
  }, [currentQ]);

  // Alias for testcase references
  const availableCases = currentCases;

  const currentAnswer = (currentQId && answers[currentQId]) || (
    currentQIsMcq
      ? { type: 'MCQ', selectedOption: null }
      : {
          type: 'CODING',
          language: "java",
          code: currentQ?.starterCode?.java || DEFAULT_TEMPLATES.java,
        }
  );

  const activeCaseKey = currentQId
    ? (selectedCaseIndices[currentQId] !== undefined
        ? selectedCaseIndices[currentQId]
        : (availableCases.length > 0 ? 0 : 'custom'))
    : 'custom';

  const currentCustomInput =
    currentQId && customInputs[currentQId] !== undefined
      ? customInputs[currentQId]
      : (availableCases[0]?.input || currentQ?.examples?.[0]?.input || "");

  const currentRunOutput = currentQId ? runOutputs[currentQId] : null;

  const handleOptionSelect = (optionIdx) => {
    if (!currentQ || !currentQId) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQId]: {
        ...prev[currentQId],
        type: 'MCQ',
        selectedOption: optionIdx,
      },
    }));
  };

  const handleCustomInputChange = (val) => {
    if (!currentQ || !currentQId) return;
    setCustomInputs((prev) => ({
      ...prev,
      [currentQId]: val,
    }));
  };

  // Helper to determine if question has been actively attempted by the student
  const isQuestionAttempted = (question, answer) => {
    if (!question) return false;
    const qType = question.type || 'CODING';

    if (qType === 'MCQ') {
      return answer && answer.selectedOption !== undefined && answer.selectedOption !== null && answer.selectedOption !== '';
    }

    if (!answer || !answer.code) return false;
    const currentCode = answer.code.replace(/\s+/g, "");
    if (!currentCode) return false;

    // 1. Check against question's custom starter code for current language
    const customStarter = (
      question?.starterCode?.[answer.language] || ""
    ).replace(/\s+/g, "");
    if (customStarter && currentCode === customStarter) return false;

    // 2. Check against default template for current language
    const defaultTemplate = (DEFAULT_TEMPLATES[answer.language] || "").replace(
      /\s+/g,
      "",
    );
    if (defaultTemplate && currentCode === defaultTemplate) return false;

    // 3. Check against ANY default templates (in case user changed language or left default)
    const isAnyDefault = Object.values(DEFAULT_TEMPLATES).some(
      (t) => t.replace(/\s+/g, "") === currentCode,
    );
    if (isAnyDefault) return false;

    // 4. Check against all custom starter codes for this question
    if (question?.starterCode) {
      const isAnyCustom = Object.values(question.starterCode).some(
        (t) => t && t.replace(/\s+/g, "") === currentCode,
      );
      if (isAnyCustom) return false;
    }

    return currentCode.length > 5;
  };

  // Show transient proctoring warning toast
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // Load Exam and Attempt Details
  useEffect(() => {
    async function initExam() {
      try {
        const res = await api.get(`/exams/${id}`);
        const examData = res.data.data.exam;
        const activeAttempt = res.data.data.activeAttempt;

        if (!activeAttempt || activeAttempt.status !== "IN_PROGRESS") {
          // If not started yet, redirect to instructions
          navigate(`/exams/${id}/instructions`);
          return;
        }

        setExam(examData);
        setAttempt(activeAttempt);
        setRemainingSeconds(activeAttempt.remainingSeconds || 0);
        setViolationCount(activeAttempt.violationCount || 0);

        // Initialize answers state from localStorage or default starter templates
        const storedKey = `exam_progress_${id}_${activeAttempt._id}`;
        const localSaved = localStorage.getItem(storedKey);
        let initialAnswers = {};

        if (localSaved) {
          try {
            initialAnswers = JSON.parse(localSaved);
          } catch (e) {}
        }

        (examData.questions || []).filter(Boolean).forEach((q) => {
          if (q && q._id && !initialAnswers[q._id]) {
            const isMcq = (q.type || 'CODING') === 'MCQ';
            if (isMcq) {
              initialAnswers[q._id] = {
                type: 'MCQ',
                selectedOption: null,
              };
            } else {
              const defaultLang = q.allowedLanguages?.includes("java")
                ? "java"
                : q.allowedLanguages?.[0] || "java";
              const template =
                q.starterCode?.[defaultLang] ||
                DEFAULT_TEMPLATES[defaultLang] ||
                DEFAULT_TEMPLATES["java"];
              initialAnswers[q._id] = {
                type: 'CODING',
                language: defaultLang,
                code: template,
              };
            }
          }
        });

        setAnswers(initialAnswers);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load assessment.");
      } finally {
        setLoading(false);
      }
    }

    initExam();
  }, [id, navigate]);

  // Persist local answers to localStorage
  useEffect(() => {
    if (attempt?._id && Object.keys(answers).length > 0) {
      const storedKey = `exam_progress_${id}_${attempt._id}`;
      localStorage.setItem(storedKey, JSON.stringify(answers));
    }
  }, [answers, id, attempt]);

  // Server-synchronized countdown timer
  useEffect(() => {
    if (!attempt?.endTime) return;

    const interval = setInterval(() => {
      const endMs = new Date(attempt.endTime).getTime();
      const diffSec = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
      setRemainingSeconds(diffSec);

      if (diffSec <= 0) {
        clearInterval(interval);
        showToast(
          "Time has expired! Automatically submitting your examination...",
        );
        handleFinalSubmit(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt]);

  // Track window resize for desktop resolution enforcement
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Track visited questions
  useEffect(() => {
    setVisitedQuestions((prev) => new Set([...prev, currentQIndex]));
  }, [currentQIndex]);

  // Safe exit from fullscreen
  const exitFullscreenSafe = async () => {
    try {
      hasEnteredFullscreenRef.current = false;
      const el =
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement;
      if (el) {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen)
          await document.webkitExitFullscreen();
        else if (document.msExitFullscreen) await document.msExitFullscreen();
      }
    } catch (e) {}
  };

  // Anti-Cheating & Proctoring Event Handler
  const logProctoringEvent = useCallback(
    async (type, details) => {
      if (!attemptRef.current?._id) return;
      try {
        const res = await api.post(`/exams/${id}/event`, { type, details });
        const {
          violationCount: newCount,
          maxViolations,
          terminated,
        } = res.data.data;
        setViolationCount(newCount);

        if (terminated) {
          await exitFullscreenSafe();
          setTerminatedModal({
            message: `Your examination has been terminated due to exceeding ${maxViolations} proctoring violations.`,
            attemptId: attemptRef.current?._id,
          });
          return;
        }

        showToast(
          `⚠️ Proctoring Warning: [${type.replace("_", " ")}] recorded! (${newCount}/${maxViolations})`,
        );
      } catch (e) {
        console.error("Failed to log event", e);
      }
    },
    [id, navigate],
  );

  // Proctoring listeners
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logProctoringEvent(
          "tab_switch",
          "Candidate switched browser tab or minimized window",
        );
      }
    };

    const handleWindowBlur = () => {
      logProctoringEvent("blur", "Candidate window lost focus");
    };

    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isFull);
      if (!isFull) {
        setShowFullscreenModal(true);
        if (hasEnteredFullscreenRef.current) {
          logProctoringEvent(
            "fullscreen_exit",
            "Candidate exited full screen mode",
          );
        }
      } else {
        hasEnteredFullscreenRef.current = true;
        setShowFullscreenModal(false);
      }
    };

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Assessment in progress! Do not leave this page.";
    };

    // Disable right click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      logProctoringEvent(
        "context_menu",
        "Candidate attempted right-click context menu",
      );
      showToast("⚠️ Right click is disabled during examination.");
      return false;
    };

    // Block DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U, Ctrl+S)
    const handleKeyDown = (e) => {
      if (e.key === "F12" || e.keyCode === 123) {
        e.preventDefault();
        e.stopPropagation();
        logProctoringEvent(
          "devtools_attempt",
          "Candidate pressed F12 DevTools key",
        );
        showToast("⚠️ DevTools shortcut is disabled! Security alert logged.");
        return false;
      }
      if (
        e.ctrlKey &&
        e.shiftKey &&
        ["i", "j", "c"].includes(e.key?.toLowerCase())
      ) {
        e.preventDefault();
        e.stopPropagation();
        logProctoringEvent(
          "devtools_attempt",
          `Candidate pressed Ctrl+Shift+${e.key.toUpperCase()} DevTools shortcut`,
        );
        showToast("⚠️ DevTools inspection disabled! Security alert logged.");
        return false;
      }
      if (e.ctrlKey && e.key?.toLowerCase() === "u") {
        e.preventDefault();
        e.stopPropagation();
        logProctoringEvent(
          "view_source_attempt",
          "Candidate pressed Ctrl+U View Source shortcut",
        );
        showToast("⚠️ View Source disabled! Security alert logged.");
        return false;
      }
      if (e.ctrlKey && e.key?.toLowerCase() === "s") {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    // Initial fullscreen verification on component mount
    const isCurrentlyFull = !!(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
    );
    setIsFullscreen(isCurrentlyFull);
    if (isCurrentlyFull) {
      hasEnteredFullscreenRef.current = true;
      setShowFullscreenModal(false);
    } else {
      const el = document.documentElement;
      const req =
        el.requestFullscreen ||
        el.webkitRequestFullscreen ||
        el.msRequestFullscreen;
      if (req) {
        req
          .call(el)
          .then(() => {
            setIsFullscreen(true);
            hasEnteredFullscreenRef.current = true;
            setShowFullscreenModal(false);
          })
          .catch(() => {
            // Browser requires direct user click gesture to enter fullscreen
            setShowFullscreenModal(true);
          });
      }
    }

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      exitFullscreenSafe();
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [logProctoringEvent]);

  // Real-time socket listener for proctoring events
  useEffect(() => {
    if (!socket) return;
    const handleSocketViolation = (data) => {
      if (
        data &&
        (data.attemptId === attemptRef.current?._id || !data.attemptId)
      ) {
        if (typeof data.violationCount === "number") {
          setViolationCount(data.violationCount);
        }
        if (data.terminated) {
          exitFullscreenSafe();
          setTerminatedModal({
            message: "Your examination has been terminated due to excessive proctoring violations.",
            attemptId: attemptRef.current?._id,
          });
        }
      }
    };

    socket.on("proctoring:warning", handleSocketViolation);
    return () => {
      socket.off("proctoring:warning", handleSocketViolation);
    };
  }, [socket, navigate]);

  // Force candidate back to fullscreen on user gesture
  const enterFullscreen = async () => {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen) {
        await el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen();
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen();
      }
      setIsFullscreen(true);
      hasEnteredFullscreenRef.current = true;
      setShowFullscreenModal(false);
    } catch (err) {
      console.warn("Fullscreen entry rejected:", err);
    }
  };

  // Toggle Fullscreen Mode
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      enterFullscreen();
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Switch Language for current question
  const handleLanguageChange = (newLang) => {
    const currentQ = validQuestions[currentQIndex];
    if (!currentQ || !currentQ._id) return;

    const currentCode = answers[currentQ._id]?.code || "";
    const isDefault =
      !currentCode.trim() ||
      Object.values(DEFAULT_TEMPLATES).some(
        (t) => t.trim() === currentCode.trim(),
      ) ||
      Object.values(currentQ.starterCode || {}).some(
        (t) => t && t.trim() === currentCode.trim(),
      );

    const newCode = isDefault
      ? currentQ.starterCode?.[newLang] || DEFAULT_TEMPLATES[newLang] || ""
      : currentCode;

    setAnswers((prev) => ({
      ...prev,
      [currentQ._id]: {
        language: newLang,
        code: newCode,
      },
    }));
  };

  // Update Code
  const handleCodeChange = (newCode) => {
    const currentQ = validQuestions[currentQIndex];
    if (!currentQ || !currentQ._id) return;

    setAnswers((prev) => ({
      ...prev,
      [currentQ._id]: {
        ...prev[currentQ._id],
        code: newCode || "",
      },
    }));
  };

  // Submit Exam Handler
  const handleFinalSubmit = async (forced = false) => {
    if (isSubmitting) return;

    const totalQuestions = validQuestions.length;
    const allQuestionsVisited = totalQuestions > 0 && visitedQuestions.size >= totalQuestions;
    if (!forced && !allQuestionsVisited) {
      showToast(`Please visit all ${totalQuestions} questions before submitting assessment (${visitedQuestions.size}/${totalQuestions} visited).`);
      return;
    }

    setIsSubmitting(true);

    try {
      await exitFullscreenSafe();

      const currentAnswers = answersRef.current || {};
      const payloadAnswers = validQuestions.map((q) => {
        const qId = (q._id || q.questionId?._id || q.questionId || '').toString();
        const ans = currentAnswers[qId] || {};
        const isMcq = (q.type || 'CODING') === 'MCQ';

        const rawOpt = ans.selectedOption;
        const selectedOption = rawOpt !== undefined && rawOpt !== null && rawOpt !== '' && !isNaN(Number(rawOpt))
          ? Number(rawOpt)
          : null;

        return {
          questionId: qId,
          type: isMcq ? 'MCQ' : 'CODING',
          language: ans.language || (isMcq ? undefined : 'java'),
          code: ans.code || '',
          selectedOption,
        };
      });

      const res = await api.post(`/exams/${id}/submit`, {
        attemptId: attemptRef.current._id,
        answers: payloadAnswers,
      });

      // Clear local storage progress
      localStorage.removeItem(`exam_progress_${id}_${attemptRef.current._id}`);

      // Navigate to evaluation waiting & results page
      navigate(`/results/${attemptRef.current._id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit exam");
      setIsSubmitting(false);
      setShowSubmitModal(false);
    }
  };

  // Format timer HH:MM:SS
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? `${h.toString().padStart(2, "0")}:` : ""}${m
      .toString()
      .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleRunCode = async () => {
    if (isRunningCode || !currentQ || !currentQ._id) return;

    const qId = currentQ._id;
    const isCustom = activeCaseKey === 'custom';
    const activeTc = !isCustom ? currentCases[activeCaseKey] : null;
    const inputVal = isCustom
      ? (customInputs[qId] !== undefined ? customInputs[qId] : "")
      : (customInputs[`${qId}_case_${activeCaseKey}`] !== undefined
          ? customInputs[`${qId}_case_${activeCaseKey}`]
          : (activeTc?.input || ""));
    const expectedOut = activeTc ? (activeTc.expectedOutput || "") : null;
    const caseLabel = activeTc ? `Case ${Number(activeCaseKey) + 1}` : 'Custom Input';

    setIsRunningCode(true);
    setShowConsoleDrawer(true);
    setActiveConsoleTab("output");

    try {
      const res = await api.post(`/exams/${id}/run-code`, {
        questionId: qId,
        language: currentAnswer.language,
        sourceCode: currentAnswer.code,
        customInput: inputVal,
      });

      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        const isCompileError = Boolean(data.compileOutput);
        const isRuntimeError = Boolean(data.stderr) && !data.compileOutput;
        let passed = null;
        if (!isCompileError && !isRuntimeError && expectedOut !== null) {
          passed = (data.stdout || '').trim() === expectedOut.trim();
        }

        setRunOutputs((prev) => ({
          ...prev,
          [qId]: {
            ...data,
            caseLabel,
            inputUsed: inputVal,
            expectedOutput: expectedOut,
            passed,
            isCompileError,
            isRuntimeError,
          },
        }));
      } else {
        setRunOutputs((prev) => ({
          ...prev,
          [qId]: {
            status: "SYSTEM_ERROR",
            stdout: "",
            stderr: "Execution returned empty response.",
            compileOutput: "",
            executionTime: 0,
            caseLabel,
            inputUsed: inputVal,
            expectedOutput: expectedOut,
            passed: false,
          },
        }));
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || "Failed to execute code";
      setRunOutputs((prev) => ({
        ...prev,
        [qId]: {
          status: "SYSTEM_ERROR",
          stdout: "",
          stderr: errMsg,
          compileOutput: "",
          executionTime: 0,
          caseLabel,
          inputUsed: inputVal,
          expectedOutput: expectedOut,
          passed: false,
        },
      }));
    } finally {
      setIsRunningCode(false);
    }
  };

  // Accurate counting of attempted, visited, and unvisited questions
  const attemptedCount = validQuestions.filter((q) =>
    isQuestionAttempted(q, answers[q?._id]),
  ).length;
  const visitedCount = validQuestions.filter(
    (q, idx) =>
      !isQuestionAttempted(q, answers[q?._id]) && visitedQuestions.has(idx),
  ).length;
  const notVisitedCount = validQuestions.filter(
    (q, idx) =>
      !isQuestionAttempted(q, answers[q?._id]) && !visitedQuestions.has(idx),
  ).length;

  const totalQuestions = validQuestions.length;
  const allQuestionsVisited = totalQuestions > 0 && visitedQuestions.size >= totalQuestions;

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm text-slate-500 font-mono">
          Loading secure examination workspace...
        </p>
      </div>
    );
  }

  if (error || !exam || validQuestions.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 p-6">
        <div className="p-6 rounded-2xl bg-white border border-slate-200 max-w-md text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">
            {error ? "Assessment Access Error" : "Assessment Unavailable"}
          </h2>
          <p className="text-xs text-slate-500">
            {error || "No questions have been configured for this examination yet."}
          </p>
          <button
            onClick={() => navigate("/exams")}
            className="px-4 py-2 bg-blue-600 rounded-xl text-xs font-semibold text-white hover:bg-blue-500 transition-colors shadow-sm cursor-pointer"
          >
            Return to Assessments
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className="h-screen w-screen flex flex-col bg-slate-50 text-slate-800 overflow-hidden font-sans select-none">
      {/* Toast Notification for Proctoring Warnings */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-amber-500 text-white font-bold text-xs shadow-lg flex items-center gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-3 min-w-0 py-6">
          <div className="w-32 h-14 rounded-xl bg-gradient-to-tr from-blue-600 to-blue-500 flex items-center justify-center shadow-md shadow-blue-600/15">
            {/* <Code2 className="w-5 h-5 text-white" /> */}
            <img
              src={logo}
              alt="CodeAssess Logo"
              className="w-full h-full rounded-xl"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-slate-800 truncate max-w-xs sm:max-w-md">
              {exam.title}
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              Question {currentQIndex + 1} of {validQuestions.length} • Total:{" "}
              {exam.totalMarks} Marks
            </p>
          </div>
        </div>

        {/* Center / Right Controls: Timer, Violations, Fullscreen, Submit */}
        <div className="flex items-center gap-3">
          {/* Proctoring Violation Counter */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border ${
              violationCount > 0
                ? "bg-rose-50 text-rose-600 border-rose-200"
                : "bg-slate-100 text-slate-600 border-slate-200"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>
              Violations: {violationCount}/{exam.maxViolations || 5}
            </span>
          </div>

          {/* Server-Controlled Countdown Timer */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-colors ${
              remainingSeconds < 300
                ? "bg-rose-50 text-rose-600 border-rose-200 animate-pulse"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Final Submit Exam Button */}
          <button
            onClick={() => {
              if (!allQuestionsVisited) {
                showToast(`Please visit all ${totalQuestions} questions before submitting assessment (${visitedQuestions.size}/${totalQuestions} visited).`);
                return;
              }
              setShowSubmitModal(true);
            }}
            disabled={!allQuestionsVisited}
            title={
              allQuestionsVisited
                ? "Finalize and submit examination"
                : `Visit all ${totalQuestions} questions to enable submission (${visitedQuestions.size}/${totalQuestions} visited)`
            }
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
              allQuestionsVisited
                ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 cursor-pointer"
                : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60 shadow-none"
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam {!allQuestionsVisited && `(${visitedQuestions.size}/${totalQuestions})`}</span>
          </button>
        </div>
      </header>

      {/* Main Assessment Body: Left Question List + Center Description + Right Monaco Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Question List & Status */}
        <aside className="w-56 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-slate-200">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Questions ({attemptedCount}/{validQuestions.length})
            </span>
          </div>

          <div className="p-2 space-y-1">
            {validQuestions.map((q, idx) => {
              const ans = answers[q?._id];
              const isAttempted = isQuestionAttempted(q, ans);
              const isVisited = !isAttempted && visitedQuestions.has(idx);
              const isSelected = idx === currentQIndex;
              const isCoding = (q.type || 'CODING') === 'CODING';

              return (
                <button
                  key={q._id || idx}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between ${
                    isSelected
                      ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[11px] shrink-0">
                      Q{idx + 1}
                    </span>
                    <span
                      className={`text-[8px] font-bold px-1 rounded uppercase shrink-0 ${
                        isCoding ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {isCoding ? 'Code' : 'MCQ'}
                    </span>
                    <span className="truncate">{q.title}</span>
                  </div>
                  {isAttempted ? (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                      title="Attempted"
                    >
                      Attempted
                    </span>
                  ) : isVisited ? (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shrink-0"
                      title="Visited"
                    >
                      Visited
                    </span>
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full bg-slate-300 shrink-0"
                      title="Not Visited"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto p-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-1.5 bg-slate-50/80">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Attempted
              </span>
              <span className="font-mono text-emerald-600 font-bold">
                {attemptedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                <Eye className="w-3 h-3 text-amber-600" /> Visited
              </span>
              <span className="font-mono text-amber-600 font-bold">
                {visitedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2 h-2 rounded-full bg-slate-300 ml-0.5" />{" "}
                Not Visited
              </span>
              <span className="font-mono text-slate-600 font-bold">
                {notVisitedCount}
              </span>
            </div>
          </div>
        </aside>

        {/* Center: Problem Statement */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-slate-200 overflow-y-auto bg-slate-50">
          <div className="p-6 space-y-6 max-w-3xl">
            {/* Title & Metadata */}
            <div className="space-y-2 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-600 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                  Question {currentQIndex + 1}
                </span>
                <span className="text-xs font-semibold text-blue-600 px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                  {currentQ.marks} Marks
                </span>
                <span className="text-xs font-semibold text-slate-600 px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                  {currentQ.difficulty}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
                {currentQ.title}
              </h2>
            </div>

            {/* Problem Description */}
            <div className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              {currentQ.description}
            </div>

            {/* Input & Output Format */}
            {currentQ.inputFormat && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Input Format
                </h4>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-line shadow-sm">
                  {currentQ.inputFormat}
                </div>
              </div>
            )}

            {currentQ.outputFormat && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Output Format
                </h4>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-line shadow-sm">
                  {currentQ.outputFormat}
                </div>
              </div>
            )}

            {/* Constraints */}
            {currentQ.constraints && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Constraints
                </h4>
                <div className="p-3 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-line shadow-sm">
                  {currentQ.constraints}
                </div>
              </div>
            )}

            {/* Examples */}
            {currentQ.examples?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Examples
                </h4>
                {currentQ.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-white border border-slate-200 space-y-2 text-xs shadow-sm"
                  >
                    <p className="font-bold text-slate-700">
                      Example {idx + 1}:
                    </p>
                    <div>
                      <span className="text-slate-500 font-mono">Input:</span>
                      <pre className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-slate-800">
                        {ex.input}
                      </pre>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">
                        Expected Output:
                      </span>
                      <pre className="mt-1 p-2 bg-slate-50 rounded border border-slate-200 font-mono text-emerald-600 font-semibold">
                        {ex.output}
                      </pre>
                    </div>
                    {ex.explanation && (
                      <p className="text-slate-500 text-[11px] italic pt-1">
                        Explanation: {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Monaco Code Editor OR MCQ Option Selection */}
        <section className="flex-1 flex flex-col min-w-0 bg-white">
          {currentQIsMcq ? (
            /* MCQ Interactive Selection View */
            <div className="flex-1 flex flex-col overflow-y-auto p-6 md:p-8 bg-slate-50/50">
              <div className="max-w-2xl w-full mx-auto space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                    <span className="font-bold text-slate-800 text-sm">Select Your Answer</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    Single Choice • {currentQ.marks} Marks
                  </span>
                </div>

                <div className="space-y-3">
                  {(currentQ.options || []).map((opt, optIdx) => {
                    const letter = String.fromCharCode(65 + optIdx);
                    const isSelected = currentAnswer?.selectedOption !== null &&
                      currentAnswer?.selectedOption !== undefined &&
                      Number(currentAnswer.selectedOption) === optIdx;

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleOptionSelect(optIdx)}
                        className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/20 shadow-sm'
                            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80 shadow-xs'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 border border-slate-200 text-slate-700'
                          }`}
                        >
                          {letter}
                        </div>
                        <div className="flex-1 pt-0.5 min-w-0">
                          <p className={`text-sm leading-relaxed ${isSelected ? 'font-semibold text-blue-900' : 'text-slate-700'}`}>
                            {opt.text}
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentAnswer?.selectedOption !== null && currentAnswer?.selectedOption !== undefined ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-700">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Answer Recorded: Option {String.fromCharCode(65 + Number(currentAnswer.selectedOption))}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOptionSelect(null)}
                      className="text-emerald-700 hover:underline text-[11px] font-medium"
                    >
                      Clear Selection
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic text-center">
                    Click any option above to select your answer.
                  </p>
                )}
              </div>
            </div>
          ) : (
            /* Coding Monaco Editor View */
            <>
              {/* Editor Sub-header: Language selector & Notice */}
              <div className="h-11 bg-white border-b border-slate-200 px-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-600" />
                  <label className="text-xs font-semibold text-slate-600">
                    Language:
                  </label>
                  <select
                    value={currentAnswer.language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    {["java", "python", "javascript"].map((lang) => (
                      <option key={lang} value={lang}>
                        {lang === "javascript"
                          ? "JavaScript"
                          : lang.charAt(0).toUpperCase() + lang.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="text-[11px] text-blue-600 font-medium flex items-center gap-1.5">
                  <span>Auto-saved locally</span>
                </div>
              </div>

              {/* Monaco Editor Container */}
              <div className="flex-1 relative overflow-hidden flex flex-col">
                <div className="flex-1 relative overflow-hidden min-h-[160px]">
                  <Editor
                    height="100%"
                    theme="vs-dark"
                    loading={
                      <div className="flex flex-col items-center justify-center h-full gap-2 text-slate-400 bg-[#1e1e1e] font-sans text-xs">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        <span>Initializing code editor...</span>
                      </div>
                    }
                    language={
                      currentAnswer?.language === "javascript"
                        ? "javascript"
                        : currentAnswer?.language === "python"
                          ? "python"
                          : "java"
                    }
                    value={currentAnswer?.code || ""}
                    onChange={handleCodeChange}
                    options={{
                      fontSize: 13,
                      fontFamily:
                        "'Fira Code', 'JetBrains Mono', Consolas, monospace",
                      minimap: { enabled: false },
                      scrollBeyondLastLine: false,
                      wordWrap: "on",
                      automaticLayout: true,
                      tabSize: 4,
                      suggestOnTriggerCharacters: true,
                    }}
                  />
                </div>

                {/* Collapsible Console Drawer (when question or exam allows code run) */}
                {Boolean(currentQ?.allowCodeRun) && showConsoleDrawer && (
                  <div className="h-64 sm:h-72 border-t border-slate-200 bg-white flex flex-col shrink-0 animate-in slide-in-from-bottom-2 duration-150 shadow-lg">
                    {/* Console Drawer Header with Tabs */}
                    <div className="h-9 bg-slate-50 border-b border-slate-200 px-3 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setActiveConsoleTab("input")}
                          className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                            activeConsoleTab === "input"
                              ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Terminal className="w-3 h-3" />
                          Test Cases
                          {availableCases.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-mono">
                              {availableCases.length}
                            </span>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveConsoleTab("output")}
                          className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
                            activeConsoleTab === "output"
                              ? "bg-white text-blue-600 shadow-sm border border-slate-200"
                              : "text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Code2 className="w-3 h-3" />
                          Test Result
                          {currentRunOutput && (
                            <span
                              className={`w-2 h-2 rounded-full ${
                                currentRunOutput.passed === true
                                  ? "bg-emerald-500"
                                  : currentRunOutput.passed === false || currentRunOutput.isCompileError || currentRunOutput.isRuntimeError
                                  ? "bg-rose-500"
                                  : "bg-blue-500"
                              }`}
                            />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {activeConsoleTab === "output" && currentRunOutput && (
                          <div className="flex items-center gap-2 text-[10px]">
                            {currentRunOutput.passed === true ? (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                                ✓ Passed
                              </span>
                            ) : currentRunOutput.passed === false ? (
                              <span className="px-2 py-0.5 rounded-full font-bold bg-rose-50 text-rose-700 border border-rose-300">
                                ✗ Wrong Answer
                              </span>
                            ) : (
                              <span
                                className={`px-1.5 py-0.5 rounded font-bold font-mono ${
                                  currentRunOutput.status === "SUCCESS"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {currentRunOutput.status}
                              </span>
                            )}
                            {currentRunOutput.executionTime !== undefined && (
                              <span className="text-slate-500 font-mono">
                                {currentRunOutput.executionTime}s
                              </span>
                            )}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowConsoleDrawer(false)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
                          title="Close Console"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Console Drawer Body */}
                    <div className="flex-1 p-3 overflow-auto bg-slate-50 font-mono text-xs">
                      {activeConsoleTab === "input" ? (
                        <div className="h-full flex flex-col space-y-2">
                          {/* Case Selection Tabs (LeetCode Style) */}
                          <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 font-sans">
                            {availableCases.map((tc, idx) => (
                              <button
                                key={tc._id || idx}
                                type="button"
                                onClick={() =>
                                  setSelectedCaseIndices((prev) => ({
                                    ...prev,
                                    [currentQ._id]: idx,
                                  }))
                                }
                                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                  activeCaseKey === idx
                                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20 font-bold"
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                Case {idx + 1}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedCaseIndices((prev) => ({
                                  ...prev,
                                  [currentQ._id]: "custom",
                                }))
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                                activeCaseKey === "custom"
                                  ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20 font-bold"
                                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              + Custom Input
                            </button>
                          </div>

                          {/* Selected Case Content */}
                          {activeCaseKey === "custom" ? (
                            <div className="flex-1 flex flex-col">
                              <div className="text-[11px] text-slate-500 mb-1 font-sans">
                                Custom standard input (stdin) provided to your program:
                              </div>
                              <textarea
                                value={
                                  customInputs[currentQ._id] !== undefined
                                    ? customInputs[currentQ._id]
                                    : ""
                                }
                                onChange={(e) => handleCustomInputChange(e.target.value)}
                                placeholder="Enter custom input (stdin) here..."
                                className="flex-1 w-full bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono text-xs leading-relaxed shadow-sm min-h-[80px]"
                              />
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 min-h-[90px]">
                              <div className="flex flex-col">
                                <span className="text-[11px] text-slate-500 mb-1 font-sans font-semibold">
                                  Input (stdin):
                                </span>
                                <textarea
                                  value={
                                    customInputs[`${currentQ._id}_case_${activeCaseKey}`] !== undefined
                                      ? customInputs[`${currentQ._id}_case_${activeCaseKey}`]
                                      : (availableCases[activeCaseKey]?.input || "")
                                  }
                                  onChange={(e) =>
                                    setCustomInputs((prev) => ({
                                      ...prev,
                                      [`${currentQ._id}_case_${activeCaseKey}`]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 w-full bg-white border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-mono text-xs leading-relaxed shadow-sm"
                                />
                              </div>

                              <div className="flex flex-col">
                                <span className="text-[11px] text-slate-500 mb-1 font-sans font-semibold">
                                  Expected Output (stdout):
                                </span>
                                <div className="flex-1 w-full bg-slate-100 border border-slate-200 rounded-lg p-2 text-emerald-700 font-mono text-xs leading-relaxed overflow-auto whitespace-pre-wrap select-text">
                                  {availableCases[activeCaseKey]?.expectedOutput || "(empty)"}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-full space-y-3">
                          {isRunningCode ? (
                            <div className="flex flex-col items-center justify-center h-full text-blue-600 py-6 gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span className="text-xs font-sans text-slate-600">
                                Compiling and executing your code in secure sandbox...
                              </span>
                            </div>
                          ) : !currentRunOutput ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-500 py-6 text-center font-sans gap-1">
                              <Terminal className="w-5 h-5 text-slate-400 mb-1" />
                              <span className="text-xs">No execution output yet.</span>
                              <span className="text-[11px] text-slate-500">
                                Click "Run Code" below to test your solution with public testcases or custom input.
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {/* Verdict Banner */}
                              <div className="flex items-center justify-between pb-1 border-b border-slate-200 font-sans">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-700">
                                    {currentRunOutput.caseLabel || "Test Case"}
                                  </span>
                                  {currentRunOutput.passed === true ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                                      ✓ Passed
                                    </span>
                                  ) : currentRunOutput.passed === false ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                                      ✗ Wrong Answer
                                    </span>
                                  ) : currentRunOutput.isCompileError ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                      ✗ Compilation Error
                                    </span>
                                  ) : currentRunOutput.isRuntimeError ? (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                      ✗ Runtime Error
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                                      Finished ({currentRunOutput.status})
                                    </span>
                                  )}
                                </div>

                                {currentRunOutput.executionTime !== undefined && (
                                  <span className="text-slate-500 font-mono text-xs">
                                    Time: {currentRunOutput.executionTime}s
                                  </span>
                                )}
                              </div>

                              {/* Compilation Error Message */}
                              {currentRunOutput.compileOutput && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] whitespace-pre-wrap font-mono">
                                  <div className="font-bold text-rose-800 mb-1 font-sans">
                                    Compilation / Syntax Error:
                                  </div>
                                  {currentRunOutput.compileOutput}
                                </div>
                              )}

                              {/* Runtime / Stderr Error Message */}
                              {currentRunOutput.stderr && !currentRunOutput.compileOutput && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-[11px] whitespace-pre-wrap font-mono">
                                  <div className="font-bold text-rose-800 mb-1 font-sans">
                                    Runtime Error / Traceback:
                                  </div>
                                  {currentRunOutput.stderr}
                                </div>
                              )}

                              {/* Input vs Output Comparison */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <div className="text-[10px] text-slate-500 font-sans mb-1 font-semibold">
                                    Input:
                                  </div>
                                  <div className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-800 whitespace-pre-wrap font-mono shadow-sm">
                                    {currentRunOutput.inputUsed || "(empty)"}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-[10px] text-slate-500 font-sans mb-1 font-semibold">
                                    Your Output:
                                  </div>
                                  <div
                                    className={`p-2.5 rounded-lg whitespace-pre-wrap font-mono border shadow-sm ${
                                      currentRunOutput.passed === false
                                        ? "bg-rose-50 border-rose-200 text-rose-800"
                                        : "bg-white border-slate-200 text-slate-800"
                                    }`}
                                  >
                                    {currentRunOutput.stdout || "(empty output)"}
                                  </div>
                                </div>
                              </div>

                              {/* Expected Output (if available) */}
                              {currentRunOutput.expectedOutput !== null &&
                                currentRunOutput.expectedOutput !== undefined && (
                                  <div>
                                    <div className="text-[10px] text-slate-500 font-sans mb-1 font-semibold">
                                      Expected Output:
                                    </div>
                                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 whitespace-pre-wrap font-mono shadow-sm">
                                      {currentRunOutput.expectedOutput}
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Bottom Editor Bar */}
          <div className="h-12 bg-white border-t border-slate-200 px-4 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                disabled={currentQIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-200 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() =>
                  setCurrentQIndex(
                    Math.min(validQuestions.length - 1, currentQIndex + 1),
                  )
                }
                disabled={currentQIndex === validQuestions.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-200 transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {currentQIndex === validQuestions.length - 1 && (
                <button
                  onClick={() => {
                    if (!allQuestionsVisited) {
                      showToast(`Please visit all ${totalQuestions} questions before submitting assessment (${visitedQuestions.size}/${totalQuestions} visited).`);
                      return;
                    }
                    setShowSubmitModal(true);
                  }}
                  disabled={!allQuestionsVisited}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    allQuestionsVisited
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-600/20 cursor-pointer"
                      : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Send className="w-3 h-3" />
                  <span>Submit Exam {!allQuestionsVisited && `(${visitedQuestions.size}/${totalQuestions})`}</span>
                </button>
              )}
            </div>

            {/* Run Code Controls (Displayed if this specific question has code run allowed) */}
            {!currentQIsMcq && Boolean(currentQ?.allowCodeRun) ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowConsoleDrawer(!showConsoleDrawer);
                    if (!showConsoleDrawer && !currentRunOutput) {
                      setActiveConsoleTab("input");
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                    showConsoleDrawer
                      ? "bg-blue-50 text-blue-700 border-blue-300"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Console & Test Cases</span>
                  {showConsoleDrawer ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </button>

                <button
                  type="button"
                  onClick={handleRunCode}
                  disabled={isRunningCode}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRunningCode ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Running...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Run Code</span>
                    </>
                  )}
                </button>
              </div>
            ) : !currentQIsMcq ? (
              <div className="text-xs text-slate-500 italic">
                Notice: Code is compiled & tested upon final exam submission.
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-medium">
                Multiple choice question • Click option to choose answer
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Confirmation Modal for Final Submit */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-blue-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-slate-800">
                Confirm Final Exam Submission
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Are you sure you want to finalize your assessment? Once submitted,
              you cannot resume or modify any solutions.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Solutions Written:</span>
                <span className="font-bold text-emerald-600">
                  {attemptedCount} of {validQuestions.length}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Unattempted Questions:</span>
                <span className="font-bold text-rose-600">
                  {validQuestions.length - attemptedCount}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Time Remaining:</span>
                <span className="font-mono font-bold text-blue-600">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold bg-white hover:bg-slate-50 transition-colors shadow-sm"
              >
                Return to Editor
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Evaluating in Docker...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Yes, Submit Everything</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strict Fullscreen Security Enforcement Modal */}
      {showFullscreenModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-white border-2 border-rose-500 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 tracking-tight">
                  SECURITY VIOLATION: FULLSCREEN REQUIRED
                </h3>
                <p className="text-xs text-rose-600 font-medium mt-0.5">
                  Assessment access is locked until fullscreen is restored
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-slate-700 space-y-2 leading-relaxed">
              <p>
                Exiting or minimizing full-screen mode is recorded as a serious
                proctoring violation. You must remain in full-screen mode to
                prevent unauthorized tab switches or background activity.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-rose-200 text-xs font-semibold">
                <span className="text-slate-500">Recorded Violations:</span>
                <span className="font-mono text-rose-600 font-bold">
                  {violationCount} / {exam?.maxViolations || 5} (Limit:{" "}
                  {exam?.maxViolations || 5})
                </span>
              </div>
              {violationCount >= (exam?.maxViolations || 5) - 1 && (
                <p className="text-rose-600 font-bold text-[11px] pt-1">
                  ⚠️ WARNING: One more violation will immediately terminate and
                  submit your assessment!
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={enterFullscreen}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Return to Fullscreen & Resume Assessment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screen Resolution Enforcement Blocker (< 1024px width or < 550px height) */}
      {(windowSize.width < 1024 || windowSize.height < 550) && (
        <div className="fixed inset-0 z-[200] bg-slate-50 flex items-center justify-center p-6 text-center select-none">
          <div className="bg-white border-2 border-amber-300 rounded-2xl max-w-lg w-full p-8 shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 mx-auto">
              <Monitor className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                DESKTOP / LAPTOP RESOLUTION REQUIRED
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                This examination environment requires a standard desktop or
                laptop screen (minimum width: 1024px) to ensure code
                readability, fair proctoring, and test integrity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-500">
                <span>Current Resolution:</span>
                <span className="font-bold text-rose-600">
                  {windowSize.width}px × {windowSize.height}px
                </span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Minimum Required:</span>
                <span className="font-bold text-emerald-600">
                  1024px × 550px
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-600 font-medium">
              Please maximize your browser window or switch to a compatible
              desktop/laptop computer to resume.
            </p>
          </div>
        </div>
      )}

      {/* Proctoring Rules Violation Termination Custom Modal */}
      {terminatedModal && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-sm sm:max-w-md w-full p-5 shadow-xl space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-800 tracking-tight truncate">
                  Examination Terminated
                </h3>
                <p className="text-[11px] text-rose-600 font-medium">
                  Proctoring Violation Limit Exceeded
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 leading-relaxed">
              <p className="text-slate-800 font-medium">
                {terminatedModal.message}
              </p>
              <p className="text-slate-500 text-[11px]">
                All further actions have been locked. Your submitted code has been saved.
              </p>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                onClick={() => {
                  if (terminatedModal.attemptId) {
                    navigate(`/results/${terminatedModal.attemptId}`);
                  } else {
                    navigate('/results');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                View Examination Results
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
