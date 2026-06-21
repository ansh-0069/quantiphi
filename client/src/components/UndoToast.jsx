import { useEffect, useRef, useState } from 'react'
import './UndoToast.css'

const GRACE_MS = 5000   // 5-second undo window

/**
 * UndoToast — bottom snackbar with an undo button and countdown bar.
 *
 * Props:
 *   toast: { id, foodName } | null
 *     When non-null, the toast is shown for the deleted meal.
 *   onUndo(id)    — called when user clicks Undo
 *   onConfirm(id) — called when the grace period expires naturally
 *   onDismiss(id) — called when user clicks ✕ (also triggers confirm)
 */
export default function UndoToast({ toast, onUndo, onConfirm, onDismiss }) {
  const [progress, setProgress]   = useState(100)   // 100 → 0 over GRACE_MS
  const [leaving,  setLeaving]    = useState(false)
  const confirmTimer  = useRef(null)
  const rafHandle     = useRef(null)
  const startTime     = useRef(null)

  // When a new toast arrives: start countdown
  useEffect(() => {
    if (!toast) return

    setProgress(100)
    setLeaving(false)
    startTime.current = performance.now()

    // Animate the progress bar via rAF
    const tick = (now) => {
      const elapsed  = now - startTime.current
      const remaining = Math.max(0, 100 - (elapsed / GRACE_MS) * 100)
      setProgress(remaining)
      if (remaining > 0) {
        rafHandle.current = requestAnimationFrame(tick)
      }
    }
    rafHandle.current = requestAnimationFrame(tick)

    // Confirm deletion after grace period
    confirmTimer.current = setTimeout(() => {
      beginLeave(() => onConfirm(toast.id))
    }, GRACE_MS)

    return () => {
      clearTimeout(confirmTimer.current)
      cancelAnimationFrame(rafHandle.current)
    }
  }, [toast?.id]) // re-run when a new toast id appears

  const cancelTimers = () => {
    clearTimeout(confirmTimer.current)
    cancelAnimationFrame(rafHandle.current)
  }

  const beginLeave = (callback) => {
    setLeaving(true)
    setTimeout(callback, 200)   // match CSS slide-down duration
  }

  const handleUndo = () => {
    cancelTimers()
    beginLeave(() => onUndo(toast.id))
  }

  const handleDismiss = () => {
    cancelTimers()
    beginLeave(() => onDismiss(toast.id))
  }

  if (!toast) return null

  return (
    <div
      className={`undo-toast${leaving ? ' undo-toast--leaving' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Meal deleted. Click undo to restore."
    >
      <span className="undo-toast__icon">🗑️</span>

      <span className="undo-toast__text">
        <span className="undo-toast__food">{toast.foodName}</span> deleted
      </span>

      <button className="undo-toast__btn" onClick={handleUndo} autoFocus>
        Undo
      </button>

      <button className="undo-toast__dismiss" onClick={handleDismiss} aria-label="Dismiss">
        ✕
      </button>

      {/* Countdown progress bar */}
      <div
        className="undo-toast__progress"
        style={{ width: `${progress}%` }}
        aria-hidden="true"
      />
    </div>
  )
}
