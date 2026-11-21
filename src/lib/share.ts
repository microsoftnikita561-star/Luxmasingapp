import { getState, levelInfo, streak } from './store'

// Публичная карточка профиля. В ссылку попадает только то, что перечислено здесь:
// имя, уровень, серия, число уроков и (по желанию) баллы анализа. Фото не передаётся.
export interface SharedProfile { n: string; x: number; s: number; l: number; h?: number; y?: number; f?: string; d?: number; t: number }

export function buildShared(includeFace: boolean): SharedProfile {
  const st = getState()
  const last = st.progress[st.progress.length - 1]?.analysis
  const drills = Object.values(st.drills)
  return {
    n: st.profile.name || 'Без имени', x: st.xp, s: streak(st.done), l: st.lessonsDone.length,
    ...(includeFace && last ? { h: last.harmony, y: last.symmetry, f: last.shape.name } : {}),
    ...(drills.length ? { d: Math.max(...drills) } : {}),
    t: Date.now(),
  }
}

export function encodeShared(p: SharedProfile): string {
  const bytes = new TextEncoder().encode(JSON.stringify(p))
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
export function decodeShared(s: string): SharedProfile | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
    const p = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))))
    if (typeof p?.n !== 'string' || typeof p?.x !== 'number') return null
    return { ...p, n: String(p.n).slice(0, 40) }
  } catch { return null }
}
export const shareUrl = (p: SharedProfile) => `${location.origin}${location.pathname}#u/${encodeShared(p)}`

/** Картинка-карточка 1080×1350 для сторис и мессенджеров */
export async function renderCard(p: SharedProfile): Promise<Blob> {
  await document.fonts.ready
  const W = 1080, H = 1350
  const c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  const ink = '#17160f', paper = '#f1eee6', muted = '#6b685c', line = '#d6d1c2'
  g.fillStyle = paper; g.fillRect(0, 0, W, H)
  g.fillStyle = ink
  g.font = "700 44px 'Playfair Display Variable', Georgia, serif"
  g.fillText('LuxMasing', 80, 130)
  g.font = "600 22px 'Golos Text Variable', sans-serif"; g.fillStyle = muted
  g.textAlign = 'right'; g.fillText(new Date(p.t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase(), W - 80, 124); g.textAlign = 'left'
  g.fillStyle = line; g.fillRect(80, 170, W - 160, 2)

  const lvl = levelInfo(p.x)
  g.fillStyle = muted; g.font = "600 24px 'Golos Text Variable', sans-serif"
  g.fillText(`УРОВЕНЬ ${lvl.index + 1}`, 80, 290)
  g.fillStyle = ink; g.font = "600 128px 'Playfair Display Variable', Georgia, serif"
  let name = p.n
  while (g.measureText(name).width > W - 160 && name.length > 3) name = name.slice(0, -2) + '…'
  g.fillText(name, 76, 430)
  g.font = "italic 500 64px 'Playfair Display Variable', Georgia, serif"
  g.fillText(lvl.name, 80, 520)
  // шкала уровня
  g.fillStyle = line; g.fillRect(80, 580, W - 160, 8)
  g.fillStyle = ink; g.fillRect(80, 580, (W - 160) * lvl.pct, 8)

  const cells: [string, string][] = [['XP', String(p.x)], ['СЕРИЯ, ДНЕЙ', String(p.s)], ['УРОКОВ', String(p.l)]]
  if (p.h != null) cells.push(['ГАРМОНИЯ', String(p.h)])
  if (p.y != null) cells.push(['СИММЕТРИЯ', String(p.y)])
  if (p.d != null) cells.push(['МИМИКА, %', String(p.d)])
  const cols = 3, cw = (W - 160) / cols
  cells.forEach(([k, v], i) => {
    const x = 80 + (i % cols) * cw, y = 720 + Math.floor(i / cols) * 230
    g.fillStyle = line; g.fillRect(x, y - 60, cw - 30, 2)
    g.fillStyle = muted; g.font = "600 22px 'Golos Text Variable', sans-serif"; g.fillText(k, x, y)
    g.fillStyle = ink; g.font = "500 104px 'JetBrains Mono Variable', monospace"; g.fillText(v, x - 4, y + 112)
  })
  if (p.f) { g.fillStyle = muted; g.font = "500 30px 'Golos Text Variable', sans-serif"; g.fillText(`Форма лица: ${p.f.toLowerCase()}`, 80, H - 150) }
  g.fillStyle = ink; g.fillRect(80, H - 110, W - 160, 2)
  g.font = "500 26px 'Golos Text Variable', sans-serif"; g.fillStyle = muted
  g.fillText('Кожа · тело · осанка · мимика · стиль', 80, H - 62)
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Не удалось создать картинку'))), 'image/png'))
}
