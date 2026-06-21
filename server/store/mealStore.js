const { v4: uuidv4 } = require("uuid");

/**
 * In-memory meal store.
 *
 * Meals have a `pendingDeletion` flag for the undo grace period.
 * The dashboard excludes pending-deletion meals so bars update instantly.
 *
 * Lifecycle:
 *   addMeal()        → active meal (pendingDeletion: false)
 *   softDeleteMeal() → pendingDeletion: true  (undo window open)
 *   restoreMeal()    → pendingDeletion: false  (undo clicked)
 *   purgeMeal()      → removed permanently  (grace period expired)
 */

/** @type {Map<string, object>} id → meal object */
const mealsById = new Map();

/** All active (non-deleted) meals for dashboard computation */
function getActiveMeals() {
  return [...mealsById.values()].filter((m) => !m.pendingDeletion);
}

/** All meals including pending-deletion ones (for history display) */
function getAllMeals() {
  return [...mealsById.values()];
}

function addMeal(mealData) {
  const meal = {
    id:              uuidv4(),
    foodName:        mealData.foodName,
    portionGrams:    mealData.portionGrams,
    calories:        mealData.calories,
    protein:         mealData.protein,
    carbs:           mealData.carbs,
    fats:            mealData.fats,
    loggedAt:        new Date().toISOString(),
    pendingDeletion: false,
  };
  mealsById.set(meal.id, meal);
  return meal;
}

/**
 * Soft-delete: mark as pendingDeletion so the dashboard excludes it
 * but it can still be restored during the undo window.
 * Returns the meal, or null if not found.
 */
function softDeleteMeal(id) {
  const meal = mealsById.get(id);
  if (!meal) return null;
  meal.pendingDeletion = true;
  return meal;
}

/**
 * Restore: clear the pendingDeletion flag (undo clicked).
 * Returns the restored meal, or null if not found.
 */
function restoreMeal(id) {
  const meal = mealsById.get(id);
  if (!meal) return null;
  meal.pendingDeletion = false;
  return meal;
}

/**
 * Purge: permanently remove from the store (grace period expired).
 * Returns the removed meal, or null if not found.
 */
function purgeMeal(id) {
  const meal = mealsById.get(id);
  if (!meal) return null;
  mealsById.delete(id);
  return meal;
}

module.exports = { getActiveMeals, getAllMeals, addMeal, softDeleteMeal, restoreMeal, purgeMeal };
