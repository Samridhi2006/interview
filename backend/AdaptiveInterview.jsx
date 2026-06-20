/**
 * AdaptiveInterview.jsx — Next.js / React Component
 * Adaptive Interview Engine — Full Interview UI + Post-Report Dashboard.
 *
 * Views:
 *   1. Loading      → spinner while initialising / evaluating
 *   2. Question     → textarea, Submit, Skip buttons + live progress header
 *   3. Evaluating   → brief feedback card after each answer, before next Q
 *   4. Report       → KPI cards + chronological history table
 *
 * Props:
 *   candidateId  {string}  optional — identifies the candidate
 *   totalQs      {number}  optional — defaults to 10
 *   apiBase      {string}  optional — defaults to "/api/interview"
 */

"use client"; // Required for Next.js App Router

import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Animated spinner used during loading states. */
const Spinner = ({ label = "Loading…" }) => (
  <div className="flex flex-col items-center justify-center gap-4 py-16">
    <div className="w-12 h-12 rounded-full border-4 border-cyan-400/20 border-t-cyan-400 animate-spin" />
    <p className="text-slate-400 text-sm tracking-wide">{label}</p>
  </div>
);

/** Difficulty level bar — 5 pips, active ones glow cyan. */
const DifficultyBar = ({ level, animate = false }) => (
  <div className="flex items-center gap-1.5" aria-label={`Difficulty level ${level} of 5`}>
    {Array.from({ length: 5 }, (_, i) => (
      <div
        key={i}
        className={`h-2 w-6 rounded-full transition-all duration-500 ${
          i < level
            ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.7)]"
            : "bg-slate-700"
        } ${animate && i === level - 1 ? "scale-125" : ""}`}
      />
    ))}
    <span className="ml-2 text-xs font-mono text-slate-400">L{level}</span>
  </div>
);

/** Single KPI metric card for the analytics report. */
const KpiCard = ({ label, value, sub, accent = "cyan" }) => {
  const accentMap = {
    cyan: "text-cyan-400 border-cyan-400/20",
    emerald: "text-emerald-400 border-emerald-400/20",
    amber: "text-amber-400 border-amber-400/20",
    rose: "text-rose-400 border-rose-400/20",
  };
  return (
    <div className={`rounded-xl border bg-slate-800/60 p-5 flex flex-col gap-1 ${accentMap[accent]}`}>
      <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">{label}</span>
      <span className={`text-4xl font-bold font-mono ${accentMap[accent].split(" ")[0]}`}>
        {value}
      </span>
      {sub && <span className="text-xs text-slate-500 mt-1">{sub}</span>}
    </div>
  );
};

