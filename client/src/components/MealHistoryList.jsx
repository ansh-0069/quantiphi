import './MealHistoryList.css'

/**
 * MealHistoryList — table of logged meals with delete buttons.
 * Pure render — calls onDelete(id, foodName); parent handles soft-delete + undo toast.
 */
export default function MealHistoryList({ meals, onDelete, deletingId }) {
  if (!meals || meals.length === 0) {
    return (
      <div className="meal-history">
        <span className="meal-history__title">Today's Log</span>
        <p className="meal-history__empty">No meals logged yet. Add your first food above!</p>
      </div>
    )
  }

  return (
    <div className="meal-history">
      <span className="meal-history__title">Today's Log — {meals.length} item{meals.length !== 1 ? 's' : ''}</span>
      <table className="meal-history__table">
        <thead>
          <tr>
            <th>Food</th>
            <th>Portion</th>
            <th>Calories</th>
            <th>Protein</th>
            <th>Carbs</th>
            <th>Fats</th>
            <th>Del</th>
          </tr>
        </thead>
        <tbody>
          {meals.map(meal => (
            <tr key={meal.id} className="meal-row">
              <td>
                <span className="meal-row__name">{meal.foodName}</span>
              </td>
              <td>
                <span className="meal-row__portion">{meal.portionGrams}g</span>
              </td>
              <td>
                <span className="meal-row__num meal-row__num--calories">{meal.calories}</span>
              </td>
              <td>
                <span className="meal-row__num meal-row__num--protein">{meal.protein}g</span>
              </td>
              <td>
                <span className="meal-row__num meal-row__num--carbs">{meal.carbs}g</span>
              </td>
              <td>
                <span className="meal-row__num meal-row__num--fats">{meal.fats}g</span>
              </td>
              <td>
                <button
                  className="btn-delete"
                  onClick={() => onDelete(meal.id, meal.foodName)}
                  disabled={deletingId === meal.id}
                  aria-label={`Delete ${meal.foodName}`}
                  title="Delete meal"
                >
                  {deletingId === meal.id ? '…' : '🗑️'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
