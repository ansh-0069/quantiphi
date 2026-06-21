import './ExceededModal.css'

/**
 * ExceededModal — shown only when justExceeded=true (false→true transition).
 * Parent controls visibility via the `show` prop.
 */
export default function ExceededModal({ show, onClose, dashboard }) {
  if (!show) return null

  const over = dashboard
    ? (dashboard.consumed.calories - dashboard.targets.calories).toFixed(1)
    : 0

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <span className="modal-box__icon">🚨</span>
        <h2 id="modal-title" className="modal-box__title">Daily Budget Exceeded!</h2>
        <p className="modal-box__subtitle">
          You've gone <strong>{over} kcal</strong> over your daily target.<br />
          Consider removing a meal or switching to a higher calorie goal.
        </p>
        <button className="modal-box__close" onClick={onClose} autoFocus>
          Got it, close
        </button>
      </div>
    </div>
  )
}
