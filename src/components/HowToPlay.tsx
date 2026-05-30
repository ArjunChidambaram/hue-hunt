interface Props {
  visible: boolean
  todayColorName: string
  todayColorHex: string
  onClose: () => void
}

export default function HowToPlay({ visible, todayColorName, todayColorHex, onClose }: Props) {
  if (!visible) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 300,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '0 0 env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg)',
          borderRadius: '20px 20px 0 0',
          padding: '28px 24px 32px',
          width: '100%',
          maxWidth: 480,
          animation: 'fadeIn 0.25s ease-out both',
        }}
      >
        {/* Handle */}
        <div style={{
          width: 40, height: 4, background: 'var(--border)',
          borderRadius: 4, margin: '0 auto 24px',
        }} />

        <h2 style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
          fontSize: '26px',
          marginBottom: '20px',
          textAlign: 'center',
        }}>
          How to Play
        </h2>

        <ol style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            {
              icon: '🎨',
              title: 'See the color',
              desc: `Everyone gets the same color today — ${todayColorName}.`,
            },
            {
              icon: '👀',
              title: 'Go find it',
              desc: 'Head outside. Look for that color in the real world.',
            },
            {
              icon: '📸',
              title: 'Snap a photo',
              desc: 'Tap "Find It" and take a photo of what you found.',
            },
            {
              icon: '🎯',
              title: 'See your score',
              desc: 'The app checks how well the colors match. > 60% = Found it!',
            },
            {
              icon: '🔥',
              title: 'Build your streak',
              desc: 'Find the color every day to keep your streak alive.',
            },
          ].map(({ icon, title, desc }) => (
            <li key={title} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 22, lineHeight: 1.3, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>
                <div style={{ color: 'var(--fg-muted)', fontSize: 14, lineHeight: 1.5 }}>{desc}</div>
              </div>
            </li>
          ))}
        </ol>

        {/* Mini color preview */}
        <div style={{
          marginTop: 24,
          padding: '12px 16px',
          background: 'var(--border)',
          borderRadius: 'var(--radius)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: todayColorHex, flexShrink: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          }} />
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16 }}>{todayColorName}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', marginTop: 2 }}>
              {todayColorHex}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: 20,
            width: '100%',
            padding: '16px',
            background: 'var(--fg)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Got it!
        </button>
      </div>
    </div>
  )
}
