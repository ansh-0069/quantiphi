import { useState } from 'react'
import FoodAutocomplete from './FoodAutocomplete'
import './LogFoodForm.css'

/**
 * LogFoodForm — food name autocomplete + portion grams input + mock scan button.
 * Does ZERO nutritional calculation — all math is on the server.
 *
 * Props:
 *   onLog(foodName, portionGrams) → Promise<boolean>
 *     Returns true on success (clears fields), false on error (keeps fields).
 *   onScan() → void
 *     Triggers the mock AI food scanner.
 *   loading: boolean — disables all inputs while a request is in flight.
 */
export default function LogFoodForm({ onLog, onScan, loading }) {
  const [foodName,     setFoodName]     = useState('')
  const [portionGrams, setPortionGrams] = useState('')
  const [error,        setError]        = useState('')

  // Called when user selects a suggestion from the autocomplete dropdown.
  // Fills the food name; focuses the portion input so the user can type grams next.
  const handleSelectFood = (food) => {
    setFoodName(food.name)
    setError('')
    // Small delay to let the dropdown close animation finish before stealing focus
    setTimeout(() => {
      document.getElementById('portion-grams')?.focus()
    }, 50)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // ── Client-side presence + range validation ─────────────────────────
    if (!foodName.trim()) {
      setError('Please enter a food name.')
      return
    }

    const grams = parseFloat(portionGrams)
    if (!portionGrams || isNaN(grams) || grams <= 0) {
      setError('Please enter a valid portion in grams (must be greater than 0).')
      return
    }
    if (grams > 5000) {
      setError('Portion cannot exceed 5000g.')
      return
    }

    // Only clear fields on confirmed API success
    const success = await onLog(foodName.trim(), grams)
    if (success) {
      setFoodName('')
      setPortionGrams('')
    }
  }

  const handleScan = () => {
    setError('')
    onScan()
  }

  return (
    <div className="log-form">
      <span className="log-form__title">Log a Food Item</span>
      <form onSubmit={handleSubmit} noValidate>
        <div className="log-form__row">

          {/* Food name with autocomplete dropdown */}
          <div className="log-form__field">
            <label htmlFor="food-name">Food Name</label>
            <FoodAutocomplete
              value={foodName}
              onChange={setFoodName}
              onSelect={handleSelectFood}
              disabled={loading}
              inputProps={{
                id:          'food-name',
                className:   'log-form__input',
                placeholder: 'e.g. Chicken Breast',
              }}
            />
          </div>

          {/* Portion grams */}
          <div className="log-form__field" style={{ maxWidth: '140px' }}>
            <label htmlFor="portion-grams">Portion (g)</label>
            <input
              id="portion-grams"
              type="number"
              className="log-form__input"
              placeholder="e.g. 200"
              value={portionGrams}
              onChange={e => setPortionGrams(e.target.value)}
              min="1"
              max="5000"
              step="any"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="log-form__actions">
            <button
              type="submit"
              id="btn-add-food"
              className="btn btn--primary"
              disabled={loading}
            >
              {loading ? 'Logging…' : '+ Add'}
            </button>

            <button
              type="button"
              id="btn-scan-food"
              className="btn btn--scan"
              onClick={handleScan}
              disabled={loading}
              title="Simulate AI food photo scanner — auto-fills Grilled Salmon 150g"
            >
              📷 Scan
            </button>
          </div>
        </div>

        {/* Validation / API error */}
        {error && (
          <div className="log-form__error" role="alert">
            {error}
          </div>
        )}
      </form>
    </div>
  )
}
