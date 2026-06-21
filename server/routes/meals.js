const express = require("express");
const multer = require("multer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { findFood, FALLBACK_NUTRIENTS, MOCK_SCANNED_FOOD } = require("../data/foodDatabase");
const { scaleNutrients }    = require("../services/nutrientCalculator");
const { computeDashboard }  = require("../services/budgetTracker");
const {
  getActiveMeals,
  addMeal,
  softDeleteMeal,
  restoreMeal,
  purgeMeal,
} = require("../store/mealStore");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─────────────────────────────────────────────────────────────────
// GET /api/meals
// Returns active meals + computed dashboard.
// ─────────────────────────────────────────────────────────────────
router.get("/", (req, res, next) => {
  try {
    const dashboard = computeDashboard(getActiveMeals(), req.app.locals.activeGoal);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/meals
// Log a food item (manual or mock scan).
// Both paths go through scaleNutrients() — no hardcoded shortcuts.
// ─────────────────────────────────────────────────────────────────
router.post("/", (req, res, next) => {
  try {
    let foodName, portionGrams;

    if (req.body.scanned === true) {
      foodName     = MOCK_SCANNED_FOOD.foodName;
      portionGrams = MOCK_SCANNED_FOOD.portionGrams;
    } else {
      foodName     = req.body.foodName;
      portionGrams = req.body.portionGrams;
    }

    // ── Validation ────────────────────────────────────────────────
    if (foodName === undefined || foodName === null) {
      return res.status(400).json({ error: "foodName is required." });
    }
    if (typeof foodName !== "string" || !foodName.trim()) {
      return res.status(400).json({ error: "foodName must be a non-empty string." });
    }
    if (portionGrams === undefined || portionGrams === null) {
      return res.status(400).json({ error: "portionGrams is required." });
    }
    if (typeof portionGrams !== "number" || !Number.isFinite(portionGrams)) {
      return res.status(400).json({ error: "portionGrams must be a finite number." });
    }
    if (portionGrams <= 0) {
      return res.status(400).json({ error: "portionGrams must be greater than 0." });
    }
    if (portionGrams > 5000) {
      return res.status(400).json({ error: "portionGrams cannot exceed 5000g." });
    }

    // ── Lookup → fallback → scale → store ─────────────────────────
    const foundFood = findFood(foodName.trim());
    const food = foundFood ?? { name: foodName.trim(), ...FALLBACK_NUTRIENTS };

    const scaled    = scaleNutrients(food, portionGrams);
    const newMeal   = addMeal(scaled);
    const dashboard = computeDashboard(getActiveMeals(), req.app.locals.activeGoal);

    res.status(201).json({ newMeal, dashboard });

  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/meals/scan
// Actual AI image scanner via Gemini 1.5 Flash.
// If GEMINI_API_KEY is missing or invalid, falls back gracefully to a mock item log
// (identifying the food as "Grilled Salmon" at 150g) and prints a warning.
// ─────────────────────────────────────────────────────────────────
router.post("/scan", upload.single("image"), async (req, res, next) => {
  try {
    let foodName = MOCK_SCANNED_FOOD.foodName;
    let portionGrams = MOCK_SCANNED_FOOD.portionGrams;
    let scannedViaAI = false;

    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== "your_gemini_api_key_here") {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No image file uploaded." });
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" }
        });

        // Prompt requesting a JSON response containing foodName and portionGrams
        const prompt = `Analyze this food image. Identify the primary food item and estimate its portion size in grams. Return a JSON object in this exact schema: { "foodName": string, "portionGrams": number }`;

        const imagePart = {
          inlineData: {
            data: req.file.buffer.toString("base64"),
            mimeType: req.file.mimetype,
          },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text();
        
        const parsed = JSON.parse(text.trim());
        if (parsed.foodName) {
          foodName = parsed.foodName;
          portionGrams = Number(parsed.portionGrams) || 150;
          scannedViaAI = true;
        }
      } catch (aiErr) {
        console.warn("Gemini API call failed, falling back to mock scanner:", aiErr.message);
      }
    } else {
      console.warn("GEMINI_API_KEY not set or is default template. Falling back to mock scanner.");
    }

    // Reuse normal validation and scaling logic
    const foundFood = findFood(foodName);
    const food = foundFood ?? { name: foodName, ...FALLBACK_NUTRIENTS };
    const portion = Math.min(Math.max(portionGrams, 1), 5000); // Clamped between 1g and 5000g

    const scaled = scaleNutrients(food, portion);
    const newMeal = addMeal(scaled);
    const dashboard = computeDashboard(getActiveMeals(), req.app.locals.activeGoal);

    res.status(201).json({ 
      newMeal, 
      dashboard,
      scannedViaAI
    });

  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/meals/:id
// Soft-delete: marks meal as pendingDeletion=true.
// Dashboard immediately excludes it (bars recalculate).
// The undo window is managed by the frontend.
// Call DELETE /api/meals/:id/confirm to permanently remove,
// or POST /api/meals/:id/restore to undo.
// ─────────────────────────────────────────────────────────────────
router.delete("/:id", (req, res, next) => {
  try {
    const { id } = req.params;

    // Reject accidental sub-route calls hitting this handler
    if (id === "confirm" || id === "restore") {
      return res.status(400).json({ error: "Invalid meal id." });
    }

    const softDeleted = softDeleteMeal(id);
    if (!softDeleted) {
      return res.status(404).json({ error: `Meal "${id}" not found.` });
    }

    const dashboard = computeDashboard(getActiveMeals(), req.app.locals.activeGoal);
    res.json({ softDeletedMeal: softDeleted, dashboard });

  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/meals/:id/confirm
// Permanently removes a soft-deleted meal (grace period expired).
// Called by the frontend after the 5-second undo window closes.
// ─────────────────────────────────────────────────────────────────
router.delete("/:id/confirm", (req, res, next) => {
  try {
    const purged = purgeMeal(req.params.id);
    if (!purged) {
      return res.status(404).json({ error: `Meal "${req.params.id}" not found.` });
    }

    const dashboard = computeDashboard(getActiveMeals(), req.app.locals.activeGoal);
    res.json({ purgedMeal: purged, dashboard });

  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/meals/:id/restore
// Restores a soft-deleted meal (undo clicked within grace period).
// Recalculates dashboard with the meal back as active.
// ─────────────────────────────────────────────────────────────────
router.post("/:id/restore", (req, res, next) => {
  try {
    const restored = restoreMeal(req.params.id);
    if (!restored) {
      return res.status(404).json({ error: `Meal "${req.params.id}" not found or already purged.` });
    }

    const dashboard = computeDashboard(getActiveMeals(), req.app.locals.activeGoal);
    res.json({ restoredMeal: restored, dashboard });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
