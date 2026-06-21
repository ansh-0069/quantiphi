/**
 * Budget Tracker Service
 *
 * Aggregates all ACTIVE (non-pending-deletion) meals, computes totals,
 * calculates percentages against the current goal, and returns status.
 *
 * Rules:
 *  - exceeded = consumed.calories > targets.calories  (strict >)
 *  - justExceeded fires ONLY on the false→true transition
 *  - barWidths are capped at 100 for CSS rendering
 *  - dashboard.meals contains only active meals (pendingDeletion excluded)
 */

const { getGoalProfile } = require("../data/goalProfiles");
const { recordDailyTotal } = require("../store/historyStore");

// Module-level flag tracking the last exceeded state for transition detection
let previouslyExceeded = false;

/**
 * @param {object[]} activeMeals - meals with pendingDeletion === false
 * @param {string}   goalId
 */
function computeDashboard(activeMeals, goalId) {
  const goal = getGoalProfile(goalId);
  if (!goal) {
    throw new Error(`Unknown goal: "${goalId}"`);
  }

  // ── Aggregate totals from active meals only ───────────────────────────────
  const consumed = { calories: 0, protein: 0, carbs: 0, fats: 0 };

  for (const meal of activeMeals) {
    consumed.calories += meal.calories;
    consumed.protein  += meal.protein;
    consumed.carbs    += meal.carbs;
    consumed.fats     += meal.fats;
  }

  consumed.calories = round1(consumed.calories);
  consumed.protein  = round1(consumed.protein);
  consumed.carbs    = round1(consumed.carbs);
  consumed.fats     = round1(consumed.fats);

  // ── Targets from the goal profile ────────────────────────────────────────
  const targets = {
    calories: goal.calories,
    protein:  goal.protein,
    carbs:    goal.carbs,
    fats:     goal.fats,
  };

  // ── Raw percentages (can exceed 100%) ────────────────────────────────────
  const percentages = {
    calories: round1((consumed.calories / targets.calories) * 100),
    protein:  round1((consumed.protein  / targets.protein)  * 100),
    carbs:    round1((consumed.carbs    / targets.carbs)    * 100),
    fats:     round1((consumed.fats     / targets.fats)     * 100),
  };

  // ── Bar widths capped at 100% for CSS ────────────────────────────────────
  const barWidths = {
    calories: Math.min(percentages.calories, 100),
    protein:  Math.min(percentages.protein,  100),
    carbs:    Math.min(percentages.carbs,    100),
    fats:     Math.min(percentages.fats,     100),
  };

  // ── Status: only calories drive the exceeded flag ─────────────────────────
  const exceeded = consumed.calories > targets.calories;
  const status   = exceeded ? "exceeded" : "ok";

  // ── Modal trigger: only on false→true transition ─────────────────────────
  const justExceeded  = exceeded && !previouslyExceeded;
  previouslyExceeded  = exceeded;

  // Record today's calories snapshot (overwrite same-day value if called multiple times)
  try {
    const today = new Date().toISOString().slice(0, 10);
    recordDailyTotal(today, consumed.calories);
  } catch (err) {
    // non-fatal — history is an in-memory convenience for the prototype
    console.error('Failed to record daily total:', err?.message ?? err);
  }

  // ── Macro warning indicators (if individual macro exceeds its target) ─────
  const macroWarnings = {
    protein: consumed.protein > targets.protein,
    carbs:   consumed.carbs > targets.carbs,
    fats:    consumed.fats > targets.fats,
  };

  return {
    goal:        { id: goal.id, label: goal.label },
    targets,
    consumed,
    percentages,
    barWidths,
    status,
    justExceeded,
    macroWarnings,
    meals: activeMeals,   // only active meals sent to frontend
  };
}

function resetExceededState() {
  previouslyExceeded = false;
}

function round1(val) {
  return Math.round(val * 10) / 10;
}

module.exports = { computeDashboard, resetExceededState };
