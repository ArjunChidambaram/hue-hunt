import { rgbToHsl, clamp, type HSL } from './utils'
import { estimateWhiteBalance } from './white-balance'

interface Tolerance { hue: number; sat: number; light: number }

const TOLERANCES: Record<string, Tolerance> = {
  warm:    { hue: 15, sat: 25, light: 30 },
  cool:    { hue: 20, sat: 25, light: 25 },
  neutral: { hue: 30, sat: 15, light: 20 },
}

// Returns 0.0–1.0 match score for the whole image
export function scoreImage(
  pixelData: Uint8Array,
  width: number,
  height: number,
  target: HSL,
  category: 'warm' | 'cool' | 'neutral'
): number {
  const tolerance = TOLERANCES[category]
  const sampleCount = 500
  const totalPixels = width * height
  let matches = 0

  // Skip white-balance correction for chromatic targets — the "cast" is the signal.
  const satTolerance = Math.max(tolerance.sat, target.s * 0.5)
  const useWB = target.s < 40
  const correction = useWB
    ? estimateWhiteBalance(pixelData, totalPixels)
    : { r: 0, g: 0, b: 0 }

  for (let i = 0; i < sampleCount; i++) {
    const idx = Math.floor(Math.random() * totalPixels) * 4
    const r = clamp(pixelData[idx]     + correction.r, 0, 255)
    const g = clamp(pixelData[idx + 1] + correction.g, 0, 255)
    const b = clamp(pixelData[idx + 2] + correction.b, 0, 255)

    const hsl = rgbToHsl(r, g, b)
    const hueDiff = Math.min(
      Math.abs(hsl.h - target.h),
      360 - Math.abs(hsl.h - target.h)
    )

    if (
      hueDiff <= tolerance.hue &&
      Math.abs(hsl.s - target.s) <= satTolerance &&
      Math.abs(hsl.l - target.l) <= tolerance.light
    ) {
      matches++
    }
  }

  return matches / sampleCount
}

// Returns 5×5 boolean grid — true = that region matched the target color
export function scoreImageGrid(
  pixelData: Uint8Array,
  width: number,
  height: number,
  target: HSL,
  category: 'warm' | 'cool' | 'neutral',
  cellThreshold = 0.15
): boolean[][] {
  const tolerance = TOLERANCES[category]
  const satTolerance = Math.max(tolerance.sat, target.s * 0.5)
  const useWB = target.s < 40
  const correction = useWB
    ? estimateWhiteBalance(pixelData, width * height)
    : { r: 0, g: 0, b: 0 }
  const grid: boolean[][] = []

  for (let row = 0; row < 5; row++) {
    grid[row] = []
    for (let col = 0; col < 5; col++) {
      const x0 = Math.floor((col / 5) * width)
      const x1 = Math.floor(((col + 1) / 5) * width)
      const y0 = Math.floor((row / 5) * height)
      const y1 = Math.floor(((row + 1) / 5) * height)

      let matches = 0
      const samples = 20
      for (let s = 0; s < samples; s++) {
        const px = x0 + Math.floor(Math.random() * (x1 - x0))
        const py = y0 + Math.floor(Math.random() * (y1 - y0))
        const idx = (py * width + px) * 4
        const r = clamp(pixelData[idx]     + correction.r, 0, 255)
        const g = clamp(pixelData[idx + 1] + correction.g, 0, 255)
        const b = clamp(pixelData[idx + 2] + correction.b, 0, 255)

        const hsl = rgbToHsl(r, g, b)
        const hueDiff = Math.min(
          Math.abs(hsl.h - target.h),
          360 - Math.abs(hsl.h - target.h)
        )
        if (
          hueDiff <= tolerance.hue &&
          Math.abs(hsl.s - target.s) <= satTolerance &&
          Math.abs(hsl.l - target.l) <= tolerance.light
        ) matches++
      }
      grid[row][col] = (matches / samples) >= cellThreshold
    }
  }

  return grid
}

// Checks image brightness — returns a warning string or null
export function checkBrightness(
  pixelData: Uint8Array,
  totalPixels: number
): 'too_dark' | 'too_bright' | null {
  let sum = 0
  const samples = 100
  for (let i = 0; i < samples; i++) {
    const idx = Math.floor(Math.random() * totalPixels) * 4
    const lum = 0.299 * pixelData[idx] + 0.587 * pixelData[idx + 1] + 0.114 * pixelData[idx + 2]
    sum += lum
  }
  const avg = sum / samples
  if (avg < 38) return 'too_dark'     // < 15% brightness
  if (avg > 242) return 'too_bright'  // > 95% brightness
  return null
}
