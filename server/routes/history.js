const express = require('express');
const { getWeekHistory } = require('../store/historyStore');

const router = express.Router();

/**
 * GET /api/history/week
 * Returns last 7 days of daily calories: [{date, calories}, ...]
 */
router.get('/week', (req, res, next) => {
  try {
    const data = getWeekHistory();
    res.json({ history: data });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
