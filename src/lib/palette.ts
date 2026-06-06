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

// Map a color's hue to the closest available emoji square.
// Hue wheel: 0=red, 30=orange, 60=yellow, 120=green, 180=cyan, 240=blue, 270=violet, 300=magenta
export function getEmojiForColor(hsl: [number, number, number]): string {
  const [h, s, l] = hsl
  if (l < 15) return '⬛'
  if (s < 12) return l > 80 ? '⬜' : '⬛'
  if (h < 5 || h >= 340) return '🟥'   // true red / deep rose
  if (h < 30) return '🟫'              // warm red-brown: sienna, terracotta, rust
  if (h < 55) return '🟧'              // orange to amber
  if (h < 75) return '🟨'              // yellow to gold
  if (h < 155) return '🟩'             // green: lime through forest
  if (h < 250) return '🟦'             // cyan, teal, blue
  return '🟪'                          // blue-violet, purple, magenta, pink (h 250–339)
}
