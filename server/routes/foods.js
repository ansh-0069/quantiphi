const express = require("express");
const { getAllFoods } = require("../data/foodDatabase");

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

module.exports = router;
