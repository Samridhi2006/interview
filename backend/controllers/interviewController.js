/**
 * interviewController.js — Express Controller
 * Adaptive Interview Engine: core backend logic.
 *
 * Routes expected (in your Express router):
 *   POST /api/interview/start           → initSession
 *   POST /api/interview/submit-answer   → submitAnswer
 *   GET  /api/interview/:sessionId      → getSession
 *
 * Environment variables required:
 *   GROQ_API_KEY   — Groq Cloud API key
 *   GROQ_MODEL     — e.g. "llama3-8b-8192" (fast, low-latency)
 */

const Groq = require("groq-sdk");
const Question = require("../models/Question");           // adjust path as needed
const InterviewSession = require("../models/InterviewSession"); // adjust path

// ─────────────────────────────────────────────
// Groq client — initialised once at module load
// ─────────────────────────────────────────────
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = process.env.GROQ_MODEL || "llama3-8b-8192";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const MIN_DIFFICULTY = 1;
const MAX_DIFFICULTY = 5;
const SCORE_THRESHOLD_UP = 7;   // score >= 7 → increase difficulty
const SCORE_THRESHOLD_DOWN = 4; // score <= 4 → decrease difficulty
const DEFAULT_TOTAL_QUESTIONS = 10;

// ─────────────────────────────────────────────
// Helper: clamp difficulty within [1, 5]
// ─────────────────────────────────────────────
const clampDifficulty = (value) =>
  Math.min(MAX_DIFFICULTY, Math.max(MIN_DIFFICULTY, value));

// ─────────────────────────────────────────────
// Helper: compute next difficulty based on score
// ─────────────────────────────────────────────
const computeNextDifficulty = (currentDifficulty, score) => {
  if (score >= SCORE_THRESHOLD_UP) {
    return clampDifficulty(currentDifficulty + 1);
  }
  if (score <= SCORE_THRESHOLD_DOWN) {
    return clampDifficulty(currentDifficulty - 1);
  }
  return currentDifficulty; // maintain current level
};

// ─────────────────────────────────────────────
// Helper: fetch a non-duplicate question for a given difficulty
// Falls back to adjacent difficulty tiers if the exact tier is exhausted.
// ─────────────────────────────────────────────
const fetchQuestion = async (difficulty, askedIds) => {
  // Primary: exact difficulty, excluding already-asked IDs
  let question = await Question.findOne({
    difficulty,
    _id: { $nin: askedIds },
  });

  if (question) return question;

  // Fallback: walk adjacent tiers (up then down) before giving up
  const fallbackOrder = [];
  for (let delta = 1; delta <= MAX_DIFFICULTY; delta++) {
    if (difficulty + delta <= MAX_DIFFICULTY) fallbackOrder.push(difficulty + delta);
    if (difficulty - delta >= MIN_DIFFICULTY) fallbackOrder.push(difficulty - delta);
  }

  for (const fallbackDiff of fallbackOrder) {
    question = await Question.findOne({
      difficulty: fallbackDiff,
      _id: { $nin: askedIds },
    });
    if (question) return question;
  }

  // Tier pool completely exhausted for this session
  return null;
};

// ─────────────────────────────────────────────
// Helper: strict Groq JSON extraction
// Sends a structured System Prompt to guarantee JSON-only output.
// Parses the payload safely and returns { score, evaluation }.
// ─────────────────────────────────────────────
const evaluateAnswerWithGroq = async (questionText, candidateAnswer) => {
  const systemPrompt = `
You are a strict technical interview evaluator. Your ONLY job is to evaluate a candidate's answer.

Rules:
1. Respond ONLY with a valid JSON object — no markdown, no code fences, no preamble.
2. The JSON must contain exactly two keys:
   - "score": an integer from 0 to 10
   - "evaluation": a 1-3 sentence constructive feedback string
3. Scoring guide:
   - 9-10: Exceptional. Complete, concise, uses correct terminology.
   - 7-8:  Good. Mostly correct with minor omissions.
   - 5-6:  Average. Partially correct but missing key concepts.
   - 3-4:  Below average. Shows basic awareness but major gaps.
   - 1-2:  Poor. Largely incorrect or irrelevant.
   - 0:    No answer, gibberish, or off-topic entirely.
4. Never deviate from the JSON format. Any other output format will cause a system error.

Example output:
{"score": 7, "evaluation": "The candidate correctly identified the concept but missed discussing time complexity trade-offs."}
`.trim();

  const userPrompt = `
Question: ${questionText}

Candidate's Answer: ${candidateAnswer}

Evaluate the answer and return only the JSON object.
`.trim();

  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.1,       // Low temperature for deterministic scoring
    max_tokens: 256,        // Score + short evaluation fits easily
    response_format: { type: "json_object" }, // Groq JSON mode (when supported)
  });

  // Extract raw text from the completion payload
  const rawText = completion?.choices?.[0]?.message?.content || "";

  // ── Safe JSON extraction ──────────────────
  // Strip potential markdown fences (``` json ... ```) in case the model
  // ignores the system prompt for JSON mode
  const cleaned = rawText
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Last-resort: attempt regex extraction of score + evaluation
    const scoreMatch = cleaned.match(/"score"\s*:\s*(\d+)/);
    const evalMatch = cleaned.match(/"evaluation"\s*:\s*"([^"]+)"/);
    if (scoreMatch && evalMatch) {
      parsed = {
        score: parseInt(scoreMatch[1], 10),
        evaluation: evalMatch[1],
      };
    } else {
      // Groq returned something completely unusable — fail gracefully
      console.error("[Groq] Unparseable response:", rawText);
      parsed = { score: 5, evaluation: "Could not parse AI evaluation. Neutral score assigned." };
    }
  }

  // Validate and sanitise the parsed values
  const score = Math.min(10, Math.max(0, parseInt(parsed.score ?? 5, 10)));
  const evaluation =
    typeof parsed.evaluation === "string" && parsed.evaluation.trim()
      ? parsed.evaluation.trim()
      : "No evaluation provided.";

  return { score, evaluation };
};

