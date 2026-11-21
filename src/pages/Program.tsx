import { useState } from 'react'
import { CATEGORIES, tasksFor, type Task } from '../data/protocols'
import { dayKey, setState, streak, today, useStore } from '../lib/store'
import { Bar } from '../components/ui'

export function toggleTask(t: Task) {
  setState((s) => {
    const d = today()
    const cur = s.done[d] ?? []
    const has = cur.includes(t.id)
    return { ...s, done: { ...s.done, [d]: has ? cur.filter((x) => x !== t.id) : [...cur, t.id] }, xp: Math.max(0, s.xp + (has ? -t.xp : t.xp)) }
  })
}

export function TaskRow({ t, done }: { t: Task; done: boolean }) {
  const [open, setOpen] = useState(false)
  const c = CATEGORIES[t.cat]
  return (
    <div className={`task ${done ? 'done' : ''}`}>
      <button className="check" onClick={() => toggleTask(t)} aria-label="Отметить">{done ? '✓' : ''}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between" style={{ gap: 6 }}>
          <span className="ttl" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>{t.title}</span>
          <span className="pill" style={{ color: c.color }}>{c.icon} +{t.xp}</span>
        </div>
        {open && (
          <div className="small muted" style={{ marginTop: 6 }}>
            {t.desc}
            <div className="row" style={{ marginTop: 8 }}>
              {t.lesson && <a className="btn sm" href={`#academy/${t.lesson}`}>🎓 Урок</a>}
              {t.drill && <a className="btn sm" href={`#trainer/${t.drill}`}>🎯 Тренажёр</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Program() {
  const profile = useStore((s) => s.profile)
  const doneMap = useStore((s) => s.done)
  const tasks = tasksFor(profile)
  const done = doneMap[today()] ?? []
  const pct = tasks.length ? (tasks.filter((t) => done.includes(t.id)).length / tasks.length) * 100 : 0
  const groups = ['Утро', 'День', 'Вечер', 'Любое время'] as const

  // тепловая карта 5 недель
  const days: { key: string; v: number }[] = []
  const d = new Date(); d.setDate(d.getDate() - 34)
  for (let i = 0; i < 35; i++) {
    const k = dayKey(d)
    const n = doneMap[k]?.length ?? 0
    days.push({ key: k, v: Math.min(1, n / Math.max(1, tasksFor(profile, d).length)) })
    d.setDate(d.getDate() + 1)
  }

  return (
    <div className="stack">
      <h1>Ежедневная программа</h1>
      <div className="grid g2">
        <div className="card">
          <div className="row between"><b>Сегодня выполнено</b><span>{Math.round(pct)}%</span></div>
          <div style={{ marginTop: 10 }}><Bar value={pct} cls="good" /></div>
          <p className="small muted mt">🔥 Серия: <b style={{ color: 'var(--gold)' }}>{streak(doneMap)}</b> дн. Нажмите на название задачи — откроется объяснение и урок.</p>
        </div>
        <div className="card">
          <b>Последние 5 недель</b>
          <div className="heat" style={{ marginTop: 10 }}>
            {days.map((x) => <i key={x.key} title={x.key} style={{ background: x.v ? `rgba(89, 212, 155, ${0.2 + x.v * 0.8})` : undefined }} />)}
          </div>
        </div>
      </div>
      {groups.map((g) => {
        const list = tasks.filter((t) => t.when === g)
        if (!list.length) return null
        return (
          <div key={g} className="card">
            <h3>{g === 'Утро' ? '🌅' : g === 'День' ? '☀️' : g === 'Вечер' ? '🌙' : '🔁'} {g}</h3>
            {list.map((t) => <TaskRow key={t.id} t={t} done={done.includes(t.id)} />)}
          </div>
        )
      })}
    </div>
  )
}
