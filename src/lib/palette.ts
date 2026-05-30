import paletteData from '../assets/palette.json'

export interface Color {
  index: number
  name: string
  hex: string
  hsl: [number, number, number]  // [h, s, l]
  category: 'warm' | 'cool' | 'neutral'
}

// Validate and export the palette
export const palette: Color[] = paletteData as Color[]

if (palette.length !== 365) {
  console.warn(`Palette has ${palette.length} colors, expected 365`)
}

export function getColorByIndex(index: number): Color {
  return palette[index % palette.length]
}

// Map a color's hue to the closest available emoji square
export function getEmojiForColor(hsl: [number, number, number]): string {
  const [h, s, l] = hsl
  if (l < 15) return '⬛'
  if (s < 12) return l > 80 ? '⬜' : '⬛'
  if (h < 15 || h >= 345) return '🟥'
  if (h < 45) return '🟧'
  if (h < 65) return '🟨'
  if (h < 160) return '🟩'
  if (h < 250) return '🟦'
  if (h < 285) return '🟪'
  if (h < 345) return '🟫'
  return '🟥'
}
