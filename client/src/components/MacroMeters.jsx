import './MacroMeters.css'

const MACROS = [
  { key: 'protein', label: 'Protein',       unit: 'g', cls: 'protein' },
  { key: 'carbs',   label: 'Carbohydrates', unit: 'g', cls: 'carbs'   },
  { key: 'fats',    label: 'Fats',          unit: 'g', cls: 'fats'    },
]

/**
 * MacroMeters — 3 horizontal macro progress bars.
 * barWidths are server-capped at 100; percentages are the raw values for display.
 */
export default function MacroMeters({ dashboard }) {
  if (!dashboard) return null

  const { consumed, targets, barWidths, percentages, macroWarnings } = dashboard

  return (
    <div className="macro-meters">
      <span className="macro-meters__title">Macronutrients</span>
      <div className="macro-meters__grid">
        {MACROS.map(({ key, label, unit, cls }) => (
          <div key={key} className="macro-item">
            <div className="macro-item__header">
              <span className="macro-item__name">
                <span className={`macro-item__dot macro-item__dot--${cls}`} />
                {label}
                {macroWarnings && macroWarnings[key] && (
                  <span className="macro-item__warning">
                    {label} target exceeded
                  </span>
                )}
              </span>
              <span className="macro-item__values">
                <strong>{consumed[key]}</strong>{unit}
                <span style={{ margin: '0 0.3rem', opacity: 0.4 }}>/</span>
                {targets[key]}{unit}
                <span style={{ marginLeft: '0.5rem', opacity: 0.55 }}>
                  ({percentages[key]}%)
                </span>
              </span>
            </div>
            <div className="macro-item__track"
              role="progressbar"
              aria-valuenow={consumed[key]}
              aria-valuemax={targets[key]}>
              <div
                className={`macro-item__fill macro-item__fill--${cls}`}
                style={{ width: `${barWidths[key]}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
