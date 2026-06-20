/**
 * In-Memory Data Store for Demo
 * 
 * This replaces MongoDB for the demo. In production, swap this
 * with Mongoose calls to MongoDB as shown in the models/ directory.
 */

// ===== Question Bank (15 questions, 3 per difficulty level 1-5) =====
const questions = [
  // ── Level 1: Fundamentals ──
  {
    _id: "q1",
    text: "What is the difference between 'let', 'const', and 'var' in JavaScript?",
    difficulty: 1,
    topic: "JavaScript Basics",
    sampleAnswer:
      "'var' is function-scoped, can be redeclared, and is hoisted. 'let' and 'const' are block-scoped. 'const' cannot be reassigned after declaration, whereas 'let' can be.",
  },
  {
    _id: "q2",
    text: "What is a semantic HTML element? Give two examples.",
    difficulty: 1,
    topic: "HTML Basics",
    sampleAnswer:
      "Semantic elements clearly describe their meaning to both the browser and the developer. Examples include <article>, <section>, <header>, <footer>, and <nav>.",
  },
  {
    _id: "q3",
    text: "Explain the CSS Box Model.",
    difficulty: 1,
    topic: "CSS Basics",
    sampleAnswer:
      "The CSS Box Model is a container that wraps around HTML elements. It consists of: content, padding, border, and margin (from inside out).",
  },

  // ── Level 2: Applied Basics ──
  {
    _id: "q4",
    text: "What are the primary differences between SQL and NoSQL databases?",
    difficulty: 2,
    topic: "Databases",
    sampleAnswer:
      "SQL databases are relational, table-based, structured, and use SQL query language. NoSQL databases are non-relational, document/key-value/graph-based, dynamic schemas, and scale horizontally.",
  },
  {
    _id: "q5",
    text: "Explain the concept of 'State' in React and how it differs from 'Props'.",
    difficulty: 2,
    topic: "React.js",
    sampleAnswer:
      "State represents mutable data that is managed internally within a component and can trigger re-renders. Props are immutable parameters passed down from a parent component.",
  },
  {
    _id: "q6",
    text: "What is the purpose of CORS (Cross-Origin Resource Sharing)?",
    difficulty: 2,
    topic: "Web Security",
    sampleAnswer:
      "CORS is a security mechanism enforced by browsers that uses HTTP headers to allow or restrict resources requested from a different origin (domain, protocol, or port).",
  },

  // ── Level 3: Core Engineering ──
  {
    _id: "q7",
    text: "What are Promise.all and Promise.allSettled? Explain when to use each.",
    difficulty: 3,
    topic: "Async JavaScript",
    sampleAnswer:
      "Promise.all rejects immediately if any promise fails. Use it when all operations are dependent. Promise.allSettled waits for all promises to resolve or reject and returns statuses. Use it when outcomes are independent.",
  },
  {
    _id: "q8",
    text: "Explain how indices speed up read operations in MongoDB, and the trade-off they introduce.",
    difficulty: 3,
    topic: "Database Optimization",
    sampleAnswer:
      "Indices create a data structure (B-tree) that allows fast lookups instead of scanning the entire collection. The trade-off is write performance overhead and increased memory/disk usage.",
  },
  {
    _id: "q9",
    text: "What is middleware in Express.js? Give an example of how you would use it.",
    difficulty: 3,
    topic: "Backend Node.js",
    sampleAnswer:
      "Middleware is functions that execute during the lifecycle of a request to the server. They have access to request (req) and response (res) objects, and can modify them or terminate the request.",
  },

  // ── Level 4: Architecture & Design ──
  {
    _id: "q10",
    text: "Explain the difference between JWT and Session-Based authentication. When would you use each?",
    difficulty: 4,
    topic: "System Design",
    sampleAnswer:
      "Session auth is stateful; sessions are stored in database/Redis, and a session ID cookie is sent. JWT is stateless; user details are signed into a token stored on the client and verified cryptographically by the server.",
  },
  {
    _id: "q11",
    text: "What is 'Debounce' and 'Throttle' in JavaScript? Compare their use cases.",
    difficulty: 4,
    topic: "Performance",
    sampleAnswer:
      "Debounce delays execution until a certain amount of time has elapsed since the last trigger (e.g. search input auto-complete). Throttle limits execution to once in a time window (e.g. window scrolling).",
  },
  {
    _id: "q12",
    text: "How would you design a caching strategy using Redis for a slow, expensive SQL query?",
    difficulty: 4,
    topic: "Caching",
    sampleAnswer:
      "I would use a Cache-Aside pattern. On request, check Redis for the key. If cache hit, return it. If cache miss, run the SQL query, store results in Redis with a reasonable TTL, and return the data.",
  },

  // ── Level 5: Advanced Engineering ──
  {
    _id: "q13",
    text: "Explain React's Concurrent Mode, Server Components, and the hydration process.",
    difficulty: 5,
    topic: "React Architecture",
    sampleAnswer:
      "Concurrent Mode allows React to interrupt renders to handle high-priority user inputs. Server Components render on the server, sending JSON/HTML to client. Hydration attaches event listeners to pre-rendered HTML on the client.",
  },
  {
    _id: "q14",
    text: "How do you scale a WebSocket-based real-time chat application to support millions of concurrent connections?",
    difficulty: 5,
    topic: "Scaling",
    sampleAnswer:
      "I would deploy multiple server nodes behind a load balancer with WebSocket upgrade support. To sync messages between different nodes, I would use a Redis Pub/Sub backplane. User states/rooms would be stored in Redis.",
  },
  {
    _id: "q15",
    text: "Explain the differences between Optimistic Locking and Pessimistic Locking. When would you use each?",
    difficulty: 5,
    topic: "Distributed Systems",
    sampleAnswer:
      "Pessimistic locking locks the resource immediately, preventing any access until the transaction completes. Optimistic locking assumes no conflicts, verifying changes via version checks on write. Pessimistic is best for high contention, Optimistic for low contention.",
  },
];

