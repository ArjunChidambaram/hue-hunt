import { useEffect, useRef, useState, useCallback, type ChangeEvent } from 'react'
import { type Color } from '../lib/palette'
import { scoreImage, scoreImageGrid, checkBrightness } from '../lib/scorer'
import { saveFindIfBetter, saveTodayPhoto, getTodayPhotoHash, getAllFinds, getCurrentStreak, type Find } from '../lib/db'
import { computePHash, isSamePhoto, utcDateString } from '../lib/utils'
import { generateShareText, handleShare } from '../lib/share'
import ScoreRing from '../components/ScoreRing'
import Toast from '../components/Toast'

interface Props {
  color: Color
  existingScore: number | null
  initialFile: File
  onDone: () => void
}

type Screen =
  | { kind: 'processing' }
  | { kind: 'result'; score: number; objectUrl: string; brightness: 'too_dark' | 'too_bright' | null; grid: boolean[][] | null }

function getFeedback(score: number, brightness: 'too_dark' | 'too_bright' | null): { text: string; sub: string } {
  if (brightness === 'too_dark')   return { text: 'Too dark 🌑',      sub: 'Try in better lighting' }
  if (brightness === 'too_bright') return { text: 'Too bright ☀️',    sub: 'Try moving to shade' }
  if (score >= 0.6) return { text: 'Found it! 🎉',      sub: 'Great eye!' }
  if (score >= 0.4) return { text: 'Not bad!',           sub: 'Try again to get a better score' }
  if (score >= 0.2) return { text: 'Getting warmer 🌡️', sub: 'Try getting closer or better light' }
  return           { text: 'Keep looking 👀',            sub: "That color isn't quite right" }
}

const ACCEPT_THRESHOLD = 0.1

