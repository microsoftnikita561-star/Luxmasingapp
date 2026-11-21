import type { Analysis, Metric } from './metrics'
import type { SkinResult } from './skin'
import { gradeAcne } from './skin'

// Битва: сравнение двух замеров по раундам. Правила честные:
// — раунд засчитывается, только если у ОБОИХ измерение надёжно (нет улыбки, поворота головы);
// — разница меньше порога считается ничьей, потому что это погрешность фото, а не лица.
export interface SkinScore { clear: number | null; even: number | null }
export interface Fighter { name: string; analysis: Analysis; skin: SkinResult | SkinScore | null; thumb: string }
export interface Round {
  id: string
  name: string
  a: number | null
  b: number | null
  winner: 'a' | 'b' | 'draw' | 'void'
  note?: string
  tip?: string // что проигравший может с этим сделать
  fixed: boolean // костная основа — сравнение ради интереса
}
export interface BattleResult { rounds: Round[]; a: number; b: number; winner: 'a' | 'b' | 'draw' }

const TIE = 4 // баллов: меньше — погрешность съёмки

function metricScore(an: Analysis, ids: string[]): { v: number | null; why?: string; lever?: string } {
  const ms = ids.map((id) => an.metrics.find((m) => m.id === id)).filter(Boolean) as Metric[]
  const bad = ms.find((m) => m.unreliable)
  if (bad) return { v: null, why: bad.unreliable }
  if (!ms.length) return { v: null, why: 'нет данных' }
  const worst = [...ms].sort((x, y) => x.score - y.score)[0]
  return { v: Math.round(ms.reduce((s, m) => s + m.score, 0) / ms.length), lever: worst.levers[0] }
}

export const skinPoints = (inflamed: number, marks: number) => Math.max(0, Math.round(100 - inflamed * 7 - marks * 1.5))

function skinScores(s: SkinResult | SkinScore | null): SkinScore {
  if (!s) return { clear: null, even: null }
  if (!('spots' in s)) return s
  if (s.lighting === 'dark' || s.lighting === 'bright') return { clear: null, even: null }
  const g = gradeAcne(s.spots)
  return { clear: skinPoints(g.inflamed, g.marks), even: s.evenness }
}

export function battle(A: Fighter, B: Fighter): BattleResult {
  const rounds: Round[] = []
  const add = (id: string, name: string, a: number | null, b: number | null, fixed: boolean, tipA?: string, tipB?: string, voidWhy?: string) => {
    if (a == null || b == null) { rounds.push({ id, name, a, b, winner: 'void', note: `Нельзя сравнить честно: ${voidWhy ?? 'нет данных'}`, fixed }); return }
    const diff = a - b
    const winner = Math.abs(diff) < TIE ? 'draw' : diff > 0 ? 'a' : 'b'
    rounds.push({ id, name, a, b, winner, fixed, tip: winner === 'a' ? tipB : winner === 'b' ? tipA : undefined, note: winner === 'draw' ? 'Разница в пределах погрешности фото' : undefined })
  }
  const face = (id: string, name: string, ids: string[], fixed: boolean) => {
    const x = metricScore(A.analysis, ids), y = metricScore(B.analysis, ids)
    add(id, name, x.v, y.v, fixed, x.lever, y.lever, x.why ?? y.why)
  }
  face('symmetry', 'Симметрия', ['symmetry'], false)
  face('eyes', 'Глаза', ['canthal', 'eyeopen', 'esr'], true)
  face('jaw', 'Челюсть и скулы', ['jaw', 'fwhr'], false)
  face('thirds', 'Пропорции третей', ['thirds', 'chin', 'midface'], true)
  face('balance', 'Нос, рот и брови', ['nose', 'mouth', 'fifths', 'brow'], true)
  const sa = skinScores(A.skin), sb = skinScores(B.skin)
  const skinTip = 'Кожа — самый быстрый реванш: схема ухода в разделе «Кожа», результат через 8–12 недель'
  add('skin', 'Чистота кожи', sa.clear, sb.clear, false, skinTip, skinTip, 'плохой свет на фото')
  add('tone', 'Ровность тона', sa.even, sb.even, false, 'SPF каждый день и ретиноид вечером выравнивают тон за 2–3 месяца', 'SPF каждый день и ретиноид вечером выравнивают тон за 2–3 месяца', 'плохой свет на фото')

  const a = rounds.filter((r) => r.winner === 'a').length, b = rounds.filter((r) => r.winner === 'b').length
  return { rounds, a, b, winner: a === b ? 'draw' : a > b ? 'a' : 'b' }
}
