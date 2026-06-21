/**
 * server.js — Express Application Entry Point
 * Adaptive Interview Engine
 *
 * Connects to MongoDB, mounts the interview API router,
 * and starts the HTTP server.
 */

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const interviewRoutes = require("./routes/interviewRoutes");

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("❌  MONGO_URI is not defined in .env — cannot start.");
  process.exit(1);
}

if (!process.env.GROQ_API_KEY) {
  console.warn("⚠️  GROQ_API_KEY is not set. Answer evaluation will fail at runtime.");
}

// ─────────────────────────────────────────────
// Express App
// ─────────────────────────────────────────────
const app = express();

// Middleware
app.use(cors());                          // Allow cross-origin requests (frontend ↔ backend)
app.use(express.json({ limit: "1mb" }));  // Parse JSON bodies

// Health check
app.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "Adaptive Interview Engine",
    timestamp: new Date().toISOString(),
  });
});

// Mount interview API routes
app.use("/api/interview", interviewRoutes);

// 404 catch-all
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found." });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ─────────────────────────────────────────────
// MongoDB Connection + Server Start
// ─────────────────────────────────────────────
const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB");
};

// Middleware to ensure DB connection on serverless requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌  MongoDB connection failed:", err.message);
    res.status(500).json({ success: false, message: "Database connection failed." });
  }
});

// Run server only if running locally (not in serverless environment)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀  Server running on http://localhost:${PORT}`);
        console.log(`📡  Interview API mounted at /api/interview`);
      });
    })
    .catch((err) => {
      console.error("❌  MongoDB connection failed:", err.message);
      process.exit(1);
    });
}

module.exports = app; // Export for testing

