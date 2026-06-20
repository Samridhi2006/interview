/**
 * test-session.js
 * Interactive Terminal Test Client for the Adaptive Interview Engine.
 *
 * Runs a simulated interview session in your console, calling
 * the live backend endpoints on localhost:5000 and evaluating answers
 * using your Groq API key.
 *
 * Usage:
 *   node test-session.js
 */

const http = require("http");

const API_URL = "http://localhost:5000/api/interview";

// Helper: Make HTTP POST request
const post = (path, body) => {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = http.request(
      `http://localhost:5000/api/interview${path}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error("Failed to parse JSON response: " + data));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSimulation() {
  console.log("\n=======================================================");
  console.log("🎮  ADAPTIVE INTERVIEW SIMULATOR (CLI CLIENT)");
  console.log("=======================================================\n");

  try {
    // 1. Start Session
    console.log("⏳  Initializing session on backend...");
    const startRes = await post("/start", {
      candidateId: "terminal-tester",
      totalQuestions: 3, // Keep it short for testing
    });

    if (!startRes.success) {
      throw new Error(startRes.message || "Failed to start session.");
    }

    const { sessionId, question, totalQuestions } = startRes.data;
    console.log("✅  Session Created!");
    console.log(`    Session ID: ${sessionId}`);
    console.log(`    Total Questions: ${totalQuestions}\n`);

    let currentQuestion = question;
    let questionNumber = 1;

    // Sample mock answers for testing L1 -> Adaptive adjustment
    const mockAnswers = [
      "An array is stored in contiguous memory blocks and has a fixed size, so we can access elements in O(1) time using an index. A linked list consists of nodes pointing to each other, so it can change size dynamically, but finding an element requires traversing from the head node, which takes O(n) time.",
      "A hash map works by mapping keys to indices in an array using a hash function. When a collision occurs (two keys hashing to the same index), it resolves it using chaining (creating a linked list or tree at that index) or open addressing (searching for the next free bucket).",
      "I don't know the answer to this question, sorry.",
    ];

    while (currentQuestion) {
      console.log(`-------------------------------------------------------`);
      console.log(`❓  QUESTION ${questionNumber} of ${totalQuestions} [Topic: ${currentQuestion.topic}] [Difficulty: L${currentQuestion.difficulty}]`);
      console.log(`    "${currentQuestion.text}"`);
      console.log(`-------------------------------------------------------`);

      // Pick a mock answer
      const answer = mockAnswers[questionNumber - 1] || "Default fallback response for testing.";
      console.log(`✍️   Submitting Answer: "${answer}"\n`);
      console.log("⏳  AI Evaluator (Groq LLM) is scoring your answer...");

      const submitRes = await post("/submit-answer", {
        sessionId,
        questionId: currentQuestion.id,
        answer,
        skipped: false,
      });

      if (!submitRes.success) {
        throw new Error(submitRes.message || "Failed to submit answer.");
      }

      const { status, result, question: nextQuestion, progress, analytics, history: sessionHistory } = submitRes.data;

      // Print Evaluation Result
      const evalScore = result ? result.score : sessionHistory[sessionHistory.length - 1].score;
      const evalText = result ? result.evaluation : sessionHistory[sessionHistory.length - 1].evaluation;
      const prevDiff = result ? result.previousDifficulty : sessionHistory[sessionHistory.length - 1].difficultyAtTime;
      const nextDiff = result ? result.newDifficulty : analytics.finalDifficulty;

      console.log(`\n⭐  AI SCORE: ${evalScore}/10`);
      console.log(`📝  EVALUATION: "${evalText}"`);
      console.log(`📈  DIFFICULTY CHANGE: L${prevDiff} ➔ L${nextDiff}\n`);

      if (status === "completed") {
        console.log("=======================================================");
        console.log("🏆  INTERVIEW COMPLETED SUCCESSFULLY!");
        console.log("=======================================================");
        console.log(`📊  Average Score:   ${analytics.averageScore}/10`);
        console.log(`📈  Peak Difficulty: L${analytics.peakDifficulty}`);
        console.log(`🔀  Final Level:     L${analytics.finalDifficulty}`);
        console.log(`❌  Skipped count:   ${analytics.totalSkipped}`);
        console.log("=======================================================\n");
        break;
      }

      currentQuestion = nextQuestion;
      questionNumber = progress.questionNumber;
      await delay(2000); // 2 second delay to simulate user pacing
    }
  } catch (error) {
    console.error("\n❌  Simulation error:", error.message);
    console.log("Please check if your backend server is running on http://localhost:5000.\n");
  }
}

runSimulation();
