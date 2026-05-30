import { useEffect, useRef, useState } from 'react'
import { palette } from '../lib/palette'
import { getColorForDate } from '../lib/seed'
import { getAllFinds, getCurrentStreak, type Find } from '../lib/db'
import { utcDateString } from '../lib/utils'

interface CellData {
  dateStr: string
  isToday: boolean
  isFuture: boolean
  find: Find | undefined
}

interface Tooltip {
  dateStr: string
  colorName: string
  score: number
  x: number
  y: number
}

export default function Streak() {
  const [finds, setFinds] = useState<Find[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getAllFinds().then(f => {
      setFinds(f)
      setLoading(false)
    })
  }, [])

  const today = utcDateString(new Date())
  const { current: currentStreak, longest: longestStreak } = getCurrentStreak(finds)
  const findMap = new Map(finds.map(f => [f.date, f]))

  // Build the year grid: Jan 1 of current UTC year → today+future to end of year
  const year = new Date().getUTCFullYear()
  const yearStart = new Date(Date.UTC(year, 0, 1))

  // Align to Monday start
  const startDow = (yearStart.getUTCDay() + 6) % 7  // 0=Mon
  const totalCells = 53 * 7
  const cells: (CellData | null)[] = Array(totalCells).fill(null)

  let d = new Date(yearStart)
  d.setUTCDate(d.getUTCDate() - startDow)  // go back to Monday

  for (let i = 0; i < totalCells; i++) {
    const ds = utcDateString(d)
    const inYear = d.getUTCFullYear() === year
    if (inYear) {
      cells[i] = {
        dateStr: ds,
        isToday: ds === today,
        isFuture: ds > today,
        find: findMap.get(ds),
      }
    }
    d.setUTCDate(d.getUTCDate() + 1)
  }

  const colorsFound = finds.length
  const bestFind = finds.reduce<Find | null>((best, f) =>
    !best || f.matchScore > best.matchScore ? f : best, null)

  const handleCellClick = (cell: CellData, e: React.MouseEvent) => {
    if (!cell.find) return
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    const containerRect = containerRef.current!.getBoundingClientRect()
    setTooltip({
      dateStr: cell.dateStr,
      colorName: cell.find.colorName,
      score: cell.find.matchScore,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 8,
    })
  }

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          width: 32, height: 32, border: '2.5px solid var(--border)',
          borderTopColor: 'var(--fg)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  // Render 53 columns of 7 cells
  const CELL = 12
  const GAP = 2
  const cols = 53

  return (
    <div className="page">
      <div style={{ padding: '20px 20px 0' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 24, marginBottom: 4 }}>
          Your Streak
        </h2>
        <p style={{ color: 'var(--fg-muted)', fontSize: 14 }}>{year}</p>
      </div>

      {/* Grid */}
      <div
        ref={containerRef}
        style={{ position: 'relative', overflowX: 'auto', padding: '16px 20px', WebkitOverflowScrolling: 'touch' as never }}
        onClick={() => setTooltip(null)}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
          gridTemplateRows: `repeat(7, ${CELL}px)`,
          gap: GAP,
          width: cols * (CELL + GAP) - GAP,
        }}>
          {Array.from({ length: cols }, (_, col) =>
            Array.from({ length: 7 }, (_, row) => {
              const idx = col * 7 + row
              const cell = cells[idx]
              if (!cell) return <div key={`${col}-${row}`} style={{ width: CELL, height: CELL }} />

              const { isToday, isFuture, find, dateStr } = cell
              let bg = 'transparent'
              let border = 'none'
              let animation = ''

              if (isFuture) {
                return <div key={dateStr} style={{ width: CELL, height: CELL }} />
              }

              if (find) {
                const c = getColorForDate(palette, dateStr)
                bg = c.hex
              } else if (isToday) {
                const c = getColorForDate(palette, dateStr)
                border = `1.5px solid ${c.hex}`
                animation = 'pulse-ring 2s ease-in-out infinite'
                bg = 'transparent'
              } else {
                border = `1px solid var(--border)`
              }

              return (
                <div
                  key={dateStr}
                  onClick={find ? (e) => { e.stopPropagation(); handleCellClick(cell, e) } : undefined}
                  title={find ? `${find.colorName} — ${Math.round(find.matchScore * 100)}%` : undefined}
                  style={{
                    width: CELL, height: CELL,
                    borderRadius: 2,
                    background: bg,
                    border,
                    animation,
                    cursor: find ? 'pointer' : 'default',
                    boxSizing: 'border-box',
                    color: getColorForDate(palette, dateStr).hex,
                  }}
                />
              )
            })
          )}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(26,26,26,0.9)',
            color: '#fff',
            padding: '6px 10px',
            borderRadius: 'var(--radius-sm)',
            fontSize: 12,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 10,
          }}>
            <strong>{tooltip.colorName}</strong>
            <span style={{ marginLeft: 6, opacity: 0.7 }}>{Math.round(tooltip.score * 100)}%</span>
            <br />
            <span style={{ opacity: 0.6 }}>{formatDate(tooltip.dateStr)}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ padding: '8px 20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}>
          <StatCard
            label="Current Streak"
            value={currentStreak === 0 ? '—' : `${currentStreak}`}
            sub={currentStreak > 0 ? 'days 🔥' : 'Find today\'s color!'}
            large
          />
          <StatCard
            label="Longest Streak"
            value={longestStreak === 0 ? '—' : `${longestStreak}`}
            sub={longestStreak > 0 ? 'days' : ''}
          />
          <StatCard
            label="Colors Found"
            value={`${colorsFound}`}
            sub={`of 365 (${Math.round((colorsFound / 365) * 100)}%)`}
          />
          <StatCard
            label="Best Match"
            value={bestFind ? `${Math.round(bestFind.matchScore * 100)}%` : '—'}
            sub={bestFind ? bestFind.colorName : ''}
          />
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, large }: { label: string; value: string; sub: string; large?: boolean }) {
  return (
    <div style={{
      background: 'var(--border)',
      borderRadius: 'var(--radius)',
      padding: '16px',
    }}>
      <p style={{ fontSize: 12, color: 'var(--fg-muted)', marginBottom: 6, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </p>
      <p style={{
        fontFamily: 'var(--font-serif)',
        fontSize: large ? 36 : 28,
        fontWeight: 400,
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {value}
      </p>
      {sub && <p style={{ fontSize: 12, color: 'var(--fg-muted)' }}>{sub}</p>}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}
