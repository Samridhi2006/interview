"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FallingPattern } from "@/components/ui/falling-pattern";

export default function LoginPage() {
  const [candidateName, setCandidateName] = useState("");
  const [questionsCount, setQuestionsCount] = useState(10);
  const [targetTrack, setTargetTrack] = useState("Software Engineer");
  const router = useRouter();

  const handleLogin = (e) => {
    e.preventDefault();
    if (candidateName.trim()) {
      const name = encodeURIComponent(candidateName.trim());
      router.push(`/interview?candidateId=${name}&totalQs=${questionsCount}&track=${encodeURIComponent(targetTrack)}`);
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 font-sans antialiased relative overflow-x-hidden">
      {/* Background Falling Matrix Pattern */}
      <FallingPattern 
        color="#00ff88" 
        backgroundColor="#000000" 
        duration={120} 
        blurIntensity="0px" 
        density={1.5} 
        className="fixed inset-0 z-0 pointer-events-none opacity-60 [mask-image:radial-gradient(circle_at_center,black_75%,transparent_100%)]" 
      />

      {/* ── Page shell ─────────────────────────────────────────── */}
      <div className="relative z-10 max-w-3xl mx-auto px-4 min-h-screen flex flex-col justify-center py-10 sm:py-16">
        <div className="max-w-md mx-auto space-y-8 py-10 w-full">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/20 bg-emerald-400/5 text-emerald-400 text-xs font-medium uppercase tracking-widest animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Adaptive Interview Engine
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 mt-2">
              Candidate Login
            </h1>
            <p className="text-zinc-500 text-sm">
              Enter your details to initiate the AI-driven adaptive technical evaluation.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 space-y-6 shadow-xl backdrop-blur-md"
          >
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Candidate Name / ID
              </label>
              <input
                type="text"
                required
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                placeholder="e.g. Samridhi Tripathi"
                className="w-full bg-slate-955/70 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder:text-zinc-800 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                Target Track / Role
              </label>
              <select
                value={targetTrack}
                onChange={(e) => setTargetTrack(e.target.value)}
                className="w-full bg-slate-955/70 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 transition-all font-mono"
              >
                <option value="Software Engineer">Software Engineer (General)</option>
                <option value="Frontend Developer">Frontend Developer</option>
                <option value="Backend Architect">Backend Architect</option>
                <option value="System Design Specialist">System Design Specialist</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs uppercase tracking-wider text-zinc-400 font-semibold">
                <span>Interview Duration</span>
                <span className="font-mono text-emerald-400">{questionsCount} Questions</span>
              </div>
              <input
                type="range"
                min="5"
                max="15"
                step="1"
                value={questionsCount}
                onChange={(e) => setQuestionsCount(Number(e.target.value))}
                className="w-full accent-emerald-400 h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-zinc-600 font-mono">
                <span>5 Qs (Express)</span>
                <span>10 Qs (Standard)</span>
                <span>15 Qs (Deep Dive)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!candidateName.trim()}
              className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-850 disabled:text-zinc-600 disabled:cursor-not-allowed text-sm font-bold text-slate-900 transition-all active:scale-95 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_28px_rgba(16,185,129,0.4)]"
            >
              Begin Assessment →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
