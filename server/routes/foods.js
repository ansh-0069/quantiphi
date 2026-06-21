const express = require("express");
const { getAllFoods, addFood } = require("../data/foodDatabase");

const router = express.Router();

/**
 * GET /api/foods
 * Returns food items for autocomplete.
 *
 * Query params:
 *   ?search=query  — case-insensitive partial match on food name (preferred)
 *   ?q=query       — legacy alias, same behaviour
 *
 * No query → returns all 21 foods.
 * Matches against both display name and id, sorted by relevance:
 *   starts-with matches first, then contains matches.
 */
router.get("/", (req, res) => {
  try {
    const raw = req.query.search ?? req.query.q ?? "";
    const query = typeof raw === "string" ? raw.trim().toLowerCase() : "";

    const allFoods = getAllFoods();

    if (!query) {
      return res.json(allFoods);
    }

    // Two-tier sort: exact-prefix matches float to top
    const startsWith = [];
    const contains   = [];

    for (const food of allFoods) {
      const name = food.name.toLowerCase();
      const id   = food.id.toLowerCase();
      if (name.startsWith(query) || id.startsWith(query)) {
        startsWith.push(food);
      } else if (name.includes(query) || id.includes(query)) {
        contains.push(food);
      }
    }

    res.json([...startsWith, ...contains]);

  } catch (err) {
    // Shouldn't happen with a static array, but be safe
    res.status(500).json({ error: "Failed to fetch food database." });
  }
});

/**
 * POST /api/foods
 * Add a custom food to the in-memory database.
 */
router.post("/", (req, res) => {
  try {
    const { name, caloriesPer100g, proteinPer100g, carbsPer100g, fatsPer100g } = req.body || {};
    const trimmedName = typeof name === "string" ? name.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({ error: "name is required." });
    }

    const numericFields = { caloriesPer100g, proteinPer100g, carbsPer100g, fatsPer100g };
    for (const [field, value] of Object.entries(numericFields)) {
      if (value === undefined || value === null || value === "") {
        return res.status(400).json({ error: `${field} is required.` });
      }
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
        return res.status(400).json({ error: `${field} must be a non-negative finite number.` });
      }
    }

    const created = addFood({ name: trimmedName, caloriesPer100g, proteinPer100g, carbsPer100g, fatsPer100g });
    res.status(201).json({ food: created });
  } catch (err) {
    res.status(500).json({ error: "Failed to add food." });
  }
});

module.exports = router;
