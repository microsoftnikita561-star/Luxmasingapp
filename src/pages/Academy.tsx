import { useState } from 'react'
import { ALL_MODULES as MODULES, lessonById } from '../data/courses'
import { GLOSSARY } from '../data/glossary'
import { Icon } from '../components/Icon'
import { setState, useStore } from '../lib/store'
import { Bar, RichText } from '../components/ui'

export default function Academy({ lessonId }: { lessonId?: string }) {
  const doneL = useStore((s) => s.lessonsDone)
  const lesson = lessonId ? lessonById(lessonId) : undefined
  if (lesson) return <LessonView key={lesson.id} id={lesson.id} />
  const total = MODULES.reduce((s, m) => s + m.lessons.length, 0)
  return (
    <div className="stack">
      <div><div className="kicker">Академия</div><h1>Уроки и разборы</h1>
      <p className="lead">От базовой рутины до разборов исследований. За урок +30 XP, за тест без ошибок ещё +20.</p></div>
      <div className="card"><div className="row between"><span className="label" style={{ margin: 0 }}>Пройдено уроков</span><span className="num">{doneL.length} / {total}</span></div><div style={{ marginTop: 8 }}><Bar value={(doneL.length / total) * 100} /></div></div>
      {MODULES.map((m) => (
        <div key={m.id} className="card">
          <h2>{m.title}</h2>
          <p className="small muted">{m.desc}</p>
          {m.lessons.map((l) => (
            <a key={l.id} href={`#academy/${l.id}`} className="task" style={{ textDecoration: 'none' }}>
              <span className="check" style={doneL.includes(l.id) ? { background: 'var(--ink)' } : undefined}>{doneL.includes(l.id) && <Icon name="check" />}</span>
              <div style={{ flex: 1 }}><div className="ttl">{l.title}</div></div>
              <span className="xp">{l.minutes} мин</span>
            </a>
          ))}
        </div>
      ))}
      <Glossary />
    </div>
  )
}

function Glossary() {
  const [q, setQ] = useState('')
  const list = GLOSSARY.filter((t) => !q || (t.term + ' ' + (t.en ?? '') + ' ' + t.def).toLowerCase().includes(q.toLowerCase()))
  return (
    <div className="card" id="glossary">
      <h2>Словарь терминов</h2>
      <input placeholder="Найти термин: кантальный наклон, FWHR, ретиноид…" value={q} onChange={(e) => setQ(e.target.value)} />
      <table className="plain mt">
        <tbody>
          {list.map((t) => (
            <tr key={t.term}><td style={{ width: '32%' }}><b>{t.term}</b>{t.en && <div className="tiny muted">{t.en}</div>}<div className="tiny muted">{t.category}</div></td><td>{t.def}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function LessonView({ id }: { id: string }) {
  const l = lessonById(id)!
  const doneL = useStore((s) => s.lessonsDone)
  const [answers, setAnswers] = useState<Record<number, number>>({})
  const finished = Object.keys(answers).length === l.quiz.length
  const correct = l.quiz.filter((q, i) => answers[i] === q.correct).length

  const answer = (qi: number, oi: number) => {
    if (answers[qi] != null) return
    const next = { ...answers, [qi]: oi }
    setAnswers(next)
    if (Object.keys(next).length === l.quiz.length) {
      const c = l.quiz.filter((q, i) => next[i] === q.correct).length
      setState((s) => {
        const first = !s.lessonsDone.includes(l.id)
        const prevBest = s.quizScores[l.id] ?? 0
        const perfect = c === l.quiz.length && prevBest < l.quiz.length
        return {
          ...s,
          lessonsDone: first ? [...s.lessonsDone, l.id] : s.lessonsDone,
          quizScores: { ...s.quizScores, [l.id]: Math.max(prevBest, c) },
          xp: s.xp + (first ? 30 : 0) + (perfect ? 20 : 0),
        }
      })
    }
  }

  const all = MODULES.flatMap((m) => m.lessons)
  const idx = all.findIndex((x) => x.id === id)
  const next = all[idx + 1]

  return (
    <div className="stack" style={{ maxWidth: 760 }}>
      <a href="#academy" className="small muted">← Академия</a>
      <div className="kicker">{l.module.title} · {l.minutes} мин{doneL.includes(l.id) ? ' · пройдено' : ''}</div>
      <h1>{l.title}</h1>
      <RichText text={l.text} />
      <hr className="rule" />
      <div className="card">
        <h2>Проверь себя</h2>
        {l.quiz.map((q, qi) => (
          <div key={qi} className="mt">
            <b>{qi + 1}. {q.q}</b>
            {q.options.map((o, oi) => {
              const a = answers[qi]
              const cls = a == null ? '' : oi === q.correct ? 'right' : oi === a ? 'wrong' : ''
              return <button key={oi} className={`opt ${cls}`} onClick={() => answer(qi, oi)}>{o}</button>
            })}
            {answers[qi] != null && <p className="small muted" style={{ marginTop: 8 }}><b>{answers[qi] === q.correct ? 'Верно. ' : 'Неверно. '}</b>{q.explain}</p>}
          </div>
        ))}
        {finished && (
          <div className="mt">
            <div className={`pill ${correct === l.quiz.length ? 'good' : 'mid'}`}>Результат: {correct} / {l.quiz.length}</div>
            <div className="row mt">
              {correct < l.quiz.length && <button className="btn" onClick={() => setAnswers({})}>Пройти ещё раз</button>}
              {next && <a className="btn primary" href={`#academy/${next.id}`}>Следующий урок</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
