import { tasksFor } from '../data/protocols'
import { MODULES } from '../data/courses'
import { DRILLS } from '../data/drills'
import { levelInfo, streak, today, useStore, LEVELS } from '../lib/store'
import { Bar, Ring } from '../components/ui'
import { TaskRow } from './Program'

export default function Home() {
  const s = {
    profile: useStore((x) => x.profile),
    xp: useStore((x) => x.xp),
    done: useStore((x) => x.done),
    lessons: useStore((x) => x.lessonsDone),
    progress: useStore((x) => x.progress),
  }
  const lvl = levelInfo(s.xp)
  const tasks = tasksFor(s.profile)
  const doneToday = s.done[today()] ?? []
  const pct = tasks.length ? Math.round((tasks.filter((t) => doneToday.includes(t.id)).length / tasks.length) * 100) : 0
  const nextLesson = MODULES.flatMap((m) => m.lessons).find((l) => !s.lessons.includes(l.id))
  const last = s.progress[s.progress.length - 1]
  const upcoming = tasks.filter((t) => !doneToday.includes(t.id)).slice(0, 4)
  const drill = DRILLS[new Date().getDate() % DRILLS.length]
  const hour = new Date().getHours()
  const hi = hour < 6 ? 'Доброй ночи' : hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div className="stack">
      <div>
        <h1>{hi}{s.profile.name ? `, ${s.profile.name}` : ''} 👋</h1>
        <p className="muted">Каждый выполненный пункт приближает вас к уровню «Луксмастер».</p>
      </div>

      <div className="card glow">
        <div className="row" style={{ gap: 22 }}>
          <Ring value={lvl.pct * 100} size={110} label={lvl.index + 1} sub="уровень" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="hero-score" style={{ fontSize: 30 }}>{lvl.name}</div>
            <div className="small muted" style={{ margin: '6px 0 8px' }}>{s.xp} XP {lvl.next && `· до «${lvl.next}» осталось ${lvl.toNext} XP`}</div>
            <Bar value={lvl.pct * 100} />
            <div className="row tiny muted" style={{ marginTop: 8 }}>
              {LEVELS.map((l, i) => <span key={l.name} style={{ color: i <= lvl.index ? 'var(--gold)' : undefined }}>{i <= lvl.index ? '★' : '☆'}</span>)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid g4">
        <div className="card"><div className="small muted">Сегодня</div><div className="stat">{pct}<small>%</small></div></div>
        <div className="card"><div className="small muted">Серия</div><div className="stat">🔥 {streak(s.done)}<small> дн</small></div></div>
        <div className="card"><div className="small muted">Гармония</div><div className="stat">{last ? last.analysis.harmony : '—'}<small>{last ? '/100' : ''}</small></div></div>
        <div className="card"><div className="small muted">Уроки</div><div className="stat">{s.lessons.length}<small>/{MODULES.reduce((a, m) => a + m.lessons.length, 0)}</small></div></div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row between"><h3 style={{ margin: 0 }}>Следующие задачи</h3><a href="#program" className="small">Вся программа →</a></div>
          <div className="mt">
            {upcoming.length ? upcoming.map((t) => <TaskRow key={t.id} t={t} done={false} />) : <p className="muted">🎉 Всё на сегодня выполнено!</p>}
          </div>
        </div>
        <div className="stack">
          {!last && (
            <a href="#analyze" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <h3>🔬 Сделайте первый анализ лица</h3>
              <p className="small muted">478 точек, 14 пропорций, форма лица и персональные приоритеты.</p>
            </a>
          )}
          <a href={`#trainer/${drill.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div className="tiny muted">Упражнение дня</div>
            <h3>{drill.icon} {drill.name}</h3>
            <p className="small muted">{drill.goal}</p>
          </a>
          {nextLesson && (
            <a href={`#academy/${nextLesson.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div className="tiny muted">Следующий урок · {nextLesson.minutes} мин · +30 XP</div>
              <h3>🎓 {nextLesson.title}</h3>
            </a>
          )}
          <a href="#coach" className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <h3>🤖 Спросить ИИ-коуча</h3>
            <p className="small muted">Персональный план, разбор фото кожи и стрижки.</p>
          </a>
        </div>
      </div>
    </div>
  )
}
