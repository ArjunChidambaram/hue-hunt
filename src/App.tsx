import { useRef, useState, type ChangeEvent } from 'react'
import { palette } from './lib/palette'
import { getTodayColor } from './lib/seed'
import { getTodayFind } from './lib/db'
import BottomNav from './components/BottomNav'
import HowToPlay from './components/HowToPlay'
import Today from './pages/Today'
import Streak from './pages/Streak'
import Camera from './pages/Camera'

type Tab = 'today' | 'streak'

const todayColor = getTodayColor(palette)

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [cameraFile, setCameraFile] = useState<File | null>(null)
  const [showHowToPlay, setShowHowToPlay] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [existingScore, setExistingScore] = useState<number | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Synchronous — must not await before .click() so we stay in the user gesture context
  const openCamera = () => {
    getTodayFind().then(find => setExistingScore(find?.matchScore ?? null))
    cameraInputRef.current?.click()
  }

  const handleCameraInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) setCameraFile(file)
  }

  const closeCamera = () => {
    setCameraFile(null)
    setRefreshKey(k => k + 1)
  }

  const showCamera = cameraFile !== null

  return (
    <>
      {/* Desktop gate — hidden on mobile via CSS, covers everything on wide screens */}
      <div className="desktop-gate">
        <div style={{
          width: 72, height: 72, borderRadius: 18,
          background: todayColor.hex,
          boxShadow: `0 8px 32px ${todayColor.hex}55`,
        }} />
        <div>
          <p style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Open on your phone 📱</p>
          <p style={{ color: 'var(--fg-muted)', fontSize: 16, maxWidth: 340, lineHeight: 1.6 }}>
            Hue Hunt is a mobile camera game — you need to go out and photograph today's colour in the real world.
          </p>
        </div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--fg-subtle)' }}>
          Scan the QR code or type the URL on your phone.
        </p>
      </div>

      {/* Hidden file input — triggered directly by Find It tap, stays in user-gesture context */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCameraInput}
        style={{ display: 'none' }}
      />

      {tab === 'today' && (
        <Today
          color={todayColor}
          onFindIt={openCamera}
          onHowToPlay={() => setShowHowToPlay(true)}
          refreshKey={refreshKey}
        />
      )}
      {tab === 'streak' && <Streak />}

      {!showCamera && (
        <BottomNav active={tab} onNavigate={setTab} />
      )}

      {showCamera && (
        <Camera
          color={todayColor}
          existingScore={existingScore}
          initialFile={cameraFile!}
          onDone={closeCamera}
        />
      )}

      <HowToPlay
        visible={showHowToPlay}
        todayColorName={todayColor.name}
        todayColorHex={todayColor.hex}
        onClose={() => setShowHowToPlay(false)}
      />
    </>
  )
}
