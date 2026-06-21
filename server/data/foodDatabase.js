/**
 * Food nutritional database — values per 100g.
 * Source baseline for the nutrient scaling algorithm.
 *
 * Scaling formula:
 *   actual = (portionGrams / 100) × valuePer100g
 */

const FOOD_DATABASE = [
  { id: "chicken_breast",  name: "Chicken Breast",       caloriesPer100g: 165, proteinPer100g: 31.0, carbsPer100g:  0.0, fatsPer100g:  3.6 },
  { id: "brown_rice",      name: "Brown Rice",            caloriesPer100g: 112, proteinPer100g:  2.3, carbsPer100g: 24.0, fatsPer100g:  0.8 },
  { id: "broccoli",        name: "Broccoli",              caloriesPer100g:  34, proteinPer100g:  2.8, carbsPer100g:  7.0, fatsPer100g:  0.4 },
  { id: "salmon",          name: "Salmon",                caloriesPer100g: 208, proteinPer100g: 20.0, carbsPer100g:  0.0, fatsPer100g: 13.0 },
  { id: "grilled_salmon",  name: "Grilled Salmon",        caloriesPer100g: 195, proteinPer100g: 22.0, carbsPer100g:  0.0, fatsPer100g: 11.0 },
  { id: "egg",             name: "Egg",                   caloriesPer100g: 155, proteinPer100g: 13.0, carbsPer100g:  1.1, fatsPer100g: 11.0 },
  { id: "banana",          name: "Banana",                caloriesPer100g:  89, proteinPer100g:  1.1, carbsPer100g: 23.0, fatsPer100g:  0.3 },
  { id: "oats",            name: "Oats",                  caloriesPer100g: 389, proteinPer100g: 16.9, carbsPer100g: 66.0, fatsPer100g:  6.9 },
  { id: "greek_yogurt",    name: "Greek Yogurt",          caloriesPer100g:  59, proteinPer100g: 10.0, carbsPer100g:  3.6, fatsPer100g:  0.7 },
  { id: "sweet_potato",    name: "Sweet Potato",          caloriesPer100g:  86, proteinPer100g:  1.6, carbsPer100g: 20.0, fatsPer100g:  0.1 },
  { id: "almonds",         name: "Almonds",               caloriesPer100g: 579, proteinPer100g: 21.0, carbsPer100g: 22.0, fatsPer100g: 49.0 },
  { id: "avocado",         name: "Avocado",               caloriesPer100g: 160, proteinPer100g:  2.0, carbsPer100g:  9.0, fatsPer100g: 15.0 },
  { id: "white_rice",      name: "White Rice",            caloriesPer100g: 130, proteinPer100g:  2.7, carbsPer100g: 28.0, fatsPer100g:  0.3 },
  { id: "pasta",           name: "Pasta",                 caloriesPer100g: 131, proteinPer100g:  5.0, carbsPer100g: 25.0, fatsPer100g:  1.1 },
  { id: "tofu",            name: "Tofu",                  caloriesPer100g:  76, proteinPer100g:  8.0, carbsPer100g:  1.9, fatsPer100g:  4.8 },
  { id: "peanut_butter",   name: "Peanut Butter",         caloriesPer100g: 588, proteinPer100g: 25.0, carbsPer100g: 20.0, fatsPer100g: 50.0 },
  { id: "milk",            name: "Milk (Whole)",          caloriesPer100g:  61, proteinPer100g:  3.2, carbsPer100g:  4.8, fatsPer100g:  3.3 },
  { id: "apple",           name: "Apple",                 caloriesPer100g:  52, proteinPer100g:  0.3, carbsPer100g: 14.0, fatsPer100g:  0.2 },
  { id: "paneer",          name: "Paneer",                caloriesPer100g: 265, proteinPer100g: 18.3, carbsPer100g:  1.2, fatsPer100g: 20.8 },
  { id: "chapati",         name: "Chapati",               caloriesPer100g: 297, proteinPer100g:  9.0, carbsPer100g: 50.0, fatsPer100g:  7.5 },
  { id: "dal",             name: "Dal (Cooked Lentils)",  caloriesPer100g: 116, proteinPer100g:  9.0, carbsPer100g: 20.0, fatsPer100g:  0.4 },
];

function slugifyFoodName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "custom_food";
}

/**
 * Generic fallback nutrient profile for unknown foods.
 * Used when a food name is not found in the database.
 * Represents a typical mixed-food estimate per 100g.
 */
const FALLBACK_NUTRIENTS = {
  caloriesPer100g: 100,
  proteinPer100g:  3,
  carbsPer100g:   20,
  fatsPer100g:     2,
};

/**
 * Mock food for the simulated "Image Upload" / AI scanner.
 * Must be a name that EXISTS in FOOD_DATABASE so it gets real nutrition,
 * not the fallback. "Grilled Salmon" is now a first-class DB entry.
 */
const MOCK_SCANNED_FOOD = {
  foodName:     "Grilled Salmon",
  portionGrams: 150,
};

/**
 * Find a food by display name or id — case-insensitive, trimmed.
 * Returns null if not found (caller decides whether to fallback).
 */
function findFood(name) {
  const lower = name.toLowerCase().trim();
  return FOOD_DATABASE.find(
    (f) => f.name.toLowerCase() === lower || f.id === lower
  ) || null;
}

function getAllFoods() {
  return FOOD_DATABASE.map(({ id, name, caloriesPer100g, proteinPer100g, carbsPer100g, fatsPer100g }) => ({
    id, name, caloriesPer100g, proteinPer100g, carbsPer100g, fatsPer100g,
  }));
}

function addFood(food) {
  const name = String(food.name || "").trim();
  if (!name) {
    throw new Error("Food name is required.");
  }

  const baseId = slugifyFoodName(name);
  let id = baseId;
  let suffix = 2;
  while (FOOD_DATABASE.some((item) => item.id === id)) {
    id = `${baseId}_${suffix}`;
    suffix += 1;
  }

  const nextFood = {
    id,
    name,
    caloriesPer100g: Number(food.caloriesPer100g),
    proteinPer100g: Number(food.proteinPer100g),
    carbsPer100g: Number(food.carbsPer100g),
    fatsPer100g: Number(food.fatsPer100g),
  };

  FOOD_DATABASE.unshift(nextFood);
  return nextFood;
}

module.exports = { FOOD_DATABASE, FALLBACK_NUTRIENTS, MOCK_SCANNED_FOOD, findFood, getAllFoods, addFood };
