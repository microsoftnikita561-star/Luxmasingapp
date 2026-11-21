import { useState } from 'react'
import { MODULES, lessonById } from '../data/courses'
import { setState, useStore } from '../lib/store'
import { Bar, RichText } from '../components/ui'

export default function Academy({ lessonId }: { lessonId?: string }) {
  const doneL = useStore((s) => s.lessonsDone)
  const lesson = lessonId ? lessonById(lessonId) : undefined
  if (lesson) return <LessonView key={lesson.id} id={lesson.id} />
  const total = MODULES.reduce((s, m) => s + m.lessons.length, 0)
  return (
    <div className="stack">
      <h1>Академия луксмаксинга</h1>
      <p className="muted">Короткие уроки с тестами. За урок +30 XP, за идеальный тест +20 XP.</p>
      <div className="card"><div className="row between"><b>Пройдено уроков</b><span>{doneL.length} / {total}</span></div><div style={{ marginTop: 8 }}><Bar value={(doneL.length / total) * 100} /></div></div>
      {MODULES.map((m) => (
        <div key={m.id} className="card">
          <h2>{m.icon} {m.title}</h2>
          <p className="small muted">{m.desc}</p>
          {m.lessons.map((l) => (
            <a key={l.id} href={`#academy/${l.id}`} className={`task ${doneL.includes(l.id) ? 'done' : ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>
              <span className="check">{doneL.includes(l.id) ? '✓' : ''}</span>
              <div style={{ flex: 1 }}><div className="ttl">{l.title}</div><div className="tiny muted">{l.minutes} мин · {l.quiz.length} вопр.</div></div>
            </a>
          ))}
        </div>
      ))}
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
      <a href="#academy" className="small">← Академия</a>
      <div className="tiny muted">{l.module.icon} {l.module.title} · {l.minutes} мин {doneL.includes(l.id) && '· ✓ пройдено'}</div>
      <h1>{l.title}</h1>
      <div className="card"><RichText text={l.text} /></div>
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
            {answers[qi] != null && <p className="small muted" style={{ marginTop: 8 }}>{answers[qi] === q.correct ? '✅ ' : '❌ '}{q.explain}</p>}
          </div>
        ))}
        {finished && (
          <div className="mt">
            <div className={`pill ${correct === l.quiz.length ? 'good' : 'mid'}`}>Результат: {correct} / {l.quiz.length}</div>
            <div className="row mt">
              {correct < l.quiz.length && <button className="btn" onClick={() => setAnswers({})}>Пройти ещё раз</button>}
              {next && <a className="btn primary" href={`#academy/${next.id}`}>Следующий урок →</a>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
