import { useState, useRef } from 'react'
import FoodAutocomplete from './FoodAutocomplete'
import { addFood } from '../api/api'
import './LogFoodForm.css'

/**
 * LogFoodForm — food name autocomplete + portion grams input + mock scan button.
 * Does ZERO nutritional calculation — all math is on the server.
 *
 * Props:
 *   onLog(foodName, portionGrams) → Promise<boolean>
 *     Returns true on success (clears fields), false on error (keeps fields).
 *   onScan(file) → void
 *     Triggers the actual/mock AI food scanner.
 *   loading: boolean — disables all inputs while a request is in flight.
 */
export default function LogFoodForm({ onLog, onScan, loading }) {
  const fileInputRef = useRef(null)
  const [foodName,     setFoodName]     = useState('')
  const [portionGrams, setPortionGrams] = useState('')
  const [error,        setError]        = useState('')
  const [showAddFood,  setShowAddFood]  = useState(false)
  const [addError,     setAddError]     = useState('')
  const [addForm,      setAddForm]      = useState({
    name: '', caloriesPer100g: '', proteinPer100g: '', carbsPer100g: '', fatsPer100g: '',
  })

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

  const handleScan = (e) => {
    setError('')
    const file = e.target.files?.[0]
    if (file) {
      onScan(file)
    }
  }

  const handleAddFoodSubmit = async (e) => {
    e.preventDefault()
    setAddError('')

    const payload = {
      name: addForm.name.trim(),
      caloriesPer100g: parseFloat(addForm.caloriesPer100g),
      proteinPer100g: parseFloat(addForm.proteinPer100g),
      carbsPer100g: parseFloat(addForm.carbsPer100g),
      fatsPer100g: parseFloat(addForm.fatsPer100g),
    }

    if (!payload.name) {
      setAddError('Please enter a food name.')
      return
    }

    for (const [key, value] of Object.entries(payload)) {
      if (key === 'name') continue
      if (Number.isNaN(value) || !Number.isFinite(value) || value < 0) {
        setAddError('Please enter valid non-negative numbers for all nutrients.')
        return
      }
    }

    try {
      const response = await addFood(payload)
      const created = response.food ?? response
      setFoodName(created.name)
      setShowAddFood(false)
      setAddForm({
        name: '', caloriesPer100g: '', proteinPer100g: '', carbsPer100g: '', fatsPer100g: '',
      })
    } catch (err) {
      setAddError(err?.response?.data?.error ?? 'Failed to add food.')
    }
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
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              title="Upload food photo to identify and log nutrition using AI"
            >
              📷 Image Upload
            </button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*"
              capture="environment"
              onChange={handleScan}
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="button"
          className="log-form__link-btn"
          onClick={() => setShowAddFood((value) => !value)}
          disabled={loading}
        >
          {showAddFood ? 'Hide custom food form' : "Can't find your food? Add it"}
        </button>

        {showAddFood && (
          <div className="log-form__custom-food">
            <span className="log-form__custom-food-title">Add a custom food</span>
            <div className="log-form__custom-food-form">
              <div className="log-form__custom-food-grid">
                <label>
                  Name
                  <input
                    type="text"
                    className="log-form__input"
                    value={addForm.name}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Homemade Curry"
                    disabled={loading}
                  />
                </label>
                <label>
                  Calories / 100g
                  <input
                    type="number"
                    className="log-form__input"
                    value={addForm.caloriesPer100g}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, caloriesPer100g: e.target.value }))}
                    min="0"
                    step="any"
                    disabled={loading}
                  />
                </label>
                <label>
                  Protein / 100g
                  <input
                    type="number"
                    className="log-form__input"
                    value={addForm.proteinPer100g}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, proteinPer100g: e.target.value }))}
                    min="0"
                    step="any"
                    disabled={loading}
                  />
                </label>
                <label>
                  Carbs / 100g
                  <input
                    type="number"
                    className="log-form__input"
                    value={addForm.carbsPer100g}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, carbsPer100g: e.target.value }))}
                    min="0"
                    step="any"
                    disabled={loading}
                  />
                </label>
                <label>
                  Fats / 100g
                  <input
                    type="number"
                    className="log-form__input"
                    value={addForm.fatsPer100g}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, fatsPer100g: e.target.value }))}
                    min="0"
                    step="any"
                    disabled={loading}
                  />
                </label>
              </div>

              <div className="log-form__custom-food-actions">
                <button type="button" onClick={handleAddFoodSubmit} className="btn btn--primary" disabled={loading}>
                  Save food
                </button>
              </div>
            </div>
            {addError && (
              <div className="log-form__error" role="alert">
                {addError}
              </div>
            )}
          </div>
        )}

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
