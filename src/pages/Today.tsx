import { useEffect, useState } from 'react'
import { type Color } from '../lib/palette'
import { getTodayFind, getTodayPhotoBlob, getCurrentStreak, getAllFinds, type Find } from '../lib/db'
import { generateShareText, handleShare } from '../lib/share'
import Toast from '../components/Toast'

interface Props {
  color: Color
  onFindIt: () => void
  onHowToPlay: () => void
  refreshKey: number  // increment from parent to force refresh after camera session
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
        getTodayFind(),
        getAllFinds(),
        getTodayPhotoBlob(),
      ])

      setFind(todayFind ?? null)
      const { current } = getCurrentStreak(allFinds)
      setStreak(current)

      if (photoBlob) {
        photoObjectUrl = URL.createObjectURL(photoBlob)
        setPhotoUrl(photoObjectUrl)
      } else {
        setPhotoUrl(null)
      }

      setLoading(false)
    }

    load()

    return () => {
      if (photoObjectUrl) URL.revokeObjectURL(photoObjectUrl)
    }
  }, [refreshKey])

  const showToast = (message: string) => {
    setToast({ visible: true, message })
  }

  const onShare = async () => {
    if (!find) return
    const text = generateShareText(color, find.matchScore, streak, find.grid)
    await handleShare(text)
    showToast('Copied! 📋')
  }

  const pct = find ? Math.round(find.matchScore * 100) : 0
  const foundToday = !!find

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{
          width: 32, height: 32, border: '2.5px solid var(--border)',
          borderTopColor: 'var(--fg)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    )
  }

  return (
    <div className="page animate-fade-in">
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px 0',
      }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400,
          letterSpacing: '-0.02em',
        }}>
          Hue Hunt
        </span>
        <button
          onClick={onHowToPlay}
          aria-label="How to play"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--border)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 15, color: 'var(--fg-muted)',
            fontWeight: 600,
          }}
        >
          ?
        </button>
      </div>

      {/* Main content — centered */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '32px 24px 0',
        gap: 0,
      }}>

        {/* Streak badge */}
        <div style={{
          marginBottom: 24,
          fontWeight: 600, fontSize: 15, color: streak > 0 ? 'var(--fg)' : 'var(--fg-muted)',
        }}>
          {streak > 0 ? `🔥 Day ${streak}` : 'Start your streak!'}
        </div>

        {/* Swatch */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div style={{
            width: 210, height: 210, borderRadius: 28,
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
                <span style={{ fontSize: 56 }}>✓</span>
              </div>
            )}
          </div>

          {/* Pulsing ring when not yet found */}
          {!foundToday && (
            <div style={{
              position: 'absolute', inset: -6, borderRadius: 34,
              border: `2px solid ${color.hex}`,
              animation: 'pulse-ring 2s ease-in-out infinite',
              color: color.hex,
            }} />
          )}
        </div>

        {/* Color name */}
        <h1 style={{
          fontFamily: 'var(--font-serif)', fontWeight: 400,
          fontSize: '32px', letterSpacing: '-0.02em',
          textAlign: 'center', marginBottom: 6,
        }}>
          {color.name}
        </h1>

        {/* Hex */}
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: 13,
          color: 'var(--fg-muted)', marginBottom: 32,
          letterSpacing: '0.05em', textTransform: 'uppercase',
        }}>
          {color.hex}
        </p>

        {/* Found: best photo of the day, full-width */}
        {foundToday && find && (
          <div style={{ width: '100%', marginBottom: 24 }}>
            {photoUrl && (
              <div style={{ position: 'relative', borderRadius: 28, overflow: 'hidden', marginBottom: 10 }}>
                <img
                  src={photoUrl}
                  alt="Your best find today"
                  style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                />
                {/* Score badge */}
                <div style={{
                  position: 'absolute', bottom: 12, left: 12,
                  background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
                  color: '#fff', borderRadius: 'var(--radius-full)',
                  padding: '4px 12px', fontSize: 13, fontWeight: 600,
                }}>
                  {pct}% match
                </div>
              </div>
            )}
            {/* Share row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
              <p style={{ fontWeight: 500, fontSize: 14, color: 'var(--fg-muted)' }}>Today's best photo</p>
              <button
                onClick={onShare}
                style={{
                  padding: '7px 16px', background: 'var(--fg)', color: 'var(--bg)',
                  border: 'none', borderRadius: 'var(--radius-full)',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                Share
              </button>
            </div>
          </div>
        )}

        {/* Find It / Try Again button */}
        <div style={{ width: '100%' }}>
          <button onClick={onFindIt} className="btn-primary">
            {foundToday ? 'Try to Beat It' : 'Find It'}
          </button>
        </div>

        {/* Desktop note */}
        <p style={{
          marginTop: 24, fontSize: 13, color: 'var(--fg-subtle)',
          textAlign: 'center', display: 'none',  // hide on mobile; show via media query
        }} className="desktop-note">
          Best on your phone 📱
        </p>
      </div>

      <Toast
        message={toast.message}
        visible={toast.visible}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <style>{`
        @media (min-width: 768px) {
          .desktop-note { display: block !important; }
        }
      `}</style>
    </div>
  )
}
