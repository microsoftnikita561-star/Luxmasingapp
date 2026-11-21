import { tasksFor } from '../data/protocols'
import { ALL_MODULES } from '../data/courses'
import { DRILLS } from '../data/drills'
import { levelInfo, streak, today, useStore, LEVELS } from '../lib/store'
import { Bar } from '../components/ui'
import { Icon } from '../components/Icon'
import { TaskRow } from './Program'

export default function Home() {
  const profile = useStore((x) => x.profile)
  const xp = useStore((x) => x.xp)
  const done = useStore((x) => x.done)
  const lessons = useStore((x) => x.lessonsDone)
  const progress = useStore((x) => x.progress)
  const skin = useStore((x) => x.skin)
  const lvl = levelInfo(xp)
  const tasks = tasksFor(profile)
  const doneToday = done[today()] ?? []
  const nDone = tasks.filter((t) => doneToday.includes(t.id)).length
  const allLessons = ALL_MODULES.flatMap((m) => m.lessons)
  const nextLesson = allLessons.find((l) => !lessons.includes(l.id))
  const last = progress[progress.length - 1]
  const upcoming = tasks.filter((t) => !doneToday.includes(t.id)).slice(0, 5)
  const drill = DRILLS[new Date().getDate() % DRILLS.length]
  const date = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="stack">
      <div>
        <div className="kicker">{date}</div>
        <h1>{profile.name ? `${profile.name}, ` : ''}на сегодня {tasks.length - nDone === 0 ? 'всё сделано' : `осталось ${tasks.length - nDone}`}</h1>
      </div>

      <div className="card ink">
        <div className="row between" style={{ alignItems: 'flex-end' }}>
          <div>
            <div className="label">Уровень {lvl.index + 1} из {LEVELS.length}</div>
            <div className="hero-score">{lvl.name}</div>
          </div>
          <div className="num" style={{ fontSize: 15 }}>{xp} XP{lvl.next ? ` · до «${lvl.next}» ${lvl.toNext}` : ''}</div>
        </div>
        <div className="bar" style={{ marginTop: 16, background: 'color-mix(in srgb, var(--bg) 22%, transparent)' }}><i style={{ width: `${lvl.pct * 100}%`, background: 'var(--bg)' }} /></div>
      </div>

      <div className="grid g4">
        <div className="card"><div className="label">Сегодня</div><div className="stat">{nDone}<small> / {tasks.length}</small></div></div>
        <div className="card"><div className="label">Серия</div><div className="stat">{streak(done)}<small> дн.</small></div></div>
        <div className="card"><div className="label">Гармония</div><div className="stat">{last ? last.analysis.harmony : '—'}</div></div>
        <div className="card"><div className="label">Воспаления</div><div className="stat">{skin.length ? skin[skin.length - 1].inflamed : '—'}</div></div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row between"><div className="kicker" style={{ margin: 0 }}>Дальше по плану</div><a href="#program" className="small muted">Вся программа</a></div>
          <div style={{ marginTop: 6 }}>
            {upcoming.length ? upcoming.map((t) => <TaskRow key={t.id} t={t} done={false} />) : <p className="muted mt">На сегодня всё выполнено. Завтра продолжим.</p>}
          </div>
          <div style={{ marginTop: 10 }}><Bar value={tasks.length ? (nDone / tasks.length) * 100 : 0} /></div>
        </div>
        <div className="stack">
          {!last && <Tile href="#analyze" kicker="Первый шаг" title="Сделать анализ лица" text="478 точек, 14 пропорций, форма лица и приоритеты." />}
          {!skin.length && <Tile href="#skin" kicker="Кожа" title="Проверить кожу" text="Детектор воспалений и схема ухода под возраст." />}
          <Tile href={`#trainer/face/${drill.id}`} kicker="Упражнение дня" title={drill.name} text={drill.goal} />
          {nextLesson && <Tile href={`#academy/${nextLesson.id}`} kicker={`Урок · ${nextLesson.minutes} мин`} title={nextLesson.title} />}
          <Tile href="#trainer/posture" kicker="8 минут" title="Осанка и шея" text="Шесть упражнений с фото каждого движения." />
        </div>
      </div>
    </div>
  )
}

function Tile({ href, kicker, title, text }: { href: string; kicker: string; title: string; text?: string }) {
  return (
    <a href={href} className="card">
      <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
        <div><div className="kicker">{kicker}</div><h3 style={{ margin: 0 }}>{title}</h3>{text && <p className="small muted" style={{ margin: '6px 0 0' }}>{text}</p>}</div>
        <Icon name="right" />
      </div>
    </a>
  )
}
