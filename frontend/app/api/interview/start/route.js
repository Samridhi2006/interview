import { NextResponse } from "next/server";
import { sessions, findQuestion } from "@/app/lib/store";

/**
 * POST /api/interview/start
 * Initialize a new interview session
 */
export async function POST(request) {
  try {
    const { candidateName } = await request.json();

    if (!candidateName || candidateName.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Candidate name is required." },
        { status: 400 }
      );
    }

    // Generate a unique session ID
    const sessionId =
      "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);

    // Fetch the first Level 1 question
    const firstQuestion = findQuestion(1, []);
    if (!firstQuestion) {
      return NextResponse.json(
        { success: false, error: "No questions found in the bank." },
        { status: 404 }
      );
    }

    // Create session in memory
    const session = {
      id: sessionId,
      candidateName: candidateName.trim(),
      currentDifficulty: 1,
      questionsAsked: [firstQuestion._id],
      history: [],
      status: "active",
      maxQuestions: 10,
      createdAt: new Date().toISOString(),
    };

    sessions.set(sessionId, session);

    return NextResponse.json(
      {
        success: true,
        sessionId,
        nextQuestion: {
          id: firstQuestion._id,
          text: firstQuestion.text,
          topic: firstQuestion.topic,
          difficulty: firstQuestion.difficulty,
        },
        progress: { current: 1, total: session.maxQuestions },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Start Session Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error." },
      { status: 500 }
    );
  }
}
