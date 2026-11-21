import { useEffect, useState, useSyncExternalStore } from 'react'
import type { Analysis, Sex } from './metrics'

export interface Profile {
  name: string
  sex: Sex
  age: number
  goals: string[]
  skin: 'normal' | 'oily' | 'dry' | 'combo' | 'sensitive'
  acne: boolean
  beard: boolean
  glasses: boolean
  heightCm?: number
  weightKg?: number
  bodyFat?: number
  onboarded: boolean
}

export interface ProgressEntry {
  id: string
  date: number
  thumb: string // маленький jpeg dataURL
  analysis: Analysis
}

export interface BodyEntry { date: number; weightKg?: number; waistCm?: number; sleepH?: number }

export interface ChatMsg { role: 'user' | 'assistant'; content: string; image?: string }

export interface AppState {
  profile: Profile
  xp: number
  // дата YYYY-MM-DD → id выполненных задач
  done: Record<string, string[]>
  lessonsDone: string[]
  quizScores: Record<string, number>
  progress: ProgressEntry[]
  body: BodyEntry[]
  drills: Record<string, number> // лучший результат упражнений тренажёра
  chat: ChatMsg[]
  settings: { openrouterKey: string; model: string }
}

const KEY = 'luxmasing-state-v1'

const initial: AppState = {
  profile: { name: '', sex: 'male', age: 20, goals: [], skin: 'normal', acne: false, beard: false, glasses: false, onboarded: false },
  xp: 0,
  done: {},
  lessonsDone: [],
  quizScores: {},
  progress: [],
  body: [],
  drills: {},
  chat: [],
  settings: { openrouterKey: '', model: 'google/gemini-2.5-flash' },
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initial
    const s = JSON.parse(raw)
    return { ...initial, ...s, profile: { ...initial.profile, ...s.profile }, settings: { ...initial.settings, ...s.settings } }
  } catch {
    return initial
  }
}

let state: AppState = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Переполнение хранилища: удаляем самые старые фото прогресса
    if (state.progress.length > 1) {
      state = { ...state, progress: state.progress.slice(1) }
      persist()
    }
  }
}

export function setState(fn: (s: AppState) => AppState) {
  state = fn(state)
  persist()
  listeners.forEach((l) => l())
}

export function getState() { return state }

export function useStore<T>(sel: (s: AppState) => T): T {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => sel(state),
  )
}

export function resetAll() {
  state = initial
  persist()
  listeners.forEach((l) => l())
}

export function exportData(): string { return JSON.stringify(state) }
export function importData(json: string) {
  const s = JSON.parse(json)
  setState(() => ({ ...initial, ...s }))
}

// ——— XP и уровни ———
export const LEVELS = [
  { xp: 0, name: 'Новичок' },
  { xp: 150, name: 'Ученик' },
  { xp: 400, name: 'Практик' },
  { xp: 800, name: 'Дисциплина' },
  { xp: 1400, name: 'Продвинутый' },
  { xp: 2200, name: 'Эксперт' },
  { xp: 3300, name: 'Мастер' },
  { xp: 4800, name: 'Луксмастер' },
  { xp: 7000, name: 'Легенда' },
]

export function levelInfo(xp: number) {
  let i = 0
  while (i + 1 < LEVELS.length && xp >= LEVELS[i + 1].xp) i++
  const cur = LEVELS[i], next = LEVELS[i + 1]
  const pct = next ? (xp - cur.xp) / (next.xp - cur.xp) : 1
  return { index: i, name: cur.name, next: next?.name, toNext: next ? next.xp - xp : 0, pct }
}

export function addXp(n: number) {
  setState((s) => ({ ...s, xp: Math.max(0, s.xp + n) }))
}

export const today = () => dayKey(new Date())
export function dayKey(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function streak(done: Record<string, string[]>): number {
  let n = 0
  const d = new Date()
  if (!(done[dayKey(d)]?.length)) d.setDate(d.getDate() - 1)
  while (done[dayKey(d)]?.length) { n++; d.setDate(d.getDate() - 1) }
  return n
}

export function useHash(): [string, (h: string) => void] {
  const [h, setH] = useState(() => location.hash.slice(1) || 'home')
  useEffect(() => {
    const on = () => { setH(location.hash.slice(1) || 'home'); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return [h, (x: string) => { location.hash = x }]
}