// ===== In-Memory Session Store =====
const sessions = new Map();

/**
 * Find a question by difficulty that hasn't been asked yet in this session.
 * Implements the $nin anti-duplicate filter logic.
 */
function findQuestion(difficulty, excludeIds) {
  // Primary: find a question at the exact difficulty
  let q = questions.find(
    (q) => q.difficulty === difficulty && !excludeIds.includes(q._id)
  );
  if (q) return q;

  // Fallback: find closest available difficulty
  const available = questions
    .filter((q) => !excludeIds.includes(q._id))
    .sort(
      (a, b) =>
        Math.abs(a.difficulty - difficulty) -
        Math.abs(b.difficulty - difficulty)
    );
  return available.length > 0 ? available[0] : null;
}

/**
 * Simple AI evaluation simulator for demo.
 * In production, this calls Groq API.
 */
function evaluateAnswer(questionText, sampleAnswer, userResponse) {
  const response = userResponse.toLowerCase().trim();
  const sample = sampleAnswer.toLowerCase();

  // Extract key terms from sample answer
  const keyTerms = sample
    .split(/[\s,.;:!?]+/)
    .filter((w) => w.length > 4)
    .map((w) => w.replace(/[^a-z]/g, ""));
  const uniqueTerms = [...new Set(keyTerms)];

  // Count how many key terms appear in the response
  let matches = 0;
  for (const term of uniqueTerms) {
    if (response.includes(term)) matches++;
  }

  const ratio = uniqueTerms.length > 0 ? matches / uniqueTerms.length : 0;

  // Length bonus (longer, more detailed answers score higher)
  const lengthBonus = Math.min(response.split(/\s+/).length / 40, 1) * 1.5;

  let score = Math.round(Math.min(10, ratio * 8 + lengthBonus + 1));
  score = Math.max(0, Math.min(10, score));

  let feedback;
  if (score >= 8) {
    feedback =
      "Excellent response! You demonstrated strong understanding of the core concepts and provided thorough detail.";
  } else if (score >= 6) {
    feedback =
      "Good answer. You covered the main points but could improve by adding more specific technical details and examples.";
  } else if (score >= 4) {
    feedback =
      "Partial understanding shown. Try to address all key aspects of the question and use precise terminology.";
  } else {
    feedback =
      "The response needs significant improvement. Review the fundamental concepts and try to provide a more structured, complete answer.";
  }

  return { score, feedback };
}

module.exports = { questions, sessions, findQuestion, evaluateAnswer };
