import { useState, useEffect, useRef } from 'react'
import { getMeals, postMeal, softDeleteMeal, confirmDelete, restoreMeal, setGoal } from './api/api'

import GoalToggle       from './components/GoalToggle'
import CalorieBudgetBar from './components/CalorieBudgetBar'
import MacroMeters      from './components/MacroMeters'
import HistoryChart     from './components/HistoryChart'
import LogFoodForm      from './components/LogFoodForm'
import MealHistoryList  from './components/MealHistoryList'
import ExceededModal    from './components/ExceededModal'
import UndoToast        from './components/UndoToast'

import './App.css'

/**
 * App — single source of truth.
 *
 * State:
 *   dashboard   — server response (targets/consumed/percentages/barWidths/status/meals)
 *   activeGoal  — mirrors dashboard.goal.id
 *   showModal   — true only on justExceeded false→true transition
 *   loading     — POST /api/meals in flight
 *   deletingId  — id of the meal whose trash button is currently spinning
 *   error       — top-level API error string
 *   undoToast   — { id, foodName } | null — the meal currently in its undo window
 *
 * Undo flow:
 *   1. Trash clicked → softDeleteMeal(id) → backend marks pendingDeletion=true
 *   2. Dashboard immediately recalculates without that meal (bars move)
 *   3. Toast appears with 5s countdown
 *   4a. Undo clicked  → restoreMeal(id)  → meal reappears, dashboard recalculates
 *   4b. Timeout / ✕   → confirmDelete(id) → permanent removal
 *
 * Rule: frontend does ZERO nutritional calculations.
 */
export default function App() {
  const [dashboard,  setDashboard]  = useState(null)
  const [activeGoal, setActiveGoal] = useState('maintenance')
  const [showModal,  setShowModal]  = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [error,      setError]      = useState('')
  const [undoToast,  setUndoToast]  = useState(null)  // { id, foodName } | null

  const activeGoalRef = useRef(activeGoal)
  activeGoalRef.current = activeGoal

  const applyDashboard = (data) => {
    const db = data.dashboard ?? data
    setDashboard(db)
    setActiveGoal(db.goal?.id ?? activeGoalRef.current)
    if (db.justExceeded) setShowModal(true)
  }

  useEffect(() => {
    getMeals()
      .then(applyDashboard)
      .catch(() => setError('Could not reach the server. Is it running on port 3001?'))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ────────────────────────────────────────────────────────────

  const handleGoalChange = async (goalId) => {
    setError('')
    try {
      applyDashboard(await setGoal(goalId))
    } catch {
      setError('Failed to switch goal. Please try again.')
    }
  }

  const handleLog = async (foodName, portionGrams) => {
    setLoading(true)
    setError('')
    try {
      applyDashboard(await postMeal({ foodName, portionGrams }))
      return true
    } catch (e) {
      setError(e?.response?.data?.error ?? 'Failed to log food. Check your connection.')
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleScan = async () => {
    setLoading(true)
    setError('')
    try {
      applyDashboard(await postMeal({ scanned: true }))
    } catch {
      setError('Failed to scan food. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  /**
   * handleDelete — soft-delete the meal immediately so bars update,
   * then show the undo toast. The timer in UndoToast calls handleConfirm
   * or handleUndo when it resolves.
   *
   * Only one undo window at a time: if a previous toast is still open,
   * confirm that meal first before opening a new window.
   */
  const handleDelete = async (id, foodName) => {
    setDeletingId(id)
    setError('')

    try {
      // If another toast is already open, confirm that deletion first
      if (undoToast && undoToast.id !== id) {
        await confirmDelete(undoToast.id).catch(() => {})
        setUndoToast(null)
      }

      const data = await softDeleteMeal(id)
      applyDashboard(data)
      setUndoToast({ id, foodName })   // open undo window

    } catch {
      setError('Failed to delete meal. Check your connection.')
    } finally {
      setDeletingId(null)
    }
  }

  /** Undo clicked: restore the meal and close toast */
  const handleUndo = async (id) => {
    setError('')
    try {
      applyDashboard(await restoreMeal(id))
    } catch {
      setError('Failed to restore meal. Check your connection.')
    } finally {
      setUndoToast(null)
    }
  }

  /** Grace period expired or ✕ clicked: permanently remove */
  const handleConfirm = async (id) => {
    setError('')
    try {
      await confirmDelete(id)
      // No need to applyDashboard — meal was already excluded by softDelete
    } catch {
      // Meal may already be gone; swallow the error silently
    } finally {
      setUndoToast(null)
    }
  }

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app__header">
        <div className="app__header-inner">
          <div className="app__brand">
            <span className="app__brand-icon">🥗</span>
            <div>
              <h1 className="app__title">CaloriePilot</h1>
              <p className="app__subtitle">Daily Food Journal &amp; Macro Dashboard</p>
            </div>
          </div>
          <GoalToggle
            activeGoalId={activeGoal}
            onGoalChange={handleGoalChange}
            disabled={loading}
          />
        </div>
      </header>

      <main className="app__main">
        {/* ── Global error banner ── */}
        {error && (
          <div className="app__error-banner" role="alert">
            ⚠️ {error}
            <button onClick={() => setError('')} className="app__error-close" aria-label="Dismiss error">✕</button>
          </div>
        )}

        {/* ── Progress bars ── */}
        <section className="app__progress" aria-label="Nutritional progress">
          <CalorieBudgetBar dashboard={dashboard} />
          <MacroMeters      dashboard={dashboard} />
          <HistoryChart />
        </section>

        {/* ── Log form + history ── */}
        <section className="app__log-section" aria-label="Food logging">
          <LogFoodForm onLog={handleLog} onScan={handleScan} loading={loading} />
          <MealHistoryList
            meals={dashboard?.meals}
            onDelete={handleDelete}
            deletingId={deletingId}
          />
        </section>
      </main>

      {/* ── Exceeded modal ── */}
      <ExceededModal
        show={showModal}
        onClose={() => setShowModal(false)}
        dashboard={dashboard}
      />

      {/* ── Undo toast ── */}
      <UndoToast
        toast={undoToast}
        onUndo={handleUndo}
        onConfirm={handleConfirm}
        onDismiss={handleConfirm}
      />
    </div>
  )
}
