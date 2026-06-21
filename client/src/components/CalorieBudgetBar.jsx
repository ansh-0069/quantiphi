import './CalorieBudgetBar.css'

/**
 * CalorieBudgetBar — main progress bar.
 * Width and color are driven entirely by backend values.
 * barWidths.calories is already capped at 100 by the server.
 */
export default function CalorieBudgetBar({ dashboard }) {
  if (!dashboard) return null

  const { consumed, targets, barWidths, percentages, status } = dashboard
  const exceeded = status === 'exceeded'

  return (
    <div className={`calorie-bar${exceeded ? ' calorie-bar--exceeded' : ''}`}>
      <div className="calorie-bar__header">
        <span className="calorie-bar__title">Daily Calorie Budget</span>
        <div className="calorie-bar__numbers">
          <span className="highlight">{consumed.calories}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '1rem', margin: '0 0.3rem' }}>/</span>
          {targets.calories} kcal
        </div>
      </div>

      <div className="calorie-bar__track" role="progressbar"
        aria-valuenow={consumed.calories} aria-valuemax={targets.calories}>
        <div
          className={`calorie-bar__fill${exceeded ? ' calorie-bar__fill--exceeded' : ''}`}
          style={{ width: `${barWidths.calories}%` }}
        />
      </div>

      <div className="calorie-bar__footer">
        <span>{targets.calories - consumed.calories > 0
          ? `${(targets.calories - consumed.calories).toFixed(1)} kcal remaining`
          : `${(consumed.calories - targets.calories).toFixed(1)} kcal over budget`}
        </span>
        <span className={`status-badge status-badge--${status}`}>
          {status === 'exceeded' ? 'Exceeded' : 'On Track'}
        </span>
        <span>{percentages.calories}%</span>
      </div>
    </div>
  )
}
