import './GoalToggle.css'

const GOALS = [
  { id: 'weight_loss',  label: 'Weight Loss' },
  { id: 'maintenance',  label: 'Maintenance' },
  { id: 'muscle_gain',  label: 'Muscle Gain'  },
]

/**
 * GoalToggle — 3-way pill switch.
 * Calls onGoalChange(goalId) on click; parent owns the API call.
 */
export default function GoalToggle({ activeGoalId, onGoalChange, disabled }) {
  return (
    <div className="goal-toggle">
      <span className="goal-toggle__label">Fitness Goal</span>
      <div className="goal-toggle__track" role="group" aria-label="Fitness goal selector">
        {GOALS.map(({ id, label }) => (
          <button
            key={id}
            className={`goal-toggle__btn${activeGoalId === id ? ' goal-toggle__btn--active' : ''}`}
            onClick={() => activeGoalId !== id && onGoalChange(id)}
            disabled={disabled}
            aria-pressed={activeGoalId === id}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
