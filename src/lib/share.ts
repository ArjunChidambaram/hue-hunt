import { type Color, getEmojiForColor } from './palette'

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
    '🎨 Color of the Day',
    '',
    `${emoji} ${color.name}`,
    '',
    `🔥 Day ${streak}`,
    `🎯 ${Math.round(matchScore * 100)}%`,
    '',
    grid,
    '',
    'coloroftheday.app',
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
