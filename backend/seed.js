/**
 * seed.js — Database Seed Script
 * Populates the "questions" collection with interview questions
 * across all five difficulty tiers.
 *
 * Usage:
 *   npm run seed          (uses .env for MONGO_URI)
 *   node seed.js          (same, manual)
 *
 * Safe to run multiple times — uses upsert on the question text
 * so existing questions are updated, not duplicated.
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Question = require("./models/Question");

// ─────────────────────────────────────────────
// Question Bank — 8 questions per difficulty tier
// ─────────────────────────────────────────────
const questions = [
  // ═══════════════════════════════════════════
  // DIFFICULTY 1 — Fundamentals
  // ═══════════════════════════════════════════
  {
    text: "What is an array, and how does it differ from a linked list?",
    difficulty: 1,
    topic: "Data Structures",
    expectedKeywords: ["contiguous memory", "index", "pointer", "node", "dynamic size"],
  },
  {
    text: "Explain the difference between == and === in JavaScript.",
    difficulty: 1,
    topic: "JavaScript",
    expectedKeywords: ["type coercion", "strict equality", "loose equality", "type checking"],
  },
  {
    text: "What is HTTP? Name at least three common HTTP methods and their purposes.",
    difficulty: 1,
    topic: "Networking",
    expectedKeywords: ["GET", "POST", "PUT", "DELETE", "stateless", "request-response"],
  },
  {
    text: "What is the difference between a stack and a queue? Give a real-world analogy for each.",
    difficulty: 1,
    topic: "Data Structures",
    expectedKeywords: ["LIFO", "FIFO", "push", "pop", "enqueue", "dequeue"],
  },
  {
    text: "What does the 'var', 'let', and 'const' keywords do in JavaScript? How are they different?",
    difficulty: 1,
    topic: "JavaScript",
    expectedKeywords: ["block scope", "function scope", "hoisting", "reassignment", "const immutable reference"],
  },
  {
    text: "What is a database? Explain the difference between SQL and NoSQL databases.",
    difficulty: 1,
    topic: "Databases",
    expectedKeywords: ["structured", "unstructured", "tables", "documents", "schema", "relational"],
  },
  {
    text: "What is an API? Explain it as if you were talking to a non-technical person.",
    difficulty: 1,
    topic: "General",
    expectedKeywords: ["interface", "communication", "request", "response", "contract"],
  },
  {
    text: "What is the purpose of version control systems like Git? Name three basic Git commands.",
    difficulty: 1,
    topic: "General",
    expectedKeywords: ["tracking changes", "collaboration", "commit", "push", "pull", "branch"],
  },

  // ═══════════════════════════════════════════
  // DIFFICULTY 2 — Applied Knowledge
  // ═══════════════════════════════════════════
  {
    text: "Explain how a hash map works internally. What happens during a collision?",
    difficulty: 2,
    topic: "Data Structures",
    expectedKeywords: ["hash function", "bucket", "chaining", "open addressing", "O(1) average"],
  },
  {
    text: "What are closures in JavaScript? Provide a practical use case.",
    difficulty: 2,
    topic: "JavaScript",
    expectedKeywords: ["lexical scope", "outer function", "enclosed variables", "data privacy", "factory"],
  },
  {
    text: "Explain the difference between TCP and UDP. When would you use each?",
    difficulty: 2,
    topic: "Networking",
    expectedKeywords: ["reliable", "connection-oriented", "connectionless", "streaming", "low latency"],
  },
  {
    text: "What is the difference between a process and a thread? How do they share memory?",
    difficulty: 2,
    topic: "Operating Systems",
    expectedKeywords: ["address space", "shared memory", "lightweight", "context switch", "concurrency"],
  },
  {
    text: "Explain the concept of promises in JavaScript. How do they improve on callback-based code?",
    difficulty: 2,
    topic: "JavaScript",
    expectedKeywords: ["pending", "resolved", "rejected", "then", "catch", "callback hell", "chaining"],
  },
  {
    text: "What is database indexing? Why does it speed up queries, and what are the trade-offs?",
    difficulty: 2,
    topic: "Databases",
    expectedKeywords: ["B-tree", "lookup speed", "write overhead", "storage cost", "query optimizer"],
  },
  {
    text: "Explain the concept of REST. What makes an API RESTful?",
    difficulty: 2,
    topic: "Networking",
    expectedKeywords: ["stateless", "resource", "HTTP verbs", "uniform interface", "representation"],
  },
  {
    text: "What is recursion? Explain with an example and discuss the risk of stack overflow.",
    difficulty: 2,
    topic: "Algorithms",
    expectedKeywords: ["base case", "recursive case", "call stack", "stack overflow", "factorial", "fibonacci"],
  },

  // ═══════════════════════════════════════════
  // DIFFICULTY 3 — Intermediate Analysis
  // ═══════════════════════════════════════════
  {
    text: "Compare and contrast BFS and DFS for graph traversal. When is each preferred?",
    difficulty: 3,
    topic: "Algorithms",
    expectedKeywords: ["breadth-first", "depth-first", "queue", "stack", "shortest path", "topological"],
  },
  {
    text: "Explain the JavaScript event loop. How do the call stack, task queue, and microtask queue interact?",
    difficulty: 3,
    topic: "JavaScript",
    expectedKeywords: ["single-threaded", "call stack", "Web APIs", "callback queue", "microtask", "Promise", "setTimeout"],
  },
  {
    text: "What is database normalization? Explain 1NF, 2NF, and 3NF with examples.",
    difficulty: 3,
    topic: "Databases",
    expectedKeywords: ["redundancy", "functional dependency", "partial dependency", "transitive dependency", "atomic"],
  },
  {
    text: "Explain the time complexity of common sorting algorithms: bubble sort, merge sort, and quicksort.",
    difficulty: 3,
    topic: "Algorithms",
    expectedKeywords: ["O(n²)", "O(n log n)", "divide and conquer", "pivot", "stable", "in-place"],
  },
  {
    text: "What is the difference between authentication and authorization? Describe how JWT tokens work.",
    difficulty: 3,
    topic: "Security",
    expectedKeywords: ["identity", "permissions", "header", "payload", "signature", "stateless", "expiry"],
  },
  {
    text: "Explain how middleware works in Express.js. What is the significance of the next() function?",
    difficulty: 3,
    topic: "JavaScript",
    expectedKeywords: ["request-response cycle", "next()", "order of execution", "error handling", "chain"],
  },
  {
    text: "What are database transactions? Explain ACID properties with a real-world example.",
    difficulty: 3,
    topic: "Databases",
    expectedKeywords: ["atomicity", "consistency", "isolation", "durability", "rollback", "commit"],
  },
  {
    text: "Explain the concept of dynamic programming. How does memoization differ from tabulation?",
    difficulty: 3,
    topic: "Algorithms",
    expectedKeywords: ["overlapping subproblems", "optimal substructure", "top-down", "bottom-up", "cache"],
  },

  // ═══════════════════════════════════════════
  // DIFFICULTY 4 — Advanced Scenarios
  // ═══════════════════════════════════════════
  {
    text: "Design a rate limiter for an API. Discuss the token bucket and sliding window algorithms, including trade-offs.",
    difficulty: 4,
    topic: "System Design",
    expectedKeywords: ["token bucket", "sliding window", "fixed window", "distributed", "Redis", "burst traffic"],
  },
  {
    text: "Explain how a B+ tree works and why databases use it over binary search trees for indexing.",
    difficulty: 4,
    topic: "Data Structures",
    expectedKeywords: ["leaf nodes linked", "high fan-out", "disk I/O", "range queries", "balanced", "O(log n)"],
  },
  {
    text: "What is the CAP theorem? Explain with examples of real-world systems that prioritize different guarantees.",
    difficulty: 4,
    topic: "System Design",
    expectedKeywords: ["consistency", "availability", "partition tolerance", "trade-off", "CP", "AP", "eventual consistency"],
  },
  {
    text: "Explain how JavaScript handles memory management and garbage collection. What causes memory leaks?",
    difficulty: 4,
    topic: "JavaScript",
    expectedKeywords: ["mark-and-sweep", "reference counting", "heap", "detached DOM", "closures", "event listeners"],
  },
  {
    text: "Design a URL shortener service. Walk through the system architecture, data model, and key algorithms.",
    difficulty: 4,
    topic: "System Design",
    expectedKeywords: ["base62", "hash collision", "301 redirect", "analytics", "cache", "horizontal scaling"],
  },
  {
    text: "Explain the Raft consensus algorithm. How does it handle leader election and log replication?",
    difficulty: 4,
    topic: "Distributed Systems",
    expectedKeywords: ["leader", "follower", "candidate", "term", "heartbeat", "log replication", "majority"],
  },
  {
    text: "What is the difference between optimistic and pessimistic concurrency control? When would you choose each?",
    difficulty: 4,
    topic: "Databases",
    expectedKeywords: ["locking", "versioning", "conflict detection", "rollback", "contention", "throughput"],
  },
  {
    text: "Explain how prototypal inheritance works in JavaScript. How does it differ from classical inheritance?",
    difficulty: 4,
    topic: "JavaScript",
    expectedKeywords: ["prototype chain", "__proto__", "Object.create", "delegation", "constructor", "class sugar"],
  },

  // ═══════════════════════════════════════════
  // DIFFICULTY 5 — Expert Deep-Dives
  // ═══════════════════════════════════════════
  {
    text: "Design a distributed message queue like Kafka. Discuss partitioning, consumer groups, offset management, and exactly-once semantics.",
    difficulty: 5,
    topic: "System Design",
    expectedKeywords: ["partition", "consumer group", "offset", "replication", "exactly-once", "at-least-once", "ISR"],
  },
  {
    text: "Explain the internal workings of a database query optimizer. How does it choose between a sequential scan and an index scan?",
    difficulty: 5,
    topic: "Databases",
    expectedKeywords: ["cost model", "selectivity", "statistics", "execution plan", "join ordering", "cardinality"],
  },
  {
    text: "Explain CRDTs (Conflict-free Replicated Data Types). How do they enable eventual consistency without coordination?",
    difficulty: 5,
    topic: "Distributed Systems",
    expectedKeywords: ["commutative", "associative", "idempotent", "G-Counter", "LWW-Register", "merge function"],
  },
  {
    text: "Design a real-time collaborative editing system like Google Docs. Compare OT (Operational Transform) vs CRDT approaches.",
    difficulty: 5,
    topic: "System Design",
    expectedKeywords: ["operational transform", "CRDT", "cursor position", "conflict resolution", "causal ordering", "vector clock"],
  },
  {
    text: "Explain how V8 compiles and optimizes JavaScript. Discuss the roles of Ignition, TurboFan, and hidden classes.",
    difficulty: 5,
    topic: "JavaScript",
    expectedKeywords: ["bytecode", "JIT", "Ignition", "TurboFan", "hidden classes", "inline caching", "deoptimization"],
  },
  {
    text: "Describe the Paxos consensus protocol. How does it differ from Raft, and what are its failure modes?",
    difficulty: 5,
    topic: "Distributed Systems",
    expectedKeywords: ["proposer", "acceptor", "learner", "quorum", "prepare", "accept", "livelock"],
  },
  {
    text: "Design a global-scale database like Google Spanner. How does it achieve external consistency using TrueTime?",
    difficulty: 5,
    topic: "System Design",
    expectedKeywords: ["TrueTime", "Paxos", "external consistency", "GPS", "atomic clocks", "commit wait", "read-only transactions"],
  },
  {
    text: "Explain the Linux kernel's process scheduler (CFS). How does it balance fairness, throughput, and latency?",
    difficulty: 5,
    topic: "Operating Systems",
    expectedKeywords: ["red-black tree", "vruntime", "nice value", "time slice", "preemption", "O(log n)", "fairness"],
  },
];

// ─────────────────────────────────────────────
// Seed Runner
// ─────────────────────────────────────────────
async function seed() {
  const MONGO_URI = process.env.MONGO_URI;

  if (!MONGO_URI) {
    console.error("❌  MONGO_URI is not defined in .env — cannot seed.");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅  Connected to MongoDB");

    let created = 0;
    let updated = 0;

    for (const q of questions) {
      const result = await Question.findOneAndUpdate(
        { text: q.text },           // Match on question text (unique)
        { $set: q },                 // Upsert the full document
        { upsert: true, new: true, rawResult: true }
      );

      if (result.lastErrorObject?.updatedExisting) {
        updated++;
      } else {
        created++;
      }
    }

    console.log(`\n🌱  Seed complete!`);
    console.log(`   📝  ${created} questions created`);
    console.log(`   🔄  ${updated} questions updated`);
    console.log(`   📊  Total in DB: ${await Question.countDocuments()}`);

    // Print distribution
    console.log(`\n   Difficulty distribution:`);
    for (let d = 1; d <= 5; d++) {
      const count = await Question.countDocuments({ difficulty: d });
      const bar = "█".repeat(count) + "░".repeat(8 - count);
      console.log(`   L${d}  ${bar}  ${count} questions`);
    }

    console.log("");
  } catch (err) {
    console.error("❌  Seed failed:", err.message);
  } finally {
    await mongoose.disconnect();
    console.log("🔌  Disconnected from MongoDB");
  }
}

seed();
