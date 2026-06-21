const express = require("express");
const { getGoalProfile, getAllGoalProfiles } = require("../data/goalProfiles");
const { computeDashboard, resetExceededState } = require("../services/budgetTracker");
const { getActiveMeals } = require("../store/mealStore");

const router = express.Router();

// ─────────────────────────────────────────────
// GET /api/goal
// Returns current active goal + all profiles + dashboard.
// ─────────────────────────────────────────────
router.get("/", (req, res, next) => {
  try {
    const goalId  = req.app.locals.activeGoal;
    const profile = getGoalProfile(goalId);
    const dashboard = computeDashboard(getActiveMeals(), goalId);

    res.json({
      activeGoal: profile,
      allGoals:   getAllGoalProfiles(),
      dashboard,
    });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────
// POST /api/goal
// Switch the active fitness goal.
// Meals are NOT affected — only the target denominator changes.
// Switching to the SAME goal is a safe no-op (returns current state,
// does NOT reset the exceeded transition tracker).
// ─────────────────────────────────────────────
router.post("/", (req, res, next) => {
  try {
    const { goal } = req.body;

    // Validate presence and type
    if (!goal || typeof goal !== "string") {
      return res.status(400).json({
        error: "goal is required. Valid values: weight_loss, maintenance, muscle_gain.",
      });
    }

    const profile = getGoalProfile(goal);
    if (!profile) {
      return res.status(400).json({
        error: `Unknown goal "${goal}". Valid values: weight_loss, maintenance, muscle_gain.`,
        validGoals: getAllGoalProfiles().map((g) => g.id),
      });
    }

    const currentGoal = req.app.locals.activeGoal;

    // ── Same-goal no-op: return current dashboard without resetting state ──
    if (goal === currentGoal) {
      const dashboard = computeDashboard(getActiveMeals(), goal);
      return res.json({
        message:    `Goal "${profile.label}" is already active.`,
        activeGoal: profile,
        dashboard,
      });
    }

    // ── Different goal: switch, reset transition tracker, recalculate ──────
    req.app.locals.activeGoal = goal;

    // Reset so modal can re-fire if the existing totals immediately exceed the new target
    resetExceededState();

    const dashboard = computeDashboard(getActiveMeals(), goal);

    res.json({
      message:    `Goal switched to "${profile.label}".`,
      activeGoal: profile,
      dashboard,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
