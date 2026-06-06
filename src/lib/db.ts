import { get, set, del } from 'idb-keyval'
import { localDateString, todayLocal } from './utils'

// ─── Types ─────────────────────────────────────────────────

export interface Find {
  date: string          // "2026-06-15" local date
  colorIndex: number
  colorName: string
  matchScore: number    // 0.0–1.0 best score for the day
  foundAt: string       // ISO timestamp of first find
  grid: boolean[][]     // 5×5 match grid
  pHash: string         // perceptual hash of the best photo
}

export interface TodayPhoto {
  date: string
  blob: Blob
  pHash: string
}

// ─── Find records → localStorage ──────────────────────────
//
// Finds are small JSON objects (≈200 bytes each, ≈70 KB/year).
// localStorage is synchronous and universally reliable — it never
// silently falls back to an in-memory store that evaporates on restart.
// IndexedDB was silently failing and losing data between sessions.

const FIND_PREFIX = 'hh:find:'

function readFind(dateStr: string): Find | undefined {
  try {
    const raw = localStorage.getItem(FIND_PREFIX + dateStr)
    return raw ? (JSON.parse(raw) as Find) : undefined
  } catch {
    return undefined
  }
}

export async function saveFindIfBetter(find: Find): Promise<boolean> {
  const existing = readFind(find.date)
  if (!existing || find.matchScore > existing.matchScore) {
    try {
      localStorage.setItem(FIND_PREFIX + find.date, JSON.stringify(find))
    } catch (e) {
      console.error('localStorage write failed:', e)
      return false
    }
    return true
  }
  return false
}

export async function getTodayFind(): Promise<Find | undefined> {
  return readFind(todayLocal())
}

export async function getFindForDate(dateStr: string): Promise<Find | undefined> {
  return readFind(dateStr)
}

export async function getAllFinds(): Promise<Find[]> {
  const finds: Find[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(FIND_PREFIX)) {
      try {
        const raw = localStorage.getItem(key)
        if (raw) finds.push(JSON.parse(raw) as Find)
      } catch {}
    }
  }
  return finds
}

// ─── Today's photo → idb-keyval ───────────────────────────
//
// Blobs can't go in localStorage, so the photo stays in IndexedDB.
// The photo is non-critical — it only drives the Today thumbnail.
// All failures are caught and ignored so a photo error never
// breaks the streak or the result screen.

export async function saveTodayPhoto(blob: Blob, pHash: string): Promise<void> {
  try {
    const resized = await resizeBlobTo400(blob)
    await set('hh:today-photo', { date: todayLocal(), blob: resized, pHash })
  } catch (err) {
    console.warn('Photo save failed (thumbnail will be missing):', err)
  }
}

export async function getTodayPhoto(): Promise<TodayPhoto | null> {
  try {
    const entry = await get<TodayPhoto>('hh:today-photo')
    if (!entry || entry.date !== todayLocal()) {
      del('hh:today-photo').catch(() => {})
      return null
    }
    return entry
  } catch {
    return null
  }
}

export async function getTodayPhotoBlob(): Promise<Blob | null> {
  return (await getTodayPhoto())?.blob ?? null
}

export async function getTodayPhotoHash(): Promise<string | null> {
  // Prefer the pHash stored in the Find record (localStorage, reliable).
  // Fall back to the photo entry in IndexedDB.
  const find = readFind(todayLocal())
  if (find?.pHash) return find.pHash
  return (await getTodayPhoto())?.pHash ?? null
}

// ─── Streak calculation ────────────────────────────────────

export function getCurrentStreak(finds: Find[]): { current: number; longest: number } {
  const dateSet = new Set(finds.map(f => f.date))
  const today = todayLocal()

  let current = 0
  let date = today
  while (dateSet.has(date)) {
    current++
    const [y, mo, d] = date.split('-').map(Number)
    date = localDateString(new Date(y, mo - 1, d - 1))
  }

  const sorted = [...dateSet].sort()
  let longest = 0
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const [py, pmo, pd] = sorted[i - 1].split('-').map(Number)
    const [cy, cmo, cd] = sorted[i].split('-').map(Number)
    const prev = new Date(py, pmo - 1, pd)
    const curr = new Date(cy, cmo - 1, cd)
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    run = diffDays === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }
  if (sorted.length > 0) longest = Math.max(longest, run)

  return { current, longest }
}

// ─── Helpers ──────────────────────────────────────────────

async function resizeBlobTo400(blob: Blob): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = 400
      canvas.height = 400
      const ctx = canvas.getContext('2d')!
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)
      canvas.toBlob((b) => resolve(b ?? blob), 'image/jpeg', 0.82)
    }
    img.onerror = () => resolve(blob)
    img.src = url
  })
}
