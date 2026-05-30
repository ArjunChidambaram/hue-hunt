import { useEffect, useState } from 'react'

interface Props {
  score: number  // 0.0 to 1.0
  size?: number
  animate?: boolean
}

function getScoreColor(score: number): string {
  if (score >= 0.6) return '#4CAF50'   // green — found it
  if (score >= 0.4) return '#FF9800'   // orange — not bad
  if (score >= 0.2) return '#FFC107'   // yellow — getting warmer
  return '#BDBDBD'                      // gray — keep looking
}

export default function ScoreRing({ score, size = 120, animate = true }: Props) {
  const [displayed, setDisplayed] = useState(animate ? 0 : score)

  useEffect(() => {
    if (!animate) { setDisplayed(score); return }
    // Animate from 0 to score over ~600ms
    const start = performance.now()
    const duration = 600
    const frame = (now: number) => {
      const t = Math.min((now - start) / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplayed(eased * score)
      if (t < 1) requestAnimationFrame(frame)
    }
    requestAnimationFrame(frame)
  }, [score, animate])

  const radius = (size - 16) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - displayed)
  const color = getScoreColor(score)

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border)"
          strokeWidth="8"
        />
        {/* Filled arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: animate ? 'none' : undefined }}
        />
      </svg>
      {/* Center text */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <span style={{ fontSize: size * 0.22, fontWeight: 700, color, lineHeight: 1 }}>
          {Math.round(displayed * 100)}%
        </span>
        <span style={{ fontSize: size * 0.1, color: 'var(--fg-muted)', marginTop: 2 }}>
          match
        </span>
      </div>
    </div>
  )
}
