/**
 * InterviewSession.js — Mongoose Schema
 * Tracks the complete lifecycle of a single interview session.
 * Persists state so page refreshes never break the flow.
 *
 * Key design decisions:
 *  - `askedQuestionIds` array powers the MongoDB $nin anti-duplicate filter.
 *  - `history` array is the source of truth for the post-interview report.
 *  - `lastAnswer` enables consecutive-repeat detection (anti-cheat).
 *  - `status` drives terminal-state logic on the backend.
 */

const mongoose = require("mongoose");

// ─────────────────────────────────────────────
// Sub-document: one step in the interview history
// ─────────────────────────────────────────────
const HistoryEntrySchema = new mongoose.Schema(
  {
    /** The question text shown to the candidate. */
    questionText: { type: String, required: true },

    /** Reference to the Question document (nullable for edge-case fallbacks). */
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },

    /** Candidate's raw answer string, or null if skipped. */
    answer: { type: String, default: null },

    /**
     * AI-assigned score 0–10.
     * 0 is always used for skipped questions.
     */
    score: { type: Number, min: 0, max: 10, default: 0 },

    /** Free-text feedback from Groq's evaluation. */
    evaluation: { type: String, default: "" },

    /**
     * Difficulty level at which this question was served.
     * Used to chart the adaptive journey in the analytics report.
     */
    difficultyAtTime: { type: Number, min: 1, max: 5 },

    /**
     * Whether the candidate clicked Skip instead of answering.
     * Skipped steps always score 0 and trigger a difficulty decrease.
     */
    skipped: { type: Boolean, default: false },

    /** ISO timestamp when this step was completed. */
    completedAt: { type: Date, default: Date.now },
  },
  { _id: true } // Each history entry gets its own ObjectId for traceability
);

// ─────────────────────────────────────────────
// Main Session Schema
// ─────────────────────────────────────────────
const InterviewSessionSchema = new mongoose.Schema(
  {
    /**
     * Optional: link a session to a user account.
     * Leave as String for flexibility (supports UUID, auth provider IDs, etc.)
     */
    candidateId: {
      type: String,
      trim: true,
      index: true,
    },

    /**
     * Current adaptive difficulty level.
     * Mutated after every evaluated answer.
     * Clamped: min 1, max 5.
     */
    currentDifficulty: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
    },

    /**
     * Array of Question ObjectIds already presented this session.
     * Used in MongoDB $nin queries to prevent duplicate questions.
     */
    askedQuestionIds: {
      type: [mongoose.Schema.Types.ObjectId],
      default: [],
    },

    /**
     * The full interview history — one entry per question step.
     * This is the single source of truth for analytics rendering.
     */
    history: {
      type: [HistoryEntrySchema],
      default: [],
    },

    /**
     * The last submitted answer string (non-null, non-skip).
     * Compared against the next submission for repeat-answer detection.
     */
    lastAnswer: {
      type: String,
      default: null,
    },

    /**
     * Maximum number of questions before the session auto-terminates.
     */
    totalQuestions: {
      type: Number,
      default: 10,
    },

    /**
     * Session lifecycle status.
     * - "active"    → interview in progress
     * - "completed" → all questions answered / session ended
     */
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true, // createdAt / updatedAt tracked automatically
    collection: "interview_sessions",
  }
);

// ─────────────────────────────────────────────
// Virtual: computed analytics derived at read-time
// ─────────────────────────────────────────────

/** Returns the number of questions answered so far. */
InterviewSessionSchema.virtual("questionsAnswered").get(function () {
  return this.history.length;
});

/** Returns the average score across all history entries. */
InterviewSessionSchema.virtual("averageScore").get(function () {
  if (!this.history.length) return 0;
  const total = this.history.reduce((sum, h) => sum + h.score, 0);
  return parseFloat((total / this.history.length).toFixed(2));
});

/** Returns count of skipped questions. */
InterviewSessionSchema.virtual("totalSkipped").get(function () {
  return this.history.filter((h) => h.skipped).length;
});

/** Returns the peak difficulty level reached during the session. */
InterviewSessionSchema.virtual("peakDifficulty").get(function () {
  if (!this.history.length) return 1;
  return Math.max(...this.history.map((h) => h.difficultyAtTime));
});

// Enable virtuals in JSON output (used when serialising for the frontend)
InterviewSessionSchema.set("toJSON", { virtuals: true });
InterviewSessionSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("InterviewSession", InterviewSessionSchema);
