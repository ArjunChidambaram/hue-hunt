import { type Color, getEmojiForColor } from './palette'

// Generates a PNG card with the match grid at full resolution for sharing as an image file.
// Returns null if canvas is unavailable (SSR or unusual browser).
export async function generateShareImage(
  color: Color,
  score: number,
  streak: number,
  grid: boolean[][]
): Promise<Blob | null> {
  try {
    const CELL = 56, GAP = 6
    const gridPx = 5 * CELL + 4 * GAP  // 304px
    const W = gridPx + 48               // 352px (24px padding each side)
    const headerH = 152
    const footerH = 52
    const H = headerH + gridPx + footerH

    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Background
    ctx.fillStyle = '#FAFAF8'
    ctx.fillRect(0, 0, W, H)

    // Color swatch (rounded square)
    const swatchSize = 64, swatchR = 14
    const swatchX = (W - swatchSize) / 2, swatchY = 24
    ctx.beginPath()
    ctx.moveTo(swatchX + swatchR, swatchY)
    ctx.arcTo(swatchX + swatchSize, swatchY, swatchX + swatchSize, swatchY + swatchR, swatchR)
    ctx.arcTo(swatchX + swatchSize, swatchY + swatchSize, swatchX + swatchSize - swatchR, swatchY + swatchSize, swatchR)
    ctx.arcTo(swatchX, swatchY + swatchSize, swatchX, swatchY + swatchSize - swatchR, swatchR)
    ctx.arcTo(swatchX, swatchY, swatchX + swatchR, swatchY, swatchR)
    ctx.closePath()
    ctx.fillStyle = color.hex
    ctx.fill()

    // Color name
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#1A1A1A'
    ctx.font = '400 18px Georgia, serif'
    ctx.fillText(color.name, W / 2, swatchY + swatchSize + 26)

    // Score
    const pct = Math.round(score * 100)
    const scoreColor = pct >= 60 ? '#4CAF50' : pct >= 40 ? '#FF9800' : pct >= 20 ? '#FFC107' : '#BDBDBD'
    ctx.font = '700 28px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = scoreColor
    ctx.fillText(`${pct}%`, W / 2, swatchY + swatchSize + 56)
    ctx.font = '400 12px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#888'
    ctx.fillText('match', W / 2, swatchY + swatchSize + 74)

    // Grid
    const gridX = 24, gridY = headerH
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const x = gridX + col * (CELL + GAP)
        const y = gridY + row * (CELL + GAP)
        const matched = grid[row][col]
        const r = 8
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.arcTo(x + CELL, y, x + CELL, y + r, r)
        ctx.arcTo(x + CELL, y + CELL, x + CELL - r, y + CELL, r)
        ctx.arcTo(x, y + CELL, x, y + CELL - r, r)
        ctx.arcTo(x, y, x + r, y, r)
        ctx.closePath()
        ctx.fillStyle = matched ? color.hex : '#E0E0E0'
        ctx.fill()
      }
    }

    // Footer
    const footerY = headerH + gridPx + 18
    ctx.textAlign = 'center'
    ctx.textBaseline = 'alphabetic'
    if (streak > 0) {
      ctx.font = '600 14px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = '#555'
      ctx.fillText(`🔥 ${streak} day streak`, W / 2, footerY)
    }
    ctx.font = '400 11px system-ui, -apple-system, sans-serif'
    ctx.fillStyle = '#AAA'
    ctx.fillText('arjunchidambaram.github.io/hue-hunt', W / 2, footerY + (streak > 0 ? 20 : 0))

    return new Promise(resolve => canvas.toBlob(b => resolve(b), 'image/png'))
  } catch {
    return null
  }
}

export function generateShareText(
  color: Color,
  matchScore: number,
  streak: number,
  gridData: boolean[][]
): string {
  const emoji = getEmojiForColor(color.hsl)
  const grid = gridData
    .map(row => row.map(cell => (cell ? emoji : '⬜')).join(''))
    .join('\n')

  return [
    '🎨 Hue Hunt',
    '',
    `${emoji} ${color.name}`,
    '',
    `🔥 Day ${streak}`,
    `🎯 ${Math.round(matchScore * 100)}%`,
    '',
    grid,
    '',
    'arjunchidambaram.github.io/hue-hunt',
  ].join('\n')
}

// Copy using execCommand (works over HTTP/LAN, iOS, all browsers).
// Falls back to the modern Clipboard API on HTTPS if execCommand is unavailable.
function copyTextSync(text: string): boolean {
  // execCommand path — synchronous, works in user-gesture context on all platforms
  try {
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;opacity:0;pointer-events:none'
    document.body.appendChild(el)
    el.focus()
    el.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(el)
    if (ok) return true
  } catch {}

  // Modern Clipboard API — only works on HTTPS
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {})
    return true
  }

  return false
}

export async function handleShare(text: string): Promise<'shared' | 'copied' | 'failed'> {
  // Copy to clipboard first (synchronous execCommand, stays in user-gesture context)
  const copied = copyTextSync(text)

  // Try native share sheet (opens Messages, WhatsApp, etc.)
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (err) {
      // AbortError = user dismissed the sheet; clipboard already copied
      if (err instanceof Error && err.name !== 'AbortError') {
        console.warn('Share failed:', err)
      }
    }
  }

  return copied ? 'copied' : 'failed'
}
