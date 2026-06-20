"use client";

import { useState, useRef, useEffect } from "react";

/* ─────────────────────────────────────────────
   Difficulty Level Configurations
   ───────────────────────────────────────────── */
const DIFFICULTY_CONFIG = {
  1: {
    label: "Beginner",
    color: "emerald",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    gradient: "from-emerald-500 to-teal-500",
    icon: "★",
  },
  2: {
    label: "Elementary",
    color: "teal",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/30",
    gradient: "from-teal-500 to-cyan-500",
    icon: "★★",
  },
  3: {
    label: "Intermediate",
    color: "blue",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    gradient: "from-blue-500 to-indigo-500",
    icon: "★★★",
  },
  4: {
    label: "Advanced",
    color: "purple",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/30",
    gradient: "from-purple-500 to-violet-500",
    icon: "★★★★",
  },
  5: {
    label: "Expert",
    color: "rose",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/30",
    gradient: "from-rose-500 to-pink-500",
    icon: "★★★★★",
  },
};

export default function Home() {
  // ─── State Management ───
  const [candidateName, setCandidateName] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 10 });
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState("welcome"); // welcome | active | feedback | completed
  const [analytics, setAnalytics] = useState(null);
  const [lastResult, setLastResult] = useState(null); // { score, feedback, wasSkipped }

  const textareaRef = useRef(null);

  // Auto-focus textarea when question loads
  useEffect(() => {
    if (phase === "active" && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [phase, currentQuestion]);

  // Auto-dismiss error after 5s
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(t);
    }
  }, [error]);

  /* ─────────────────────────────────────────────
     API: Start Interview
     ───────────────────────────────────────────── */
  const handleStart = async (e) => {
    e.preventDefault();
    if (!candidateName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateName }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setSessionId(data.sessionId);
      setCurrentQuestion(data.nextQuestion);
      setProgress(data.progress);
      setPhase("active");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────
     API: Submit Answer
     ───────────────────────────────────────────── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!answer.trim()) return;
    await processTurn({ answer, isSkipped: false });
  };

  /* ─────────────────────────────────────────────
     API: Skip Question
     ───────────────────────────────────────────── */
  const handleSkip = async () => {
    await processTurn({ answer: "", isSkipped: true });
  };

  /* ─────────────────────────────────────────────
     Common Turn Processor
     ───────────────────────────────────────────── */
  const processTurn = async (payload) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, ...payload }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      if (data.isCompleted) {
        setAnalytics(data.analytics);
        setPhase("completed");
      } else {
        // Show feedback briefly before loading next question
        setLastResult({
          score: data.lastScore,
          feedback: data.lastFeedback,
          wasSkipped: data.wasSkipped,
        });
        setPhase("feedback");

        // Auto-transition to next question after a delay
        setTimeout(() => {
          setCurrentQuestion(data.nextQuestion);
          setProgress(data.progress);
          setAnswer("");
          setLastResult(null);
          setPhase("active");
        }, 2200);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────
     Reset Everything
     ───────────────────────────────────────────── */
  const handleReset = () => {
    setSessionId(null);
    setCurrentQuestion(null);
    setAnswer("");
    setAnalytics(null);
    setCandidateName("");
    setLastResult(null);
    setError(null);
    setPhase("welcome");
  };

  // Helper for difficulty styling
  const dc = (level) => DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG[1];

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* ── Animated Background ── */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950" />
        <div className="absolute top-[-50%] left-[-20%] w-[70vw] h-[70vw] bg-indigo-600/8 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-[-40%] right-[-15%] w-[60vw] h-[60vw] bg-purple-600/6 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: "1.5s" }} />
        <div className="absolute top-[20%] right-[10%] w-[30vw] h-[30vw] bg-cyan-500/5 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: "3s" }} />
      </div>

      {/* ── Error Toast ── */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-up max-w-lg w-full mx-4">
          <div className="bg-rose-500/15 backdrop-blur-xl border border-rose-500/30 text-rose-300 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <span className="text-rose-400 font-bold text-lg">⚠</span>
            <span className="text-sm flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-400/70 hover:text-rose-300 text-lg font-bold transition-colors"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* ── Main Card ── */}
      <div className="w-full max-w-4xl">

        {/* ╔═══════════════════════════════════╗
           ║   WELCOME SCREEN                  ║
           ╚═══════════════════════════════════╝ */}
        {phase === "welcome" && (
          <div className="animate-fade-in">
            <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800/60 rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-8 sm:p-12 md:p-16 flex flex-col items-center text-center">
                {/* Logo */}
                <div className="relative mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/25 rotate-3 hover:rotate-0 transition-transform duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-slate-900 animate-pulse" />
                </div>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                  <span className="bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                    Adaptive Interview
                  </span>
                  <br />
                  <span className="text-slate-300 text-2xl sm:text-3xl md:text-4xl">
                    Engine
                  </span>
                </h1>

                <p className="text-slate-400 max-w-md mb-10 leading-relaxed text-sm sm:text-base">
                  AI-powered technical assessments that adapt in real-time.
                  Questions dynamically scale to your skill level, creating a
                  personalized evaluation journey.
                </p>

                {/* Feature Pills */}
                <div className="flex flex-wrap justify-center gap-2 mb-10">
                  {[
                    "Dynamic Difficulty",
                    "AI Evaluation",
                    "Anti-Cheat",
                    "Live Analytics",
                  ].map((feat) => (
                    <span
                      key={feat}
                      className="bg-slate-800/60 border border-slate-700/50 text-slate-400 text-xs px-3 py-1.5 rounded-full"
                    >
                      {feat}
                    </span>
                  ))}
                </div>

                {/* Start Form */}
                <form onSubmit={handleStart} className="w-full max-w-sm space-y-4">
                  <div className="relative">
                    <input
                      type="text"
                      id="candidate-name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Enter your full name"
                      disabled={loading}
                      required
                      className="w-full bg-slate-950/70 border border-slate-700/50 rounded-2xl px-5 py-4 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/60 transition-all text-center text-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !candidateName.trim()}
                    className="group w-full relative bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white font-semibold px-6 py-4 rounded-2xl transition-all duration-300 shadow-xl hover:shadow-indigo-500/30 active:scale-[0.97]"
                  >
                    <span className="flex items-center justify-center gap-2">
                      {loading ? (
                        <>
                          <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Initializing...
                        </>
                      ) : (
                        <>
                          Begin Assessment
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 group-hover:translate-x-1 transition-transform">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </>
                      )}
                    </span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════╗
           ║   ACTIVE INTERVIEW PANEL           ║
           ╚═══════════════════════════════════╝ */}
        {phase === "active" && currentQuestion && (
          <div className="animate-slide-up">
            <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800/60 rounded-3xl shadow-2xl overflow-hidden">
              {/* Header Bar */}
              <div className="bg-slate-950/50 border-b border-slate-800/60 px-6 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-indigo-400">
                      Q{progress.current}
                      <span className="text-slate-600 font-normal">
                        /{progress.total}
                      </span>
                    </span>
                    <span className="w-1 h-1 bg-slate-700 rounded-full" />
                    <span className="text-xs text-slate-500">
                      {currentQuestion.topic}
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${dc(currentQuestion.difficulty).bg} ${dc(currentQuestion.difficulty).text} ${dc(currentQuestion.difficulty).border}`}
                  >
                    <span className="text-[10px] font-mono tracking-widest">
                      {dc(currentQuestion.difficulty).icon}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider">
                      {dc(currentQuestion.difficulty).label}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-700 ease-out rounded-full"
                    style={{
                      width: `${((progress.current - 1) / progress.total) * 100}%`,
                    }}
                  />
                </div>
              </div>

              {/* Question Body */}
              <div className="p-6 sm:p-8">
                <h2 className="text-lg sm:text-xl font-medium leading-relaxed text-slate-200 mb-8">
                  {currentQuestion.text}
                </h2>

                {loading ? (
                  <div className="py-20 flex flex-col items-center gap-4">
                    <div className="relative w-14 h-14">
                      <div className="absolute inset-0 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                      <div className="absolute inset-2 border-2 border-purple-500/10 border-b-purple-500/50 rounded-full animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
                    </div>
                    <p className="text-sm text-slate-500 animate-pulse">
                      Evaluating your response...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label
                        htmlFor="answer-input"
                        className="block text-[11px] font-semibold text-slate-500 uppercase tracking-widest mb-2"
                      >
                        Your Response
                      </label>
                      <textarea
                        ref={textareaRef}
                        id="answer-input"
                        rows={6}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Write a detailed, technical explanation..."
                        required
                        className="w-full bg-slate-950/60 border border-slate-800/60 rounded-2xl p-5 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/40 transition-all font-mono text-sm leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-3">
                      <button
                        type="button"
                        onClick={handleSkip}
                        className="px-6 py-3 text-sm font-medium text-slate-400 border border-slate-800 rounded-xl hover:bg-amber-500/10 hover:text-amber-400 hover:border-amber-500/30 transition-all active:scale-[0.97]"
                      >
                        <span className="flex items-center gap-2 justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
                          </svg>
                          Skip
                        </span>
                      </button>
                      <button
                        type="submit"
                        disabled={!answer.trim()}
                        className="px-8 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-[0.97]"
                      >
                        Submit Answer
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════╗
           ║   FEEDBACK INTERSTITIAL            ║
           ╚═══════════════════════════════════╝ */}
        {phase === "feedback" && lastResult && (
          <div className="animate-slide-up">
            <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800/60 rounded-3xl shadow-2xl p-8 sm:p-12 text-center">
              {lastResult.wasSkipped ? (
                <>
                  <div className="w-16 h-16 mx-auto mb-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-amber-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-amber-400 mb-2">
                    Question Skipped
                  </h3>
                  <p className="text-slate-400 text-sm">
                    Difficulty adjusted downward. Loading next question...
                  </p>
                </>
              ) : (
                <>
                  <div
                    className={`w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center border ${
                      lastResult.score >= 7
                        ? "bg-emerald-500/10 border-emerald-500/20"
                        : lastResult.score >= 4
                        ? "bg-blue-500/10 border-blue-500/20"
                        : "bg-rose-500/10 border-rose-500/20"
                    }`}
                  >
                    <span
                      className={`text-3xl font-extrabold font-mono ${
                        lastResult.score >= 7
                          ? "text-emerald-400"
                          : lastResult.score >= 4
                          ? "text-blue-400"
                          : "text-rose-400"
                      }`}
                    >
                      {lastResult.score}
                    </span>
                  </div>
                  <h3
                    className={`text-xl font-bold mb-3 ${
                      lastResult.score >= 7
                        ? "text-emerald-400"
                        : lastResult.score >= 4
                        ? "text-blue-400"
                        : "text-rose-400"
                    }`}
                  >
                    {lastResult.score >= 7
                      ? "Excellent!"
                      : lastResult.score >= 4
                      ? "Solid Effort"
                      : "Needs Work"}
                  </h3>
                  <p className="text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                    {lastResult.feedback}
                  </p>
                  <p className="text-slate-600 text-xs mt-4 animate-pulse">
                    Loading next question...
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* ╔═══════════════════════════════════╗
           ║   ANALYTICS REPORT                 ║
           ╚═══════════════════════════════════╝ */}
        {phase === "completed" && analytics && (
          <div className="animate-fade-in space-y-6">
            {/* Report Header */}
            <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800/60 rounded-3xl shadow-2xl p-8 sm:p-10 text-center">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Assessment Complete
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-100">
                Results for{" "}
                <span className="bg-gradient-to-r from-indigo-300 to-purple-300 bg-clip-text text-transparent">
                  {analytics.candidateName}
                </span>
              </h2>
              <p className="text-slate-500 text-xs mt-2">
                {analytics.totalQuestions} questions · Completed at{" "}
                {new Date(analytics.completedAt).toLocaleTimeString()}
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Average Score */}
              <div className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 text-center overflow-hidden hover:border-indigo-500/30 transition-all duration-500">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Avg Score
                </p>
                <p className="text-4xl font-extrabold text-indigo-400 font-mono">
                  {analytics.averageScore}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">out of 10</p>
              </div>

              {/* Peak Difficulty */}
              <div className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 text-center overflow-hidden hover:border-purple-500/30 transition-all duration-500">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Peak Difficulty
                </p>
                <p className="text-4xl font-extrabold text-purple-400 font-mono">
                  L{analytics.peakDifficulty}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  {dc(analytics.peakDifficulty).label}
                </p>
              </div>

              {/* Answered */}
              <div className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 text-center overflow-hidden hover:border-emerald-500/30 transition-all duration-500">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Answered
                </p>
                <p className="text-4xl font-extrabold text-emerald-400 font-mono">
                  {analytics.totalAnswered}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  of {analytics.totalQuestions}
                </p>
              </div>

              {/* Total Skipped */}
              <div className="group relative bg-slate-900/50 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 text-center overflow-hidden hover:border-amber-500/30 transition-all duration-500">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                  Skipped
                </p>
                <p className="text-4xl font-extrabold text-amber-400 font-mono">
                  {analytics.totalSkipped}
                </p>
                <p className="text-[10px] text-slate-600 mt-1">
                  bypassed (0 pts)
                </p>
              </div>
            </div>

            {/* Journey Table */}
            <div className="bg-slate-900/50 backdrop-blur-2xl border border-slate-800/60 rounded-3xl shadow-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-slate-800/60">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">
                  Interview Journey
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-950/60 border-b border-slate-800/40">
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        #
                      </th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Level
                      </th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Score
                      </th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">
                        Question
                      </th>
                      <th className="py-3 px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Feedback
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/30">
                    {analytics.history.map((step, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-slate-800/20 transition-colors"
                        style={{
                          animation: `fade-in 0.3s ease-out ${idx * 0.05}s both`,
                        }}
                      >
                        <td className="py-4 px-5 font-mono font-bold text-slate-500 text-xs">
                          {idx + 1}
                        </td>
                        <td className="py-4 px-5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${dc(step.difficulty).bg} ${dc(step.difficulty).text} ${dc(step.difficulty).border}`}
                          >
                            {dc(step.difficulty).icon.slice(0, step.difficulty)}
                            <span className="hidden sm:inline ml-1">
                              {dc(step.difficulty).label}
                            </span>
                          </span>
                        </td>
                        <td className="py-4 px-5">
                          {step.isSkipped ? (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase">
                              Skipped
                            </span>
                          ) : (
                            <span
                              className={`font-bold font-mono text-sm ${
                                step.score >= 7
                                  ? "text-emerald-400"
                                  : step.score >= 4
                                  ? "text-blue-400"
                                  : "text-rose-400"
                              }`}
                            >
                              {step.score}
                              <span className="text-slate-600 text-xs">
                                /10
                              </span>
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5 max-w-[200px] truncate hidden md:table-cell text-slate-500 text-xs">
                          {step.questionText}
                        </td>
                        <td className="py-4 px-5 text-xs leading-relaxed text-slate-400 max-w-[250px]">
                          {step.feedback}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Restart Button */}
            <div className="text-center pb-4">
              <button
                onClick={handleReset}
                className="group inline-flex items-center gap-2 bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 font-medium px-8 py-3.5 rounded-2xl border border-slate-700/50 hover:border-slate-600/50 transition-all active:scale-[0.97]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 group-hover:-rotate-180 transition-transform duration-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                Start New Interview
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
