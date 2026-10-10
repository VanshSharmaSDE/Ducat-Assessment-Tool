import React, { useState, useEffect, useRef, useCallback } from "react";
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1280,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const attemptRef = useRef(attempt);
  attemptRef.current = attempt;

  const hasEnteredFullscreenRef = useRef(false);

  // Helper to determine if question has been actively attempted/coded by the student
  const isCodeAttempted = (question, answer) => {
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

        examData.questions.forEach((q) => {
          if (!initialAnswers[q._id]) {
            const defaultLang = q.allowedLanguages?.includes("java")
              ? "java"
              : q.allowedLanguages?.[0] || "java";
            const template =
              q.starterCode?.[defaultLang] ||
              DEFAULT_TEMPLATES[defaultLang] ||
              DEFAULT_TEMPLATES["java"];
            initialAnswers[q._id] = {
              language: defaultLang,
              code: template,
            };
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
          alert(
            `Your examination has been terminated due to exceeding ${maxViolations} violations.`,
          );
          navigate(`/results/${attemptRef.current._id}`);
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
          alert(
            "Your examination has been terminated due to excessive proctoring violations.",
          );
          if (attemptRef.current?._id) {
            navigate(`/results/${attemptRef.current._id}`);
          }
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
    const currentQ = exam?.questions[currentQIndex];
    if (!currentQ) return;

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
    const currentQ = exam?.questions[currentQIndex];
    if (!currentQ) return;

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
    setIsSubmitting(true);

    try {
      await exitFullscreenSafe();

      const payloadAnswers = Object.entries(answersRef.current).map(
        ([qId, ans]) => ({
          questionId: qId,
          language: ans.language,
          code: ans.code,
        }),
      );

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

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white gap-3">
        <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
        <p className="text-sm text-slate-400 font-mono">
          Loading secure examination workspace...
        </p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 max-w-md text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold">Assessment Access Error</h2>
          <p className="text-xs text-slate-400">
            {error || "Could not load exam."}
          </p>
          <button
            onClick={() => navigate("/exams")}
            className="px-4 py-2 bg-sky-600 rounded-xl text-xs font-semibold hover:bg-sky-500 transition-colors"
          >
            Return to Assessments
          </button>
        </div>
      </div>
    );
  }

  const currentQ = exam.questions[currentQIndex];
  const currentAnswer = answers[currentQ._id] || {
    language: "java",
    code: currentQ.starterCode?.java || DEFAULT_TEMPLATES.java,
  };

  // Accurate counting of attempted, visited, and unvisited questions
  const attemptedCount = exam.questions.filter((q) =>
    isCodeAttempted(q, answers[q._id]),
  ).length;
  const visitedCount = exam.questions.filter(
    (q, idx) =>
      !isCodeAttempted(q, answers[q._id]) && visitedQuestions.has(idx),
  ).length;
  const notVisitedCount = exam.questions.filter(
    (q, idx) =>
      !isCodeAttempted(q, answers[q._id]) && !visitedQuestions.has(idx),
  ).length;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Toast Notification for Proctoring Warnings */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-bounce">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3 min-w-0 py-6">
          <div className="w-32 h-14 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
            {/* <Code2 className="w-5 h-5 text-white" /> */}
            <img
              src={logo}
              alt="CodeAssess Logo"
              className="w-full h-full rounded-xl"
            />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-white truncate max-w-xs sm:max-w-md">
              {exam.title}
            </h1>
            <p className="text-[11px] text-slate-400 truncate">
              Question {currentQIndex + 1} of {exam.questions.length} • Total:{" "}
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
                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                : "bg-slate-800/80 text-slate-400 border-slate-700/60"
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
                ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
                : "bg-slate-800 text-sky-400 border-slate-700"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{formatTime(remainingSeconds)}</span>
          </div>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>

          {/* Final Submit Exam Button */}
          <button
            onClick={() => setShowSubmitModal(true)}
            className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Exam</span>
          </button>
        </div>
      </header>

      {/* Main Assessment Body: Left Question List + Center Description + Right Monaco Editor */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Question List & Status */}
        <aside className="w-56 bg-slate-900/60 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto">
          <div className="p-3 border-b border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Questions ({attemptedCount}/{exam.questions.length})
            </span>
          </div>

          <div className="p-2 space-y-1">
            {exam.questions.map((q, idx) => {
              const ans = answers[q._id];
              const isAttempted = isCodeAttempted(q, ans);
              const isVisited = !isAttempted && visitedQuestions.has(idx);
              const isSelected = idx === currentQIndex;

              return (
                <button
                  key={q._id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between ${
                    isSelected
                      ? "bg-sky-600/20 text-sky-400 border border-sky-500/40 font-semibold"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[11px] shrink-0">
                      Q{idx + 1}
                    </span>
                    <span className="truncate">{q.title}</span>
                  </div>
                  {isAttempted ? (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0"
                      title="Attempted"
                    >
                      Attempted
                    </span>
                  ) : isVisited ? (
                    <span
                      className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0"
                      title="Visited"
                    >
                      Visited
                    </span>
                  ) : (
                    <span
                      className="w-2 h-2 rounded-full bg-slate-700 shrink-0"
                      title="Not Visited"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-auto p-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 bg-slate-900/90">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Attempted
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                {attemptedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                <Eye className="w-3 h-3 text-amber-400" /> Visited
              </span>
              <span className="font-mono text-amber-400 font-bold">
                {visitedCount}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2 h-2 rounded-full bg-slate-700 ml-0.5" />{" "}
                Not Visited
              </span>
              <span className="font-mono text-slate-400 font-bold">
                {notVisitedCount}
              </span>
            </div>
          </div>
        </aside>

        {/* Center: Problem Statement */}
        <section className="flex-1 flex flex-col min-w-0 border-r border-slate-800 overflow-y-auto bg-slate-950">
          <div className="p-6 space-y-6 max-w-3xl">
            {/* Title & Metadata */}
            <div className="space-y-2 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-sky-400 px-2 py-0.5 rounded bg-sky-500/10">
                  Question {currentQIndex + 1}
                </span>
                <span className="text-xs font-semibold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10">
                  {currentQ.marks} Marks
                </span>
                <span className="text-xs font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                  {currentQ.difficulty}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                {currentQ.title}
              </h2>
            </div>

            {/* Problem Description */}
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {currentQ.description}
            </div>

            {/* Input & Output Format */}
            {currentQ.inputFormat && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Input Format
                </h4>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-line">
                  {currentQ.inputFormat}
                </div>
              </div>
            )}

            {currentQ.outputFormat && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Output Format
                </h4>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-line">
                  {currentQ.outputFormat}
                </div>
              </div>
            )}

            {/* Constraints */}
            {currentQ.constraints && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Constraints
                </h4>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 whitespace-pre-line">
                  {currentQ.constraints}
                </div>
              </div>
            )}

            {/* Examples */}
            {currentQ.examples?.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Examples
                </h4>
                {currentQ.examples.map((ex, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs"
                  >
                    <p className="font-bold text-slate-300">
                      Example {idx + 1}:
                    </p>
                    <div>
                      <span className="text-slate-500 font-mono">Input:</span>
                      <pre className="mt-1 p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-slate-200">
                        {ex.input}
                      </pre>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">
                        Expected Output:
                      </span>
                      <pre className="mt-1 p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-emerald-400">
                        {ex.output}
                      </pre>
                    </div>
                    {ex.explanation && (
                      <p className="text-slate-400 text-[11px] italic pt-1">
                        Explanation: {ex.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Right Side: Monaco Code Editor */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {/* Editor Sub-header: Language selector & Notice */}
          <div className="h-11 bg-slate-900/90 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-400" />
              <label className="text-xs font-semibold text-slate-400">
                Language:
              </label>
              <select
                value={currentAnswer.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-sky-500 cursor-pointer"
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

            <div className="text-[11px] text-amber-400/90 font-medium flex items-center gap-1.5">
              <span>Auto-saved locally</span>
            </div>
          </div>

          {/* Monaco Editor Container */}
          <div className="flex-1 relative overflow-hidden">
            <Editor
              height="100%"
              theme="vs-dark"
              language={
                currentAnswer.language === "javascript"
                  ? "javascript"
                  : currentAnswer.language === "python"
                    ? "python"
                    : "java"
              }
              value={currentAnswer.code}
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

          {/* Bottom Editor Bar (Strictly NO Run Code button!) */}
          <div className="h-12 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentQIndex(Math.max(0, currentQIndex - 1))}
                disabled={currentQIndex === 0}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <button
                onClick={() =>
                  setCurrentQIndex(
                    Math.min(exam.questions.length - 1, currentQIndex + 1),
                  )
                }
                disabled={currentQIndex === exam.questions.length - 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 disabled:opacity-30 hover:bg-slate-700 transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs text-slate-400 italic">
              Notice: Code is compiled & tested upon final exam submission.
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Modal for Final Submit */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold text-white">
                Confirm Final Exam Submission
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Are you sure you want to finalize your assessment? Once submitted,
              you cannot resume or modify any solutions.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Solutions Written:</span>
                <span className="font-bold text-emerald-400">
                  {attemptedCount} of {exam.questions.length}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Unattempted Questions:</span>
                <span className="font-bold text-rose-400">
                  {exam.questions.length - attemptedCount}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Time Remaining:</span>
                <span className="font-mono font-bold text-sky-400">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Return to Editor
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all"
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
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 select-none">
          <div className="bg-slate-900 border-2 border-rose-500/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl shadow-rose-950/50 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  SECURITY VIOLATION: FULLSCREEN REQUIRED
                </h3>
                <p className="text-xs text-rose-400 font-medium mt-0.5">
                  Assessment access is locked until fullscreen is restored
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Exiting or minimizing full-screen mode is recorded as a serious
                proctoring violation. You must remain in full-screen mode to
                prevent unauthorized tab switches or background activity.
              </p>
              <div className="flex items-center justify-between pt-2 border-t border-rose-500/20 text-xs font-semibold">
                <span className="text-slate-400">Recorded Violations:</span>
                <span className="font-mono text-rose-400 font-bold">
                  {violationCount} / {exam?.maxViolations || 5} (Limit:{" "}
                  {exam?.maxViolations || 5})
                </span>
              </div>
              {violationCount >= (exam?.maxViolations || 5) - 1 && (
                <p className="text-rose-400 font-bold text-[11px] pt-1">
                  ⚠️ WARNING: One more violation will immediately terminate and
                  submit your assessment!
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={enterFullscreen}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-[200] bg-slate-950 flex items-center justify-center p-6 text-center select-none">
          <div className="bg-slate-900 border-2 border-amber-500/80 rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
              <Monitor className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                DESKTOP / LAPTOP RESOLUTION REQUIRED
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                This examination environment requires a standard desktop or
                laptop screen (minimum width: 1024px) to ensure code
                readability, fair proctoring, and test integrity.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Current Resolution:</span>
                <span className="font-bold text-rose-400">
                  {windowSize.width}px × {windowSize.height}px
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Minimum Required:</span>
                <span className="font-bold text-emerald-400">
                  1024px × 550px
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-400/90 font-medium">
              Please maximize your browser window or switch to a compatible
              desktop/laptop computer to resume.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
