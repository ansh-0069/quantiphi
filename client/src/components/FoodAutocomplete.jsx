import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import './FoodAutocomplete.css'

const DEBOUNCE_MS = 180   // wait for user to pause typing before hitting API
const MAX_ITEMS   = 8     // max suggestions shown at once

/**
 * FoodAutocomplete — wraps a text input with a keyboard-navigable dropdown.
 *
 * Props:
 *   value: string              — controlled input value (the food name)
 *   onChange(value: string)    — called on every keystroke
 *   onSelect(food: object)     — called when a suggestion is committed
 *                                food = { id, name, caloriesPer100g, ... }
 *   disabled: bool
 *   inputProps: object         — forwarded to the <input> (id, placeholder, etc.)
 */
export default function FoodAutocomplete({ value, onChange, onSelect, disabled, inputProps = {} }) {
  const [suggestions, setSuggestions] = useState([])  // [{id,name,caloriesPer100g,...}]
  const [isOpen,      setIsOpen]      = useState(false)
  const [activeIdx,   setActiveIdx]   = useState(-1)   // keyboard-selected index
  const [loading,     setLoading]     = useState(false)

  const containerRef  = useRef(null)
  const debounceTimer = useRef(null)
  const abortRef      = useRef(null)   // AbortController for in-flight requests

  // ── Fetch suggestions from GET /api/foods?search=query ──────────────────
  const fetchSuggestions = useCallback(async (query) => {
    const q = query.trim()

    // Don't search on very short or empty input
    if (q.length < 1) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    // Cancel any previous in-flight request
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()

    setLoading(true)
    try {
      const { data } = await axios.get('/api/foods', {
        params:  { search: q },
        signal:  abortRef.current.signal,
      })
      setSuggestions(data.slice(0, MAX_ITEMS))
      setIsOpen(data.length > 0)
      setActiveIdx(-1)
    } catch (err) {
      if (axios.isCancel(err)) return   // ignore aborted requests
      setSuggestions([])
      setIsOpen(false)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Debounce keystroke → fetch ───────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      fetchSuggestions(value)
    }, DEBOUNCE_MS)

    return () => clearTimeout(debounceTimer.current)
  }, [value, fetchSuggestions])

  // ── Close dropdown when clicking outside ────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Commit a selection (click or Enter) ─────────────────────────────────
  const commitSelection = (food) => {
    onChange(food.name)    // fill the input with the canonical food name
    onSelect(food)         // notify parent (e.g. to pre-fill portion hints)
    setSuggestions([])
    setIsOpen(false)
    setActiveIdx(-1)
  }

  // ── Keyboard navigation ──────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActiveIdx(i => Math.min(i + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActiveIdx(i => Math.max(i - 1, -1))
        break
      case 'Enter':
        if (activeIdx >= 0) {
          e.preventDefault()
          commitSelection(suggestions[activeIdx])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setActiveIdx(-1)
        break
      default:
        break
    }
  }

  // ── Highlight the matched substring in a suggestion name ─────────────────
  const highlight = (text, query) => {
    if (!query.trim()) return text
    const idx = text.toLowerCase().indexOf(query.toLowerCase().trim())
    if (idx === -1) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark>{text.slice(idx, idx + query.trim().length)}</mark>
        {text.slice(idx + query.trim().length)}
      </>
    )
  }

  return (
    <div className="autocomplete" ref={containerRef}>
      <input
        {...inputProps}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true) }}
        disabled={disabled}
        autoComplete="off"
        aria-autocomplete="list"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-activedescendant={activeIdx >= 0 ? `food-opt-${activeIdx}` : undefined}
      />

      {isOpen && (
        <ul
          className="autocomplete__dropdown"
          role="listbox"
          aria-label="Food suggestions"
        >
          {suggestions.length === 0 && !loading ? (
            <li className="autocomplete__empty">No matching foods found</li>
          ) : (
            suggestions.map((food, i) => (
              <li
                key={food.id}
                id={`food-opt-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                className={`autocomplete__item${i === activeIdx ? ' autocomplete__item--active' : ''}`}
                // mouseDown fires before onBlur, preventing premature close
                onMouseDown={(e) => { e.preventDefault(); commitSelection(food) }}
              >
                <span className="autocomplete__name">
                  {highlight(food.name, value)}
                </span>
                <span className="autocomplete__cal">
                  {food.caloriesPer100g} kcal/100g
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}
