// Estimates the white point of an image and returns a correction offset.
// Samples 100 random pixels, finds the 20 brightest, computes how far they
// deviate from neutral gray, then applies a conservative 0.3× correction.
// This handles fluorescent yellow cast and shade blue cast without over-shooting.

export function estimateWhiteBalance(
  pixelData: Uint8Array,
  totalPixels: number
): { r: number; g: number; b: number } {
  const samples: [number, number, number, number][] = []

  for (let i = 0; i < 100; i++) {
    const idx = Math.floor(Math.random() * totalPixels) * 4
    const r = pixelData[idx]
    const g = pixelData[idx + 1]
    const b = pixelData[idx + 2]
    const lum = 0.299 * r + 0.587 * g + 0.114 * b
    samples.push([r, g, b, lum])
  }

  // Sort by luminance descending
  samples.sort((a, b) => b[3] - a[3])
  const bright = samples.slice(0, 20)

  const avgR = bright.reduce((s, p) => s + p[0], 0) / bright.length
  const avgG = bright.reduce((s, p) => s + p[1], 0) / bright.length
  const avgB = bright.reduce((s, p) => s + p[2], 0) / bright.length
  const avgAll = (avgR + avgG + avgB) / 3

  return {
    r: Math.round(avgAll - avgR) * 0.3,
    g: Math.round(avgAll - avgG) * 0.3,
    b: Math.round(avgAll - avgB) * 0.3,
  }
}