export default function Camera({ color, existingScore, initialFile, onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [screen, setScreen] = useState<Screen>({ kind: 'processing' })
  const [toast, setToast] = useState({ visible: false, message: '' })
  const processed = useRef(false)

  const processFile = useCallback(async (file: File) => {
    setScreen({ kind: 'processing' })
    const objectUrl = URL.createObjectURL(file)

    try {
      const img = await loadImage(objectUrl)
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 200
      const ctx = canvas.getContext('2d')!

      const size = Math.min(img.naturalWidth, img.naturalHeight)
      const sx = (img.naturalWidth - size) / 2
      const sy = (img.naturalHeight - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200)

      const imageData = ctx.getImageData(0, 0, 200, 200)
      const pixelData = new Uint8Array(imageData.data.buffer)

      const pHash = computePHash(ctx, 200, 200)
      const storedHash = await getTodayPhotoHash()
      if (storedHash && isSamePhoto(pHash, storedHash)) {
        URL.revokeObjectURL(objectUrl)
        alert("That's the same photo! Get outside and find a new one 📸")
        setTimeout(() => inputRef.current?.click(), 100)
        return
      }

      const brightness = checkBrightness(pixelData, 200 * 200)
      const target = { h: color.hsl[0], s: color.hsl[1], l: color.hsl[2] }
      const score = scoreImage(pixelData, 200, 200, target, color.category)

      let grid: boolean[][] | null = null
      if (score >= ACCEPT_THRESHOLD && brightness === null) {
        grid = scoreImageGrid(pixelData, 200, 200, target, color.category)
        const find: Find = {
          date: utcDateString(new Date()),
          colorIndex: color.index,
          colorName: color.name,
          matchScore: score,
          foundAt: new Date().toISOString(),
          grid,
          pHash,
        }
        const isNewBestFind = await saveFindIfBetter(find)
        if (isNewBestFind) await saveTodayPhoto(file, pHash)
      }

      setScreen({ kind: 'result', score, objectUrl, brightness, grid })
    } catch (err) {
      console.error('Scoring error:', err)
      URL.revokeObjectURL(objectUrl)
      onDone()
    }
  }, [color, onDone])

  useEffect(() => {
    if (processed.current) return
    processed.current = true
    processFile(initialFile)
  }, [initialFile, processFile])

  const handleRetry = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    processFile(file)
  }, [processFile])

  const triggerCamera = useCallback(() => inputRef.current?.click(), [])

  const onShare = useCallback(async () => {
    if (screen.kind !== 'result' || !screen.grid) return
    const allFinds = await getAllFinds()
    const { current: streak } = getCurrentStreak(allFinds)
    const text = generateShareText(color, screen.score, streak, screen.grid)
    const result = await handleShare(text)
    setToast({ visible: true, message: result === 'shared' ? 'Shared! 🎉' : 'Copied! 📋' })
  }, [screen, color])

  // ── Processing spinner
  if (screen.kind === 'processing') {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16, zIndex: 150,
      }}>
        <input ref={inputRef} type="file" accept="image/*" capture="environment"
          onChange={handleRetry} style={{ display: 'none' }} />
        <div style={{
          width: 40, height: 40, border: '3px solid var(--border)',
          borderTopColor: 'var(--fg)', borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--fg-muted)', fontSize: 15 }}>Checking the color…</p>
      </div>
    )
  }

  // ── Result screen
  const { score, objectUrl, brightness, grid } = screen
  const passed = score >= ACCEPT_THRESHOLD && brightness === null
  const { text: feedbackText, sub: feedbackSub } = getFeedback(score, brightness)
  const isNewBest = existingScore !== null && score > existingScore

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', flexDirection: 'column', zIndex: 150,
      overflowY: 'auto',
    }}>
      <input ref={inputRef} type="file" accept="image/*" capture="environment"
        onChange={handleRetry} style={{ display: 'none' }} />

      {/* Close */}
      <button onClick={onDone} style={{
        position: 'absolute', top: 16, right: 16,
        width: 36, height: 36, borderRadius: '50%',
        background: 'var(--icon-tint)', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        border: 'none', cursor: 'pointer', zIndex: 10, fontSize: 18,
        color: 'var(--fg)',
      }}>✕</button>

      {/* Photo */}
      <div style={{ flex: '0 0 50vw', maxHeight: '50vw', overflow: 'hidden' }}>
        <img src={objectUrl} alt="Your photo"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>

      {/* Results */}
      <div style={{ flex: 1, padding: '24px 24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {passed ? (
          /* ── Accepted: big tick in the day's color */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%',
              background: color.hex,
              boxShadow: `0 6px 24px ${color.hex}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <path d="M10 25 L20 35 L38 14" stroke="white" strokeWidth="4.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 400 }}>
              {color.name}
            </p>
            {isNewBest && (
              <p style={{ color: '#4CAF50', fontSize: 13, fontWeight: 500 }}>New best score! ⬆️</p>
            )}
          </div>
        ) : (
          /* ── Rejected: show score ring so they know how far off they are */
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
              <ScoreRing score={score} size={110} animate />
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 16,
                  background: color.hex, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }} />
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: 14, color: 'var(--fg-muted)' }}>
                  {color.name}
                </span>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 600, marginBottom: 6 }}>{feedbackText}</p>
              <p style={{ color: 'var(--fg-muted)', fontSize: 15 }}>{feedbackSub}</p>
            </div>
          </>
        )}

        {/* Buttons */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {passed ? (
            <button onClick={onDone} className="btn-primary">Done ✓</button>
          ) : (
            <button onClick={triggerCamera} className="btn-primary">Try Again</button>
          )}

          {/* Share — shown when score is accepted */}
          {passed && grid && (
            <button onClick={onShare} className="btn-secondary">
              Share result
            </button>
          )}

          {passed && (
            <button onClick={triggerCamera} style={{
              display: 'block', width: '100%',
              padding: '10px', background: 'none', border: 'none',
              color: 'var(--fg-muted)', fontSize: 14, cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: 'var(--border)',
            }}>
              Try again for a better score
            </button>
          )}
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}
