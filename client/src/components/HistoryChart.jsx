import { useEffect, useState, useMemo } from 'react'
import { getWeekHistory } from '../api/api'
import './HistoryChart.css'

function shortDate(iso) {
  return iso.slice(5)
}

export default function HistoryChart() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [hoverIdx, setHoverIdx] = useState(-1)

  useEffect(() => {
    let mounted = true
    getWeekHistory()
      .then(res => { if (mounted) setData(res.history ?? res) })
      .catch(() => { if (mounted) setError('Could not load history') })
    return () => { mounted = false }
  }, [])

  const points = useMemo(() => {
    if (!data) return []
    const values = data.map(d => d.calories)
    const max = Math.max(...values, 1)
    const width = 340
    const height = 120
    const padding = 24
    const stepX = (width - padding * 2) / (data.length - 1)
    return data.map((d, i) => {
      const x = padding + i * stepX
      const y = height - padding - (d.calories / max) * (height - padding * 2)
      return { x, y, ...d }
    })
  }, [data])

  if (error) return <div className="history-chart__error">{error}</div>
  if (!data) return <div className="history-chart__loading">Loading history…</div>

  const width = 340
  const height = 120

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div className="history-chart">
      <div className="history-chart__title">Last 7 Days — Calories</div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
           onMouseLeave={() => setHoverIdx(-1)}>

        {/* area under line */}
        <path d={`${pathD} L ${points[points.length -1].x} ${height - 24} L ${points[0].x} ${height - 24} Z`} fill="rgba(106,176,76,0.12)" stroke="none" />

        {/* line */}
        <path d={pathD} fill="none" stroke="#6ab04c" strokeWidth="2" />

        {/* points */}
        {points.map((p, i) => (
          <g key={p.date}
             onMouseEnter={() => setHoverIdx(i)}
             onFocus={() => setHoverIdx(i)}
             tabIndex={0}
          >
            <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="#6ab04c" strokeWidth={2} />
            {hoverIdx === i && (
              <g>
                <rect x={p.x - 28} y={p.y - 38} width={56} height={24} rx={4} fill="#222" opacity={0.95} />
                <text x={p.x} y={p.y - 22} fontSize="11" textAnchor="middle" fill="#fff">{p.calories} kcal</text>
              </g>
            )}
            <text x={p.x} y={height - 6} fontSize="10" textAnchor="middle" fill="#333">{shortDate(p.date)}</text>
          </g>
        ))}
      </svg>
    </div>
  )
}
