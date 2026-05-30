import { get, set, del, keys } from 'idb-keyval'
import { utcDateString } from './utils'

// ─── Types ─────────────────────────────────────────────────

export interface Find {
  date: string          // "2026-06-15" UTC — primary key
  colorIndex: number
  colorName: string
  matchScore: number    // 0.0–1.0 best score for the day
  foundAt: string       // ISO timestamp of first find
  grid: boolean[][]     // 5×5 match grid for emoji share
  pHash: string         // perceptual hash of the submitted photo
}

export interface TodayPhoto {
  date: string
  blob: Blob
  pHash: string         // for duplicate detection
}

// ─── In-memory fallback (IndexedDB unavailable) ────────────

const memStore = new Map<string, unknown>()
let useMemory = false

async function dbGet<T>(key: string): Promise<T | undefined> {
  if (useMemory) return memStore.get(key) as T | undefined
  try {
    return await get<T>(key)
  } catch {
    useMemory = true
    return memStore.get(key) as T | undefined
  }
}

async function dbSet(key: string, value: unknown): Promise<void> {
  if (useMemory) { memStore.set(key, value); return }
  try {
    await set(key, value)
  } catch {
    useMemory = true
    memStore.set(key, value)
  }
}

async function dbDel(key: string): Promise<void> {
  if (useMemory) { memStore.delete(key); return }
  try {
    await del(key)
  } catch {
    useMemory = true
    memStore.delete(key)
  }
}

async function dbKeys(): Promise<string[]> {
  if (useMemory) return [...memStore.keys()]
  try {
    const k = await keys()
    return k.map(String)
  } catch {
    useMemory = true
    return [...memStore.keys()]
  }
}

// ─── Finds (permanent) ────────────────────────────────────

export async function saveFindIfBetter(find: Find): Promise<void> {
  const existing = await dbGet<Find>(`find:${find.date}`)
  if (!existing || find.matchScore > existing.matchScore) {
    await dbSet(`find:${find.date}`, find)
  }
}

export async function getTodayFind(): Promise<Find | undefined> {
  return dbGet<Find>(`find:${utcDateString(new Date())}`)
}

export async function getFindForDate(dateStr: string): Promise<Find | undefined> {
  return dbGet<Find>(`find:${dateStr}`)
}

export async function getAllFinds(): Promise<Find[]> {
  const allKeys = await dbKeys()
  const findKeys = allKeys.filter(k => k.startsWith('find:'))
  const results = await Promise.all(findKeys.map(k => dbGet<Find>(k)))
  return results.filter(Boolean) as Find[]
}

// ─── Today's photo (ephemeral — one image max) ─────────────

export async function saveTodayPhoto(blob: Blob, pHash: string): Promise<void> {
  // Resize blob before saving to keep storage minimal (~50–100 KB)
  const resized = await resizeBlobTo400(blob)
  await dbSet('today-photo', { date: utcDateString(new Date()), blob: resized, pHash })
}

export async function getTodayPhoto(): Promise<TodayPhoto | null> {
  const entry = await dbGet<TodayPhoto>('today-photo')
  if (!entry || entry.date !== utcDateString(new Date())) {
    await dbDel('today-photo')
    return null
  }
  return entry
}

export async function getTodayPhotoBlob(): Promise<Blob | null> {
  const entry = await getTodayPhoto()
  return entry?.blob ?? null
}

export async function getTodayPhotoHash(): Promise<string | null> {
  const entry = await getTodayPhoto()
  return entry?.pHash ?? null
}

// ─── Streak calculation ────────────────────────────────────

export function getCurrentStreak(finds: Find[]): { current: number; longest: number } {
  const dateSet = new Set(finds.map(f => f.date))
  const today = utcDateString(new Date())

  let current = 0
  let date = today
  while (dateSet.has(date)) {
    current++
    const d = new Date(date + 'T00:00:00Z')
    d.setUTCDate(d.getUTCDate() - 1)
    date = utcDateString(d)
  }

  // Longest streak: scan all finds sorted
  const sorted = [...dateSet].sort()
  let longest = 0
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z')
    const curr = new Date(sorted[i] + 'T00:00:00Z')
    const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    if (diffDays === 1) {
      run++
    } else {
      longest = Math.max(longest, run)
      run = 1
    }
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
      // Cover-fit: crop to square then scale
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400)
      canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.82)
    }
    img.onerror = () => resolve(blob) // fallback
    img.src = url
  })
}
