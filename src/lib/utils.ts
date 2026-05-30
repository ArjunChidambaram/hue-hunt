// ─── Date helpers (all UTC) ───────────────────────────────

export function utcDateString(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function previousDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return utcDateString(d)
}

export function nextDay(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + 1)
  return utcDateString(d)
}

export function todayUTC(): string {
  return utcDateString(new Date())
}

// ─── Color math ───────────────────────────────────────────

export interface HSL { h: number; s: number; l: number }

export function rgbToHsl(r: number, g: number, b: number): HSL {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const l = (max + min) / 2
  let h = 0
  let s = 0

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case rn: h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6; break
      case gn: h = ((bn - rn) / d + 2) / 6; break
      case bn: h = ((rn - gn) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

// ─── Perceptual hash (8×8 average hash) ──────────────────
// Used to detect if user is submitting the same photo twice.

export function computePHash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): string {
  // Draw to 8×8 scratch canvas
  const scratch = document.createElement('canvas')
  scratch.width = 8
  scratch.height = 8
  const sCtx = scratch.getContext('2d')!
  sCtx.drawImage(ctx.canvas, 0, 0, width, height, 0, 0, 8, 8)
  const data = sCtx.getImageData(0, 0, 8, 8).data

  // Convert to grayscale values
  const gray: number[] = []
  for (let i = 0; i < 64; i++) {
    const idx = i * 4
    gray.push(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2])
  }

  // Average
  const avg = gray.reduce((a, b) => a + b, 0) / 64

  // Build hash string
  return gray.map(v => (v >= avg ? '1' : '0')).join('')
}

export function hammingDistance(a: string, b: string): number {
  let dist = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) dist++
  }
  return dist
}

// Same photo if hamming distance ≤ 10 out of 64 bits
export function isSamePhoto(hashA: string, hashB: string): boolean {
  return hammingDistance(hashA, hashB) <= 10
}
