import { CATEGORIES, tasksFor, type Category } from '../data/protocols'
import { SEVERITY_NAMES, type Severity } from './skin'
import { dayKey, type AppState } from './store'

// «Фокус» — три вещи, которые сейчас дадут больше всего. Считается из реальных данных
// пользователя: замеров кожи и лица и того, какие привычки он на самом деле пропускает.
export interface FocusItem { id: string; title: string; why: string; action: string; href: string }

const DAY = 86400000
const daysAgo = (t: number) => Math.floor((Date.now() - t) / DAY)

/** Доля выполнения задач по категориям за последние 7 дней (не считая сегодня) */
export function weekAdherence(s: AppState): { cat: Category; done: number; total: number }[] {
  const acc = {} as Record<Category, { done: number; total: number }>
  const d = new Date()
  for (let i = 0; i < 7; i++) {
    d.setDate(d.getDate() - 1)
    const done = s.done[dayKey(d)] ?? []
    for (const t of tasksFor(s.profile, d)) {
      acc[t.cat] ??= { done: 0, total: 0 }
      acc[t.cat].total++
      if (done.includes(t.id)) acc[t.cat].done++
    }
  }
  return (Object.keys(acc) as Category[]).map((cat) => ({ cat, ...acc[cat] }))
}

export function buildFocus(s: AppState): FocusItem[] {
  const out: FocusItem[] = []
  const skin = s.skin[s.skin.length - 1]
  const face = s.progress[s.progress.length - 1]

  // 1. Кожа
  if (!skin) {
    out.push({ id: 'skin-first', title: 'Проверьте кожу', why: 'Кожа — самое заметное, что можно улучшить за 2–3 месяца, а программа подстроится под результат.', action: 'Сделать замер', href: '#skin' })
  } else if (skin.severity !== 'clear') {
    const prev = s.skin.length > 1 ? s.skin[s.skin.length - 2] : null
    const delta = prev ? skin.inflamed - prev.inflamed : 0
    const trend = prev ? (delta < 0 ? ` С прошлого замера стало меньше на ${-delta}.` : delta > 0 ? ` С прошлого замера стало больше на ${delta} — проверьте, не пропускаете ли вечерний уход.` : ' С прошлого замера без изменений — схеме нужно 8–12 недель.') : ''
    const due = daysAgo(skin.date) >= 14
    out.push({
      id: 'skin', title: `Кожа: ${SEVERITY_NAMES[skin.severity as Severity].toLowerCase()}`,
      why: `Воспалений: ${skin.inflamed}.${trend}`,
      action: due ? 'Пора повторить замер' : `Схема ухода · повтор через ${14 - daysAgo(skin.date)} дн.`, href: '#skin',
    })
  } else if (daysAgo(skin.date) >= 30) {
    out.push({ id: 'skin-re', title: 'Контрольный замер кожи', why: `Последний был ${daysAgo(skin.date)} дн. назад, кожа была чистой.`, action: 'Повторить замер', href: '#skin' })
  }

  // 2. Лицо
  if (!face) {
    out.push({ id: 'face-first', title: 'Сделайте анализ лица', why: 'Он покажет, какие пропорции уже сильные, а какие можно подчеркнуть стрижкой, весом и осанкой.', action: 'Сделать анализ', href: '#analyze' })
  } else {
    if ((face.analysis.confidence ?? 100) < 70) {
      out.push({ id: 'face-redo', title: 'Переснимите фото для анализа', why: `На последнем фото засчитано только ${face.analysis.confidence}% измерений — мешала мимика или поворот головы.`, action: 'Переснять с нейтральным лицом', href: '#analyze' })
    } else {
      const weak = face.analysis.metrics.filter((m) => !m.unreliable && m.modifiable !== 'low' && m.score < 85).sort((a, b) => a.score - b.score)[0]
      if (weak) out.push({ id: 'face-' + weak.id, title: weak.name, why: weak.levers[0], action: 'Открыть разбор', href: '#analyze' })
    }
    if (daysAgo(face.date) >= 28) out.push({ id: 'face-re', title: 'Ежемесячное фото', why: `Последний замер лица — ${daysAgo(face.date)} дн. назад. Снимайте при том же свете, чтобы сравнение было честным.`, action: 'Новый замер', href: '#analyze' })
  }

  // 3. Привычки: что реально проседает
  const adh = weekAdherence(s).filter((a) => a.total >= 5)
  const tracked = adh.some((a) => a.done > 0)
  if (tracked) {
    const worst = adh.sort((a, b) => a.done / a.total - b.done / b.total)[0]
    if (worst && worst.done / worst.total < 0.5) {
      out.push({ id: 'habit-' + worst.cat, title: `Проседает: ${CATEGORIES[worst.cat].name.toLowerCase()}`, why: `За прошлую неделю выполнено ${worst.done} из ${worst.total}. Одна выполненная задача в день уже меняет картину.`, action: 'Открыть программу', href: '#program' })
    }
  }
  return out.slice(0, 3)
}
