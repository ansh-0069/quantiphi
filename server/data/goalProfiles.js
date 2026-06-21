/**
 * Fitness Goal Profiles — daily calorie & macro targets.
 *
 * These targets are server-side constants. When the user switches goals,
 * the backend recalculates all percentages and the exceeded flag against
 * the new targets — without wiping logged meals.
 */

const GOAL_PROFILES = {
  weight_loss: {
    id: "weight_loss",
    label: "Weight Loss",
    calories: 1800,
    protein: 120,
    carbs: 180,
    fats: 50,
  },
  maintenance: {
    id: "maintenance",
    label: "Maintenance",
    calories: 2200,
    protein: 130,
    carbs: 250,
    fats: 70,
  },
  muscle_gain: {
    id: "muscle_gain",
    label: "Muscle Gain",
    calories: 2800,
    protein: 180,
    carbs: 320,
    fats: 80,
  },
};

const DEFAULT_GOAL = "maintenance";

function getGoalProfile(goalId) {
  return GOAL_PROFILES[goalId] || null;
}

function getAllGoalProfiles() {
  return Object.values(GOAL_PROFILES);
}

module.exports = { GOAL_PROFILES, DEFAULT_GOAL, getGoalProfile, getAllGoalProfiles };
