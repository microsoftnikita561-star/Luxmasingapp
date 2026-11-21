import { useState } from 'react'
import { CATEGORIES, tasksFor, type Task } from '../data/protocols'
import { dayKey, setState, streak, today, useStore } from '../lib/store'
import { Bar } from '../components/ui'
import { Icon } from '../components/Icon'

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
      <button className="check" onClick={() => toggleTask(t)} aria-label="Отметить">{done && <Icon name="check" />}</button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between" style={{ gap: 6 }}>
          <span className="ttl" onClick={() => setOpen(!open)} style={{ cursor: 'pointer' }}>{t.title}</span>
          <span className="xp">{c.name} · +{t.xp}</span>
        </div>
        {open && (
          <div className="small muted" style={{ marginTop: 6 }}>
            {t.desc}
            <div className="row" style={{ marginTop: 8 }}>
              {t.lesson && <a className="btn sm ghost" href={`#academy/${t.lesson}`}>Урок</a>}
              {t.drill && <a className="btn sm ghost" href={`#trainer/face/${t.drill}`}>Упражнение</a>}
              {t.id === 'posture' && <a className="btn sm ghost" href="#trainer/posture">Показать упражнения</a>}
              {t.id === 'train' && <a className="btn sm ghost" href="#trainer/full">Показать упражнения</a>}
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
      <div><div className="kicker">Программа</div><h1>План на день</h1></div>
      <div className="grid g2">
        <div className="card">
          <div className="row between"><span className="label" style={{ margin: 0 }}>Сегодня выполнено</span><span className="num">{Math.round(pct)}%</span></div>
          <div style={{ marginTop: 10 }}><Bar value={pct} /></div>
          <p className="small muted mt">Серия: <b className="num" style={{ color: 'var(--ink)' }}>{streak(doneMap)}</b> дн. Нажмите на название задачи — откроется объяснение.</p>
        </div>
        <div className="card">
          <div className="label">Последние 5 недель</div>
          <div className="heat" style={{ marginTop: 10 }}>
            {days.map((x) => <i key={x.key} title={x.key} style={{ background: x.v ? `color-mix(in srgb, var(--ink) ${Math.round(20 + x.v * 80)}%, var(--sunk))` : undefined }} />)}
          </div>
        </div>
      </div>
      {groups.map((g) => {
        const list = tasks.filter((t) => t.when === g)
        if (!list.length) return null
        return (
          <div key={g} className="card">
            <div className="kicker">{g}</div>
            {list.map((t) => <TaskRow key={t.id} t={t} done={done.includes(t.id)} />)}
          </div>
        )
      })}
    </div>
  )
}
