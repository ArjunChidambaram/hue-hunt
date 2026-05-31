import { get, set, del, keys } from 'idb-keyval'
import { localDateString, todayLocal } from './utils'

// ─── Types ─────────────────────────────────────────────────

export interface Find {
  date: string          // "2026-06-15" local date — primary key
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

export async function saveFindIfBetter(find: Find): Promise<boolean> {
  const existing = await dbGet<Find>(`find:${find.date}`)
  if (!existing || find.matchScore > existing.matchScore) {
    await dbSet(`find:${find.date}`, find)
    return true   // new best — caller should also save the photo
  }
  return false
}

export async function getTodayFind(): Promise<Find | undefined> {
  return dbGet<Find>(`find:${todayLocal()}`)
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
  await dbSet('today-photo', { date: todayLocal(), blob: resized, pHash })
}

export async function getTodayPhoto(): Promise<TodayPhoto | null> {
  const entry = await dbGet<TodayPhoto>('today-photo')
  if (!entry || entry.date !== todayLocal()) {
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
  const today = todayLocal()

  // Current streak: walk backwards from today
  let current = 0
  let date = today
  while (dateSet.has(date)) {
    current++
    const [y, mo, d] = date.split('-').map(Number)
    date = localDateString(new Date(y, mo - 1, d - 1))
  }

  // Longest streak: scan sorted dates
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
