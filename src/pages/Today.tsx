import { useEffect, useState } from 'react'
import { type Color } from '../lib/palette'
import { getTodayFind, getTodayPhotoBlob, getCurrentStreak, getAllFinds, type Find } from '../lib/db'
import { generateShareText, handleShare } from '../lib/share'
import Toast from '../components/Toast'

interface Props {
  color: Color
  onFindIt: () => void
  onHowToPlay: () => void
  refreshKey: number
}

export default function Today({ color, onFindIt, onHowToPlay, refreshKey }: Props) {
  const [find, setFind] = useState<Find | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '' })

  useEffect(() => {
    let photoObjectUrl: string | null = null
    async function load() {
      setLoading(true)
      const [todayFind, allFinds, photoBlob] = await Promise.all([
        getTodayFind(), getAllFinds(), getTodayPhotoBlob(),
      ])
      setFind(todayFind ?? null)
      setStreak(getCurrentStreak(allFinds).current)
      if (photoBlob) {
        photoObjectUrl = URL.createObjectURL(photoBlob)
        setPhotoUrl(photoObjectUrl)
      } else {
        setPhotoUrl(null)
      }
      setLoading(false)
    }
    load()
    return () => { if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl) }
  }, [refreshKey])

  const onShare = async () => {
    if (!find) return
    const text = generateShareText(color, find.matchScore, streak, find.grid)
    await handleShare(text)
    setToast({ visible: true, message: 'Copied! 📋' })
  }

  const pct = find ? Math.round(find.matchScore * 100) : 0
  const foundToday = !!find

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          width: 32, height: 32, border: '2.5px solid var(--border)',
          borderTopColor: 'var(--fg)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div className="page animate-fade-in" style={{ overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px 0',
      }}>
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400, letterSpacing: '-0.02em' }}>
          Hue Hunt
        </span>
        <button onClick={onHowToPlay} aria-label="How to play" style={{
          width: 32, height: 32, borderRadius: '50%', background: 'var(--border)',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', fontSize: 15, color: 'var(--fg-muted)', fontWeight: 600,
        }}>?</button>
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 24px 0' }}>

        {/* Streak badge */}
        <div style={{ marginBottom: 14, fontWeight: 600, fontSize: 15, color: streak > 0 ? 'var(--fg)' : 'var(--fg-muted)' }}>
          {streak > 0 ? `🔥 Day ${streak}` : 'Start your streak!'}
        </div>

        {/* Swatch */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{
            width: 190, height: 190, borderRadius: 26,
            background: color.hex,
            boxShadow: `0 8px 40px ${color.hex}55, 0 2px 12px rgba(0,0,0,0.08)`,
            position: 'relative', overflow: 'hidden',
          }}>
            {foundToday && (
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.15)',
              }}>
                <span style={{ fontSize: 52 }}>✓</span>
              </div>
            )}
          </div>
          {!foundToday && (
            <div style={{
              position: 'absolute', inset: -6, borderRadius: 32,
              border: `2px solid ${color.hex}`,
              animation: 'pulse-ring 2s ease-in-out infinite',
              color: color.hex,
            }} />
          )}
        </div>

        {/* Color name */}
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: '28px',
          letterSpacing: '-0.02em', textAlign: 'center', marginBottom: 4,
        }}>
          {color.name}
        </h1>

        {/* Hex */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 12,
          color: 'var(--fg-muted)', marginBottom: 20,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {color.hex}
        </p>

        {/* Found: compact photo card with share button inline */}
        {foundToday && find && (
          <div style={{
            width: '100%', marginBottom: 14,
            display: 'flex', alignItems: 'center', gap: 12,
            background: 'var(--border)', borderRadius: 16, padding: '10px 12px',
          }}>
            {photoUrl && (
              <img src={photoUrl} alt="Your best find today" style={{
                width: 68, height: 68, borderRadius: 10,
                objectFit: 'cover', flexShrink: 0,
              }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Today's best</p>
              <p style={{ color: 'var(--fg-muted)', fontSize: 13 }}>{pct}% match</p>
            </div>
            <button onClick={onShare} style={{
              padding: '8px 16px', background: 'var(--fg)', color: 'var(--bg)',
              border: 'none', borderRadius: 'var(--radius-full)',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
            }}>Share</button>
          </div>
        )}

        {/* Find It / Try Again button */}
        <div style={{ width: '100%' }}>
          <button onClick={onFindIt} className="btn-primary">
            {foundToday ? 'Try to Beat It' : 'Find It'}
          </button>
        </div>
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />
    </div>
  )
}
