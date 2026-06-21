const express = require("express");
const cors = require("cors");
const { DEFAULT_GOAL } = require("./data/goalProfiles");

const mealsRouter = require("./routes/meals");
const goalsRouter = require("./routes/goals");
const foodsRouter = require("./routes/foods");
const historyRouter = require("./routes/history");

const app = express();
const PORT = process.env.PORT || 3001;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- App-level state ---
app.locals.activeGoal = DEFAULT_GOAL; // "maintenance" by default

// --- Routes ---
app.use("/api/meals", mealsRouter);
app.use("/api/goal", goalsRouter);
app.use("/api/foods", foodsRouter);
app.use("/api/history", historyRouter);

// --- Health check ---
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// --- Error handler ---
app.use((err, req, res, _next) => {
  console.error("Server error:", err.message);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`\n🍎 Calorie Tracker API running on http://localhost:${PORT}`);
  console.log(`   Default goal: ${DEFAULT_GOAL}`);
  console.log(`   Endpoints:`);
  console.log(`     GET    /api/foods`);
  console.log(`     GET    /api/meals`);
  console.log(`     POST   /api/meals`);
  console.log(`     DELETE /api/meals/:id`);
  console.log(`     GET    /api/goal`);
  console.log(`     POST   /api/goal`);
  console.log(`     GET    /api/health\n`);
});

module.exports = app;
