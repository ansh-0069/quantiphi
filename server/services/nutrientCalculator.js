/**
 * Nutrient Scaling Algorithm
 * ==========================
 *
 * Formula:   actual_value = (portionGrams / 100) × valuePer100g
 *
 * Example:   200g Chicken Breast
 *            calories = (200 / 100) × 165 = 330 kcal
 *            protein  = (200 / 100) × 31  = 62g
 *            carbs    = (200 / 100) × 0   = 0g
 *            fats     = (200 / 100) × 3.6 = 7.2g
 *
 * This is standard nutritional scaling — all nutrition labels
 * report values per 100g, so we linearly scale by the ratio.
 *
 * All values are rounded to 1 decimal place for display.
 */

function scaleNutrients(food, portionGrams) {
  const scale = portionGrams / 100;

  return {
    foodName: food.name,
    portionGrams,
    calories: round1(food.caloriesPer100g * scale),
    protein: round1(food.proteinPer100g * scale),
    carbs: round1(food.carbsPer100g * scale),
    fats: round1(food.fatsPer100g * scale),
  };
}

function round1(val) {
  return Math.round(val * 10) / 10;
}

module.exports = { scaleNutrients };
