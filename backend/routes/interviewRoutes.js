/**
 * interviewRoutes.js — Express Router
 * Mounts the three interview controller endpoints.
 *
 * IMPORTANT: The /:sessionId wildcard route MUST be registered LAST
 * to prevent it from capturing "/start" and "/submit-answer" as sessionId params.
 */

const express = require("express");
const router = express.Router();

const {
  initSession,
  submitAnswer,
  getSession,
} = require("../controllers/interviewController");

// ── Fixed routes (register first) ────────────────
router.post("/start", initSession);
router.post("/submit-answer", submitAnswer);

// ── Wildcard param route (register LAST) ─────────
router.get("/:sessionId", getSession);

module.exports = router;
