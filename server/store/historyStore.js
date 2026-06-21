/**
 * In-memory daily calories snapshot store.
 * Keyed by ISO date string (YYYY-MM-DD) -> calories number
 */

const fs = require('fs')
const path = require('path')

const DATA_DIR = path.join(__dirname, '..', 'data')
const DATA_FILE = path.join(DATA_DIR, 'history.json')

const historyByDate = new Map();

// Seed a few days of fake historical data for the prototype
function seedIfEmpty() {
  if (historyByDate.size > 0) return;
  const today = new Date();
  for (let i = 1; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    // Simple varying values between 1400 and 2600
    const calories = 1400 + Math.floor(Math.random() * 1200);
    historyByDate.set(key, calories);
  }
}

function formatDate(date) {
  return date instanceof Date ? date.toISOString().slice(0, 10) : String(date);
}

/**
 * Record or overwrite the daily total for a given date.
 */
function recordDailyTotal(dateOrIso, calories) {
  const key = formatDate(dateOrIso);
  historyByDate.set(key, Number(calories) || 0);
  // Persist to disk
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    const obj = Object.fromEntries(historyByDate)
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2), 'utf8')
  } catch (err) {
    // Non-fatal: log and continue
    console.error('historyStore: failed to persist history:', err?.message ?? err)
  }
}

/**
 * Return the last 7 days of totals (oldest first). Each item: { date: 'YYYY-MM-DD', calories }
 */
function getWeekHistory(referenceDate = new Date()) {
  // Attempt to load persisted file first (one-time)
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8')
      const parsed = JSON.parse(raw)
      // replace internal map
      for (const [k, v] of Object.entries(parsed)) historyByDate.set(k, v)
    }
  } catch (err) {
    console.error('historyStore: failed to load persisted history:', err?.message ?? err)
  }

  seedIfEmpty();
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const arr = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(ref.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    arr.push({ date: key, calories: historyByDate.get(key) ?? 0 });
  }
  return arr;
}

module.exports = { recordDailyTotal, getWeekHistory };
