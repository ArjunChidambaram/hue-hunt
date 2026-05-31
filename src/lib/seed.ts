import { type Color } from './palette'

// All users worldwide see the same color on the same UTC date.
// In 2026, colors appear in palette order (index 0–364).
// In other years, the palette is shuffled using the year as seed,
// so colors don't repeat in the same order year over year.

export function getTodayColor(palette: Color[]): Color {
  const now = new Date()
  const year = now.getFullYear()           // local year
  const start = new Date(year, 0, 0)       // local Dec 31 of prev year
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))

  const baseYear = 2026
  const yearOffset = year - baseYear

  if (yearOffset === 0) {
    return palette[dayOfYear % 365]
  }

  return fisherYatesShuffle([...palette], year)[dayOfYear % 365]
}

function fisherYatesShuffle(arr: Color[], seed: number): Color[] {
  let t = seed + 0x6D2B79F5
  const rng = () => {
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Get the color for any given UTC date string "YYYY-MM-DD"
export function getColorForDate(palette: Color[], dateStr: string): Color {
  const date = new Date(dateStr + 'T00:00:00Z')
  const year = date.getUTCFullYear()
  const start = new Date(Date.UTC(year, 0, 0))
  const diff = date.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))

  const baseYear = 2026
  if (year === baseYear) {
    return palette[dayOfYear % 365]
  }
  return fisherYatesShuffle([...palette], year)[dayOfYear % 365]
}