// ═════════════════════════════════════════════
// CONTROLLER: initSession
// POST /api/interview/start
// Creates a new session and returns the first question.
// ═════════════════════════════════════════════
const initSession = async (req, res) => {
  try {
    const { candidateId, totalQuestions } = req.body;

    // Validate totalQuestions if provided
    const questionCount =
      Number.isInteger(totalQuestions) && totalQuestions >= 1 && totalQuestions <= 30
        ? totalQuestions
        : DEFAULT_TOTAL_QUESTIONS;

    // Create a fresh session starting at difficulty 1
    const session = await InterviewSession.create({
      candidateId: candidateId || "anonymous",
      currentDifficulty: 1,
      totalQuestions: questionCount,
      askedQuestionIds: [],
      history: [],
      lastAnswer: null,
      status: "active",
    });

    // Fetch the first question (difficulty 1, no exclusions yet)
    const firstQuestion = await fetchQuestion(1, []);
    if (!firstQuestion) {
      // Database has no questions at all — cannot start
      await InterviewSession.findByIdAndDelete(session._id);
      return res.status(503).json({
        success: false,
        message: "No questions available in the database. Please seed question data first.",
      });
    }

    // Record the first question as asked
    session.askedQuestionIds.push(firstQuestion._id);
    await session.save();

    return res.status(201).json({
      success: true,
      message: "Interview session started.",
      data: {
        sessionId: session._id,
        currentDifficulty: session.currentDifficulty,
        questionNumber: 1,
        totalQuestions: session.totalQuestions,
        question: {
          id: firstQuestion._id,
          text: firstQuestion.text,
          topic: firstQuestion.topic,
          difficulty: firstQuestion.difficulty,
        },
      },
    });
  } catch (error) {
    console.error("[initSession] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start interview session.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ═════════════════════════════════════════════
// CONTROLLER: submitAnswer
// POST /api/interview/submit-answer
// Body: { sessionId, questionId, answer, skipped? }
//
// Handles:
//  1. Session validation & terminal-state guard
//  2. Anti-cheat: consecutive repeat answer detection
//  3. Skip path: score 0, difficulty DOWN, no Groq call
//  4. Groq evaluation for genuine answers
//  5. Adaptive difficulty adjustment (clamped 1–5)
//  6. History persistence
//  7. Session termination when all questions answered
//  8. Next question fetch with $nin anti-duplicate
// ═════════════════════════════════════════════
const submitAnswer = async (req, res) => {
  try {
    const { sessionId, questionId, answer, skipped = false } = req.body;

    // ── Input validation ───────────────────────────────────────────────
    if (!sessionId) {
      return res.status(400).json({ success: false, message: "sessionId is required." });
    }
    if (!questionId) {
      return res.status(400).json({ success: false, message: "questionId is required." });
    }
    if (!skipped && (typeof answer !== "string" || !answer.trim())) {
      return res.status(400).json({
        success: false,
        message: "An answer is required unless the question is skipped.",
      });
    }

    // ── Fetch & validate session ───────────────────────────────────────
    const session = await InterviewSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }
    if (session.status === "completed") {
      return res.status(409).json({
        success: false,
        message: "This interview session has already been completed.",
      });
    }

    // ── Fetch the question being answered ─────────────────────────────
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ success: false, message: "Question not found." });
    }

    // ── Anti-cheat: consecutive repeat detection ───────────────────────
    // Compare trimmed, lowercased strings to catch copy-paste repetition
    if (!skipped && answer.trim()) {
      const normalised = answer.trim().toLowerCase();
      const lastNormalised = session.lastAnswer?.trim().toLowerCase() ?? null;
      if (lastNormalised && normalised === lastNormalised) {
        return res.status(422).json({
          success: false,
          message:
            "Duplicate response detected. You cannot submit the same answer consecutively. Please provide a unique response.",
          code: "REPEAT_ANSWER",
        });
      }
    }

    // ── Determine score and evaluation ─────────────────────────────────
    let score = 0;
    let evaluation = "Question skipped. No points awarded.";
    let nextDifficulty;

    if (skipped) {
      // Skip path: guaranteed failure, difficulty decreases
      score = 0;
      nextDifficulty = clampDifficulty(session.currentDifficulty - 1);
    } else {
      // Standard path: call Groq API for evaluation
      const groqResult = await evaluateAnswerWithGroq(question.text, answer.trim());
      score = groqResult.score;
      evaluation = groqResult.evaluation;
      nextDifficulty = computeNextDifficulty(session.currentDifficulty, score);
    }

    // ── Build history entry ────────────────────────────────────────────
    const historyEntry = {
      questionText: question.text,
      questionId: question._id,
      answer: skipped ? null : answer.trim(),
      score,
      evaluation,
      difficultyAtTime: session.currentDifficulty, // record difficulty *before* update
      skipped,
      completedAt: new Date(),
    };

    session.history.push(historyEntry);
    session.currentDifficulty = nextDifficulty;
    if (!skipped) {
      session.lastAnswer = answer.trim(); // update repeat-check tracker
    }

    // ── Check terminal condition ───────────────────────────────────────
    const questionsAnswered = session.history.length;
    const isComplete = questionsAnswered >= session.totalQuestions;

    if (isComplete) {
      session.status = "completed";
      await session.save();

      // Build analytics summary using virtuals
      const sessionObj = session.toObject();
      const totalSkipped = session.history.filter((h) => h.skipped).length;
      const avgScore =
        session.history.reduce((sum, h) => sum + h.score, 0) / session.history.length;
      const peakDifficulty = Math.max(...session.history.map((h) => h.difficultyAtTime));

      return res.status(200).json({
        success: true,
        message: "Interview complete.",
        data: {
          sessionId: session._id,
          status: "completed",
          analytics: {
            totalQuestions: session.totalQuestions,
            questionsAnswered,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
            finalDifficulty: session.currentDifficulty,
          },
          history: session.history,
        },
      });
    }

    // ── Fetch next question ────────────────────────────────────────────
    const nextQuestion = await fetchQuestion(nextDifficulty, session.askedQuestionIds);

    if (!nextQuestion) {
      // All available questions exhausted — force-complete the session
      session.status = "completed";
      await session.save();

      const totalSkipped = session.history.filter((h) => h.skipped).length;
      const avgScore =
        session.history.reduce((sum, h) => sum + h.score, 0) / session.history.length;
      const peakDifficulty = Math.max(...session.history.map((h) => h.difficultyAtTime));

      return res.status(200).json({
        success: true,
        message: "Interview complete. No more unique questions available.",
        data: {
          sessionId: session._id,
          status: "completed",
          analytics: {
            totalQuestions: session.totalQuestions,
            questionsAnswered,
            averageScore: parseFloat(avgScore.toFixed(2)),
            peakDifficulty,
            totalSkipped,
            finalDifficulty: session.currentDifficulty,
          },
          history: session.history,
        },
      });
    }

    // Record the new question as asked
    session.askedQuestionIds.push(nextQuestion._id);
    await session.save();

    // ── Return result + next question to frontend ──────────────────────
    return res.status(200).json({
      success: true,
      message: skipped ? "Question skipped." : "Answer submitted successfully.",
      data: {
        sessionId: session._id,
        status: "active",
        // Result of the just-evaluated step
        result: {
          score,
          evaluation,
          skipped,
          previousDifficulty: historyEntry.difficultyAtTime,
          newDifficulty: nextDifficulty,
        },
        // Next question for the frontend
        question: {
          id: nextQuestion._id,
          text: nextQuestion.text,
          topic: nextQuestion.topic,
          difficulty: nextQuestion.difficulty,
        },
        progress: {
          questionNumber: questionsAnswered + 1,
          totalQuestions: session.totalQuestions,
        },
      },
    });
  } catch (error) {
    console.error("[submitAnswer] Error:", error);
    return res.status(500).json({
      success: false,
      message: "An internal error occurred while processing your answer.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// ═════════════════════════════════════════════
// CONTROLLER: getSession
// GET /api/interview/:sessionId
// Hydrates the frontend on page refresh.
// ═════════════════════════════════════════════
const getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await InterviewSession.findById(sessionId);

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found." });
    }

    // If session is active, also return the last asked question
    // so the frontend can re-render the current question on refresh
    let currentQuestion = null;
    if (session.status === "active" && session.askedQuestionIds.length) {
      const lastAskedId = session.askedQuestionIds[session.askedQuestionIds.length - 1];
      currentQuestion = await Question.findById(lastAskedId).lean();
    }

    return res.status(200).json({
      success: true,
      data: {
        sessionId: session._id,
        status: session.status,
        currentDifficulty: session.currentDifficulty,
        questionsAnswered: session.history.length,
        totalQuestions: session.totalQuestions,
        history: session.history,
        currentQuestion: currentQuestion
          ? {
              id: currentQuestion._id,
              text: currentQuestion.text,
              topic: currentQuestion.topic,
              difficulty: currentQuestion.difficulty,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("[getSession] Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve session.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { initSession, submitAnswer, getSession };
