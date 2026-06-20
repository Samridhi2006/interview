import { NextResponse } from "next/server";
import { sessions, findQuestion, evaluateAnswer, questions } from "@/app/lib/store";

/**
 * POST /api/interview/submit
 * Submit answer or skip a question.
 * Handles: anti-cheating, skip path, AI evaluation, difficulty adjustment,
 *          anti-duplicate question selection, session completion.
 */
export async function POST(request) {
  try {
    const { sessionId, answer, isSkipped } = await request.json();

    // ── Validate session ──
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "Session ID is required." },
        { status: 400 }
      );
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Interview session not found." },
        { status: 404 }
      );
    }

    if (session.status === "completed") {
      return NextResponse.json(
        { success: false, error: "This interview session has already completed." },
        { status: 400 }
      );
    }

    // ── Identify current question ──
    const currentQuestionIdx = session.history.length;
    if (currentQuestionIdx >= session.questionsAsked.length) {
      return NextResponse.json(
        { success: false, error: "No pending question to grade." },
        { status: 400 }
      );
    }

    const currentQuestionId = session.questionsAsked[currentQuestionIdx];
    const currentQuestion = questions.find((q) => q._id === currentQuestionId);
    if (!currentQuestion) {
      return NextResponse.json(
        { success: false, error: "Question not found." },
        { status: 404 }
      );
    }

    let score = 0;
    let feedback = "";
    const isStepSkipped = !!isSkipped;
    const trimmedAnswer = answer ? answer.trim() : "";

    // ── SKIP PATH: bypass evaluation ──
    if (isStepSkipped) {
      score = 0;
      feedback = "Question skipped by candidate.";
      session.currentDifficulty = Math.max(1, session.currentDifficulty - 1);
    } else {
      // ── ANSWER PATH ──

      // Validate non-empty
      if (!trimmedAnswer) {
        return NextResponse.json(
          { success: false, error: "Answer cannot be empty." },
          { status: 400 }
        );
      }

      // Anti-cheating: detect consecutive identical answers
      const lastEntry = session.history.length > 0
        ? session.history[session.history.length - 1]
        : null;

      if (
        lastEntry &&
        !lastEntry.isSkipped &&
        lastEntry.userResponse === trimmedAnswer
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Duplicate response detected. Please write a unique answer.",
          },
          { status: 400 }
        );
      }

      // Evaluate via AI (demo uses local scorer; production uses Groq)
      const evaluation = evaluateAnswer(
        currentQuestion.text,
        currentQuestion.sampleAnswer,
        trimmedAnswer
      );
      score = evaluation.score;
      feedback = evaluation.feedback;

      // ── Dynamic Difficulty Adjustment ──
      if (score >= 7) {
        session.currentDifficulty = Math.min(5, session.currentDifficulty + 1);
      } else if (score <= 4) {
        session.currentDifficulty = Math.max(1, session.currentDifficulty - 1);
      }
    }

    // ── Save to history ──
    session.history.push({
      question: currentQuestion._id,
      questionText: currentQuestion.text,
      topic: currentQuestion.topic,
      userResponse: isStepSkipped ? "" : trimmedAnswer,
      score,
      difficulty: currentQuestion.difficulty,
      feedback,
      isSkipped: isStepSkipped,
      timestamp: new Date().toISOString(),
    });

    // ── Check completion ──
    if (session.history.length >= session.maxQuestions) {
      session.status = "completed";
      const analytics = calculateAnalytics(session);

      return NextResponse.json({
        success: true,
        isCompleted: true,
        analytics,
      });
    }

    // ── Fetch next question (anti-duplicate via $nin equivalent) ──
    const nextQuestion = findQuestion(
      session.currentDifficulty,
      session.questionsAsked
    );

    if (!nextQuestion) {
      // No more questions available — complete early
      session.status = "completed";
      const analytics = calculateAnalytics(session);

      return NextResponse.json({
        success: true,
        isCompleted: true,
        earlyTermination: true,
        analytics,
      });
    }

    session.questionsAsked.push(nextQuestion._id);

    return NextResponse.json({
      success: true,
      isCompleted: false,
      lastScore: score,
      lastFeedback: feedback,
      wasSkipped: isStepSkipped,
      nextQuestion: {
        id: nextQuestion._id,
        text: nextQuestion.text,
        topic: nextQuestion.topic,
        difficulty: nextQuestion.difficulty,
      },
      progress: {
        current: session.history.length + 1,
        total: session.maxQuestions,
      },
    });
  } catch (error) {
    console.error("Submit Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}

/**
 * Calculate final analytics for completed session
 */
function calculateAnalytics(session) {
  const answered = session.history.filter((h) => !h.isSkipped);
  const totalScore = answered.reduce((sum, h) => sum + h.score, 0);
  const averageScore =
    answered.length > 0
      ? parseFloat((totalScore / answered.length).toFixed(1))
      : 0;
  const peakDifficulty = Math.max(
    ...session.history.map((h) => h.difficulty),
    1
  );
  const totalSkipped = session.history.filter((h) => h.isSkipped).length;
  const totalAnswered = answered.length;

  // Calculate difficulty distribution
  const difficultyDistribution = {};
  for (const h of session.history) {
    difficultyDistribution[h.difficulty] =
      (difficultyDistribution[h.difficulty] || 0) + 1;
  }

  return {
    candidateName: session.candidateName,
    averageScore,
    peakDifficulty,
    totalSkipped,
    totalAnswered,
    totalQuestions: session.history.length,
    difficultyDistribution,
    history: session.history,
    createdAt: session.createdAt,
    completedAt: new Date().toISOString(),
  };
}
