/**
 * Question.js — Mongoose Schema
 * Represents a single interview question stored in MongoDB.
 * Questions are tagged by difficulty (1–5) and topic,
 * enabling efficient filtered queries via $nin for anti-duplicate logic.
 */

const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    /**
     * The question text displayed to the candidate.
     * Required, trimmed, and indexed for fast lookups.
     */
    text: {
      type: String,
      required: [true, "Question text is required."],
      trim: true,
      unique: true, // Prevents duplicate question entries at the DB level
    },

    /**
     * Difficulty level from 1 (easiest) to 5 (hardest).
     * Used by the adaptive engine to query the right tier.
     */
    difficulty: {
      type: Number,
      required: [true, "Difficulty level is required."],
      min: [1, "Minimum difficulty is 1."],
      max: [5, "Maximum difficulty is 5."],
      index: true, // Compound index with difficulty for O(1) tier lookups
    },

    /**
     * Broad topic category (e.g., "Data Structures", "System Design").
     * Useful for post-interview analytics breakdown.
     */
    topic: {
      type: String,
      trim: true,
      default: "General",
    },

    /**
     * Optional hint or model answer stored for evaluator reference.
     * NOT sent to the candidate frontend.
     */
    expectedKeywords: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: "questions",
  }
);

// Compound index: most queries filter by difficulty and exclude a set of IDs
QuestionSchema.index({ difficulty: 1, _id: 1 });

module.exports = mongoose.model("Question", QuestionSchema);