/** Score badge with colour-coded background. */
const ScoreBadge = ({ score }) => {
  const colour =
    score >= 8
      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      : score >= 6
      ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
      : score >= 4
      ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
      : "bg-rose-500/15 text-rose-300 border-rose-500/30";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border ${colour}`}>
      {score}/10
    </span>
  );
};

/** Difficulty change indicator arrow. */
const DiffArrow = ({ from, to }) => {
  if (to > from) return <span className="text-emerald-400 text-xs font-bold">↑ {to}</span>;
  if (to < from) return <span className="text-rose-400 text-xs font-bold">↓ {to}</span>;
  return <span className="text-slate-400 text-xs font-bold">→ {to}</span>;
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
export default function AdaptiveInterview({
  candidateId = "anonymous",
  totalQs = 10,
  apiBase = "http://localhost:5000/api/interview",
}) {
  // ── State ──────────────────────────────────
  const [view, setView] = useState("login"); // "login" | "loading" | "question" | "evaluating" | "report"
  const [sessionId, setSessionId] = useState(null);
  const [candidateName, setCandidateName] = useState("");
  const [questionsCount, setQuestionsCount] = useState(totalQs);
  const [targetTrack, setTargetTrack] = useState("Software Engineer");
  const [question, setQuestion] = useState(null);       // { id, text, topic, difficulty }
  const [answer, setAnswer] = useState("");
  const [progress, setProgress] = useState({ current: 1, total: totalQs });
  const [difficulty, setDifficulty] = useState(1);
  const [difficultyJustChanged, setDifficultyJustChanged] = useState(false);
  const [lastResult, setLastResult] = useState(null);   // { score, evaluation, skipped, previousDifficulty, newDifficulty }
  const [analytics, setAnalytics] = useState(null);     // final report data
  const [history, setHistory] = useState([]);            // array of history entries
  const [error, setError] = useState(null);
  const [loadingLabel, setLoadingLabel] = useState("Setting up your session…");

  const textareaRef = useRef(null);

  // ── API helpers ────────────────────────────
  const apiFetch = useCallback(async (path, options = {}) => {
    const res = await fetch(`${apiBase}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || "An unexpected error occurred.");
    }
    return data;
  }, [apiBase]);

  // ── Start Interview Session ────────────────
  const handleStartInterview = async (name, numQs) => {
    try {
      setView("loading");
      setLoadingLabel("Setting up your session…");
      const data = await apiFetch("/start", {
        method: "POST",
        body: JSON.stringify({ candidateId: name.trim() || "anonymous", totalQuestions: numQs }),
      });
      const { sessionId: sid, question: q, currentDifficulty: diff, totalQuestions } = data.data;
      setSessionId(sid);
      setQuestion(q);
      setDifficulty(diff);
      setProgress({ current: 1, total: totalQuestions });
      setView("question");
    } catch (err) {
      setError(err.message);
      setView("error");
    }
  };

  // Auto-focus textarea when question view mounts
  useEffect(() => {
    if (view === "question") {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [view, question]);

  // Animate difficulty pip on change
  useEffect(() => {
    if (difficultyJustChanged) {
      const t = setTimeout(() => setDifficultyJustChanged(false), 600);
      return () => clearTimeout(t);
    }
  }, [difficultyJustChanged]);

  // ── Submit handler (both answer + skip) ───
  const handleSubmit = useCallback(
    async (isSkip = false) => {
      if (!sessionId || !question) return;
      if (!isSkip && !answer.trim()) {
        setError("Please write your answer before submitting.");
        return;
      }
      setError(null);

      try {
        setView("loading");
        setLoadingLabel(isSkip ? "Skipping question…" : "Evaluating your answer…");

        const payload = {
          sessionId,
          questionId: question.id,
          skipped: isSkip,
          answer: isSkip ? "" : answer.trim(),
        };

        const data = await apiFetch("/submit-answer", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        const { status, result, question: nextQ, progress: prog, analytics: analyticsData, history: hist } = data.data;

        if (status === "completed") {
          // Session is over — show the analytics report
          setAnalytics(analyticsData);
          setHistory(hist || []);
          setView("report");
        } else {
          // Show brief evaluation feedback before loading next question
          setLastResult(result);
          setDifficulty(result.newDifficulty);
          if (result.newDifficulty !== result.previousDifficulty) {
            setDifficultyJustChanged(true);
          }
          setProgress({ current: prog.questionNumber, total: prog.totalQuestions });
          setAnswer("");

          // Brief evaluation view, then auto-advance to next question
          setView("evaluating");
          setTimeout(() => {
            setQuestion(nextQ);
            setView("question");
          }, 2200);
        }
      } catch (err) {
        setError(err.message);
        setView("question"); // Return to question view so they can retry
      }
    },
    [sessionId, question, answer, apiFetch]
  );

  // Keyboard shortcut: Ctrl/Cmd + Enter to submit
  const handleKeyDown = useCallback(
    (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleSubmit(false);
      }
    },
    [handleSubmit]
  );

  // ── Retry / restart ────────────────────────
  const handleRestart = () => {
    setView("login");
    setSessionId(null);
    setQuestion(null);
    setAnswer("");
    setProgress({ current: 1, total: questionsCount });
    setDifficulty(1);
    setLastResult(null);
    setAnalytics(null);
    setHistory([]);
    setError(null);
  };

  // ── Progress bar percentage ─────────────────
  const progressPct = Math.round(((progress.current - 1) / progress.total) * 100);

  // ──────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0A0F1E] text-slate-100 font-sans antialiased">
      {/* ── Page shell ─────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">

        {/* Header — always visible unless on the report or login screens */}
        {view !== "report" && view !== "login" && (
          <header className="mb-10">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                  Adaptive Interview Engine
                </span>
              </div>
              {sessionId && (
                <span className="text-xs font-mono text-slate-600 hidden sm:block">
                  {sessionId}
                </span>
              )}
            </div>
          </header>
        )}

        {/* ══════════════════════════════════════════
            VIEW: LOGIN
        ══════════════════════════════════════════ */}
        {view === "login" && (
          <div className="max-w-md mx-auto space-y-8 py-10 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-400/20 bg-cyan-400/5 text-cyan-400 text-xs font-medium uppercase tracking-widest animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                Adaptive Interview Engine
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-100 mt-2">
                Candidate Login
              </h1>
              <p className="text-slate-500 text-sm">
                Enter your details to initiate the AI-driven adaptive technical evaluation.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (candidateName.trim()) {
                  handleStartInterview(candidateName, questionsCount);
                }
              }}
              className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-6 sm:p-8 space-y-6 shadow-xl"
            >
              {error && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Candidate Name / ID
                </label>
                <input
                  type="text"
                  required
                  value={candidateName}
                  onChange={(e) => setCandidateName(e.target.value)}
                  placeholder="e.g. Samridhi Tripathi"
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 placeholder:text-slate-600 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 transition-all font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  Target Track / Role
                </label>
                <select
                  value={targetTrack}
                  onChange={(e) => setTargetTrack(e.target.value)}
                  className="w-full bg-slate-900/70 border border-slate-700 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 transition-all font-mono"
                >
                  <option value="Software Engineer">Software Engineer (General)</option>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Architect">Backend Architect</option>
                  <option value="System Design Specialist">System Design Specialist</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <span>Interview Duration</span>
                  <span className="font-mono text-cyan-400">{questionsCount} Questions</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="15"
                  step="1"
                  value={questionsCount}
                  onChange={(e) => setQuestionsCount(Number(e.target.value))}
                  className="w-full accent-cyan-400 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-600 font-mono">
                  <span>5 Qs (Express)</span>
                  <span>10 Qs (Standard)</span>
                  <span>15 Qs (Deep Dive)</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={!candidateName.trim()}
                className="w-full py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-sm font-bold text-slate-900 transition-all active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_28px_rgba(34,211,238,0.4)]"
              >
                Begin Assessment →
              </button>
            </form>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: LOADING
        ══════════════════════════════════════════ */}
        {view === "loading" && <Spinner label={loadingLabel} />}

        {/* ══════════════════════════════════════════
            VIEW: ERROR
        ══════════════════════════════════════════ */}
        {view === "error" && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-center">
            <p className="text-rose-300 font-semibold mb-2">Something went wrong</p>
            <p className="text-slate-400 text-sm mb-5">{error}</p>
            <button
              onClick={handleRestart}
              className="px-5 py-2 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm hover:bg-rose-500/30 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: QUESTION
        ══════════════════════════════════════════ */}
        {view === "question" && question && (
          <div className="space-y-6">
            {/* Progress + Difficulty row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="text-slate-500 text-sm tabular-nums font-mono">
                  {progress.current} / {progress.total}
                </span>
                <div className="flex-1 h-1.5 bg-slate-800 rounded-full min-w-[120px] sm:min-w-[160px]">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
              <DifficultyBar level={difficulty} animate={difficultyJustChanged} />
            </div>

            {/* Topic tag */}
            {question.topic && (
              <div className="inline-flex items-center">
                <span className="text-[11px] uppercase tracking-widest text-cyan-400/70 border border-cyan-400/20 rounded-full px-3 py-0.5 bg-cyan-400/5">
                  {question.topic}
                </span>
              </div>
            )}

            {/* Question card */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-6 sm:p-8">
              <p className="font-mono text-slate-100 text-base sm:text-lg leading-relaxed whitespace-pre-wrap">
                {question.text}
              </p>
            </div>

            {/* Error banner (inline validation) */}
            {error && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-300 text-sm">
                {error}
              </div>
            )}

            {/* Answer textarea */}
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer here…"
                rows={6}
                className="w-full bg-slate-900/70 border border-slate-700 rounded-xl px-4 py-3.5 text-slate-100 placeholder:text-slate-600 text-sm leading-relaxed resize-none focus:outline-none focus:border-cyan-500/60 focus:ring-2 focus:ring-cyan-500/10 transition-all font-mono"
              />
              <span className="absolute bottom-3 right-3 text-xs text-slate-600 font-mono select-none">
                ⌘↵ submit
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3 pt-1">
              <button
                onClick={() => handleSubmit(true)}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg text-sm text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-slate-300 transition-all active:scale-95"
              >
                Skip question
              </button>
              <button
                onClick={() => handleSubmit(false)}
                disabled={!answer.trim()}
                className="flex-1 px-6 py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-sm font-semibold text-slate-900 transition-all active:scale-95 shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_28px_rgba(34,211,238,0.4)]"
              >
                Submit answer →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: EVALUATING (brief feedback card)
        ══════════════════════════════════════════ */}
        {view === "evaluating" && lastResult && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-xs uppercase tracking-widest text-slate-500 mb-3">Result</p>
              <div className="text-6xl font-bold font-mono text-cyan-400">
                {lastResult.score}
                <span className="text-2xl text-slate-600">/10</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700/60 bg-slate-800/50 p-5 space-y-3">
              <p className="text-slate-300 text-sm leading-relaxed">{lastResult.evaluation}</p>

              {/* Difficulty change indicator */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-700/40">
                <span className="text-xs text-slate-500">Difficulty:</span>
                <DiffArrow from={lastResult.previousDifficulty} to={lastResult.newDifficulty} />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-500 text-xs">
              <div className="w-3 h-3 rounded-full border-2 border-cyan-400/30 border-t-cyan-400 animate-spin" />
              Next question loading…
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            VIEW: REPORT (Post-Interview Analytics)
        ══════════════════════════════════════════ */}
        {view === "report" && analytics && (
          <div className="space-y-8">

            {/* Report header */}
            <div className="text-center space-y-2 pb-4 border-b border-slate-800">
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs uppercase tracking-widest text-slate-500 font-medium">
                  Interview Complete
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 tracking-tight">
                Performance Report
              </h1>
              <p className="text-slate-500 text-sm">
                {analytics.questionsAnswered} questions answered · Session {sessionId?.slice(-8)}
              </p>
            </div>

            {/* KPI Cards grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <KpiCard
                label="Avg. Score"
                value={analytics.averageScore}
                sub="out of 10"
                accent="cyan"
              />
              <KpiCard
                label="Peak Difficulty"
                value={`L${analytics.peakDifficulty}`}
                sub="highest reached"
                accent="emerald"
              />
              <KpiCard
                label="Skipped"
                value={analytics.totalSkipped}
                sub={`of ${analytics.questionsAnswered} questions`}
                accent="amber"
              />
              <KpiCard
                label="Final Level"
                value={`L${analytics.finalDifficulty}`}
                sub="difficulty at close"
                accent={analytics.finalDifficulty >= 4 ? "emerald" : analytics.finalDifficulty <= 2 ? "rose" : "cyan"}
              />
            </div>

            {/* Score trajectory bar chart (pure CSS) */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 p-5 sm:p-6">
              <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-5">
                Score Trajectory
              </h2>
              <div className="flex items-end gap-1.5 h-20">
                {history.map((entry, i) => {
                  const heightPct = `${(entry.score / 10) * 100}%`;
                  const barColour =
                    entry.score >= 8
                      ? "bg-emerald-400"
                      : entry.score >= 6
                      ? "bg-cyan-400"
                      : entry.score >= 4
                      ? "bg-amber-400"
                      : "bg-rose-400";
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center justify-end gap-1"
                      title={`Q${i + 1}: ${entry.score}/10`}
                    >
                      <div
                        className={`w-full rounded-t-sm ${barColour} transition-all duration-500 opacity-80 hover:opacity-100 min-h-[3px]`}
                        style={{ height: entry.score === 0 ? "3px" : heightPct }}
                      />
                      <span className="text-[9px] font-mono text-slate-600">{i + 1}</span>
                    </div>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-4 text-xs text-slate-500 flex-wrap">
                {[
                  { colour: "bg-emerald-400", label: "8–10 Excellent" },
                  { colour: "bg-cyan-400", label: "6–7 Good" },
                  { colour: "bg-amber-400", label: "4–5 Average" },
                  { colour: "bg-rose-400", label: "0–3 Poor" },
                ].map(({ colour, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-sm ${colour}`} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            {/* Chronological history table */}
            <div className="rounded-xl border border-slate-700/60 bg-slate-800/40 overflow-hidden">
              <div className="px-5 sm:px-6 py-4 border-b border-slate-700/60">
                <h2 className="text-xs uppercase tracking-widest text-slate-500">
                  Question-by-Question Breakdown
                </h2>
              </div>
              {/* Responsive: scrollable on mobile */}
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-widest text-slate-600 border-b border-slate-800">
                      <th className="text-left px-5 sm:px-6 py-3 font-medium w-8">#</th>
                      <th className="text-left px-3 py-3 font-medium">Question</th>
                      <th className="text-center px-3 py-3 font-medium w-16">Level</th>
                      <th className="text-center px-3 py-3 font-medium w-20">Score</th>
                      <th className="text-left px-3 py-3 pr-5 sm:pr-6 font-medium">Feedback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                      >
                        {/* Step number */}
                        <td className="px-5 sm:px-6 py-4 text-slate-600 font-mono text-xs tabular-nums">
                          {i + 1}
                        </td>
                        {/* Question text (truncated) */}
                        <td className="px-3 py-4 text-slate-300 max-w-xs">
                          <p className="line-clamp-2 text-xs font-mono leading-relaxed">
                            {entry.questionText}
                          </p>
                          {entry.skipped && (
                            <span className="inline-block mt-1 text-[10px] uppercase tracking-wider text-amber-400/70 border border-amber-400/20 rounded-full px-2 py-px">
                              Skipped
                            </span>
                          )}
                        </td>
                        {/* Difficulty at time */}
                        <td className="px-3 py-4 text-center">
                          <span className="text-xs font-mono text-slate-500">
                            L{entry.difficultyAtTime}
                          </span>
                        </td>
                        {/* Score badge */}
                        <td className="px-3 py-4 text-center">
                          <ScoreBadge score={entry.score} />
                        </td>
                        {/* Evaluation */}
                        <td className="px-3 py-4 pr-5 sm:pr-6 text-slate-500 text-xs leading-relaxed max-w-xs">
                          <p className="line-clamp-2">{entry.evaluation || "—"}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance verdict banner */}
            <div className="rounded-xl border p-5 sm:p-6 space-y-1 text-center
              border-cyan-400/20 bg-cyan-400/5">
              <p className="text-xs uppercase tracking-widest text-cyan-400/60 mb-2">
                Overall Verdict
              </p>
              <p className="text-2xl font-bold text-slate-100">
                {analytics.averageScore >= 8
                  ? "Outstanding Performance"
                  : analytics.averageScore >= 6
                  ? "Strong Candidate"
                  : analytics.averageScore >= 4
                  ? "Needs Improvement"
                  : "Significant Gaps Identified"}
              </p>
              <p className="text-slate-500 text-sm">
                {analytics.averageScore >= 8
                  ? "Exceptional technical depth across all difficulty tiers."
                  : analytics.averageScore >= 6
                  ? "Solid foundational knowledge with room to grow."
                  : analytics.averageScore >= 4
                  ? "Core concepts present, but deeper study is recommended."
                  : "Consider revisiting fundamentals before the next round."}
              </p>
            </div>

            {/* Restart CTA */}
            <div className="text-center pt-2">
              <button
                onClick={handleRestart}
                className="px-8 py-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-sm font-medium text-slate-300 transition-all active:scale-95"
              >
                Start a new session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
