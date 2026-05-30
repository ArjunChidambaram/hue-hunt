/// <reference types="vite/client" />
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
  // Show on first ever visit; localStorage flag persists across refreshes
  const [showHowToPlay, setShowHowToPlay] = useState(
    () => !localStorage.getItem('howToPlaySeen')
  )

  const closeHowToPlay = () => {
    localStorage.setItem('howToPlaySeen', '1')
    setShowHowToPlay(false)
  }
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
          width: 64, height: 64, borderRadius: 16,
          background: todayColor.hex,
          boxShadow: `0 8px 32px ${todayColor.hex}55`,
        }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>Open on your phone 📱</p>
          <p style={{ color: 'var(--fg-muted)', fontSize: 15, maxWidth: 320, lineHeight: 1.6 }}>
            Hue Hunt is a mobile camera game — go find today's colour in the real world and photograph it.
          </p>
        </div>
        {/* QR code pointing to the live site */}
        <img
          src={`${import.meta.env.BASE_URL}qr.png`}
          alt="QR code to open Hue Hunt on your phone"
          style={{ width: 180, height: 180, borderRadius: 16, imageRendering: 'pixelated' }}
        />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--fg-muted)' }}>
          arjunchidambaram.github.io/hue-hunt
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
          onHowToPlay={() => setShowHowToPlay(true)}  // ? button always works
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
        onClose={closeHowToPlay}
      />
    </>
  )
}
