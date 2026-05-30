import { useEffect, useState } from 'react'

interface Props {
  message: string
  visible: boolean
  onHide: () => void
  duration?: number
}

export default function Toast({ message, visible, onHide, duration = 2000 }: Props) {
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    if (!visible) { setOpacity(0); return }
    setOpacity(1)
    const t = setTimeout(() => {
      setOpacity(0)
      setTimeout(onHide, 300)
    }, duration)
    return () => clearTimeout(t)
  }, [visible, duration, onHide])

  if (!visible && opacity === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 26, 0.9)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: 'var(--radius-full)',
        fontSize: '14px',
        fontWeight: 500,
        whiteSpace: 'nowrap',
        opacity,
        transition: 'opacity 0.3s',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      {message}
    </div>
  )
}
