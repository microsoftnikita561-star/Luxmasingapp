import { useEffect, useMemo, useRef, useState } from 'react'
import { blendshapeMap, headPose } from '../lib/face'
import { analyze, type Metric } from '../lib/metrics'
import { addXp, setState, useStore } from '../lib/store'
import { drawLines, drawMesh, faceThumb } from '../components/draw'
import { Bar, Ring, scoreClass } from '../components/ui'
import { Icon } from '../components/Icon'
import { PhotoInput, useCapture } from '../components/PhotoInput'
import { lessonById } from '../data/courses'

const LESSON_FOR: Record<string, { lesson?: string; drill?: string }> = {
  symmetry: { lesson: 'face-posture' }, canthal: { lesson: 'hair-brows' }, fwhr: { lesson: 'body-fat' },
  midface: { lesson: 'hair-cut' }, esr: { lesson: 'hair-brows' }, thirds: { lesson: 'hair-beard' },
  chin: { lesson: 'face-posture', drill: 'chin' }, jaw: { lesson: 'body-fat' }, nose: { lesson: 'hardmaxxing' },
  mouth: { drill: 'duchenne' }, fifths: { lesson: 'hair-brows' }, eyeopen: { lesson: 'mind-photo', drill: 'squinch' },
  lips: { lesson: 'face-teeth' }, brow: { lesson: 'hair-brows', drill: 'calm' },
}
const MOD_LABEL = { high: 'легко улучшить', medium: 'частично улучшаемо', low: 'костная основа' }

export default function Analyze() {
  const profile = useStore((s) => s.profile)
  const cap = useCapture()
  const [sel, setSel] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const a = useMemo(() => (cap ? analyze(cap.res.faceLandmarks[0], cap.img.width, cap.img.height, profile.sex, headPose(cap.res), blendshapeMap(cap.res)) : null), [cap, profile.sex])

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !cap || !a) return
    c.width = cap.img.width; c.height = cap.img.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(cap.img, 0, 0)
    const lms = cap.res.faceLandmarks[0]
    drawMesh(ctx, lms, c.width, c.height, { color: 'rgba(255,255,255,.22)' })
    const m = a.metrics.find((x) => x.id === sel)
    drawLines(ctx, lms, c.width, c.height, m ? m.lines : a.metrics.slice(1, 8).flatMap((x) => x.lines), m ? '#e8f36b' : 'rgba(255,255,255,.8)')
  }, [cap, a, sel])

  function save() {
    if (!cap || !a) return
    const thumb = faceThumb(cap.img, cap.res.faceLandmarks[0], cap.img.width, cap.img.height)
    setState((s) => ({ ...s, progress: [...s.progress, { id: crypto.randomUUID(), date: Date.now(), thumb, analysis: a }] }))
    addXp(20); setSavedAt(cap.at)
  }
  const saved = !!cap && savedAt === cap.at

  const priorities = a ? [...a.metrics].filter((m) => !m.unreliable && m.modifiable !== 'low' && m.score < 90)
    .sort((x, y) => x.score * (x.modifiable === 'high' ? 0.8 : 1) - y.score * (y.modifiable === 'high' ? 0.8 : 1)).slice(0, 3) : []
  const strengths = a ? a.metrics.filter((m) => !m.unreliable && m.score >= 95).slice(0, 5) : []

  return (
    <div className="stack">
      <div>
        <div className="kicker">Анализ лица</div>
        <h1>Пропорции по 478 точкам</h1>
        <p className="lead">Модель находит точки лица прямо на устройстве и измеряет 14 пропорций из эстетической медицины. Фото никуда не отправляется.</p>
      </div>
      <PhotoInput hint="Анфас, нейтральное лицо, губы сомкнуты, мягкий свет" />

      {a && cap && (
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <div className="canvas-wrap"><canvas ref={canvasRef} /></div>
            <p className="tiny muted">Нажмите на метрику, чтобы увидеть, по каким точкам она измерена.</p>
            <div className="card">
              <div className="kicker">Форма лица</div>
              <h2>{a.shape.name}</h2>
              <table className="plain">
                <tbody>
                  <tr><th style={{ width: 90 }}>Стрижка</th><td>{a.shape.hair.join('. ')}</td></tr>
                  {profile.sex === 'male' && <tr><th>Борода</th><td>{a.shape.beard.join('. ')}</td></tr>}
                  <tr><th>Очки</th><td>{a.shape.glasses.join('. ')}</td></tr>
                </tbody>
              </table>
            </div>
            <a className="card" href="#skin"><div className="row between"><div><h3>Проверить кожу на этом фото</h3><div className="small muted">Детектор воспалений и подбор средств</div></div><Icon name="right" /></div></a>
          </div>

          <div className="stack">
            <div className="card">
              <div className="row" style={{ gap: 22, alignItems: 'flex-start' }}>
                <Ring value={a.harmony} size={116} stroke={6} sub="из 100" />
                <div style={{ flex: 1, minWidth: 190 }}>
                  <div className="kicker">Гармония пропорций</div>
                  <p className="small muted">Насколько пропорции попадают в эстетические диапазоны. Считаются только измерения, которым на этом фото можно доверять. Это геометрия одного кадра, а не оценка внешности.</p>
                  <div className="row">
                    <span className={`pill ${scoreClass(a.symmetry)}`}>симметрия {a.symmetry}</span>
                    <span className={`pill ${(a.confidence ?? 100) >= 80 ? 'good' : (a.confidence ?? 100) >= 50 ? 'mid' : 'bad'}`}>точность замера {a.confidence ?? 100}%</span>
                  </div>
                </div>
              </div>
              {a.warnings.map((w) => <div key={w} className="warn small"><b>Точность</b>{w}</div>)}
              <div className="row mt">
                <button className="btn primary" onClick={save} disabled={saved}>{saved ? 'Сохранено' : 'Сохранить замер'}</button>
                <a className="btn ghost" href="#coach">Обсудить с коучем</a>
              </div>
            </div>

            {strengths.length > 0 && (
              <div className="card">
                <div className="kicker">Сильные стороны</div>
                <div className="chips">{strengths.map((m) => <span key={m.id} className="pill good">{m.name}</span>)}</div>
              </div>
            )}

            {priorities.length > 0 && (
              <div className="card">
                <div className="kicker">С чего начать</div>
                {priorities.map((m, i) => {
                  const link = LESSON_FOR[m.id]
                  const les = link?.lesson ? lessonById(link.lesson) : null
                  return (
                    <div key={m.id} className="task">
                      <span className="num muted">{String(i + 1).padStart(2, '0')}</span>
                      <div style={{ flex: 1 }}>
                        <div className="ttl">{m.name}</div>
                        <div className="small muted">{m.levers[0]}</div>
                        <div className="row" style={{ marginTop: 8 }}>
                          {les && <a className="btn sm ghost" href={`#academy/${les.id}`}>Урок: {les.title}</a>}
                          {link?.drill && <a className="btn sm ghost" href={`#trainer/face/${link.drill}`}>Упражнение</a>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="card">
              <div className="kicker">Все измерения</div>
              {a.metrics.map((m) => <MetricRow key={m.id} m={m} open={sel === m.id} onClick={() => setSel(sel === m.id ? null : m.id)} />)}
            </div>
          </div>
        </div>
      )}

      {!a && (
        <div className="grid g3 small">
          <div><div className="kicker">Свет</div>Лицом к окну. Без верхних ламп и резких теней.</div>
          <div><div className="kicker">Ракурс</div>Строго анфас, камера на уровне глаз, с расстояния от метра.</div>
          <div><div className="kicker">Лицо</div>Нейтральное выражение, губы сомкнуты, волосы убраны со лба.</div>
        </div>
      )}
    </div>
  )
}

function MetricRow({ m, open, onClick }: { m: Metric; open: boolean; onClick: () => void }) {
  const off = !!m.unreliable
  return (
    <div className="metric" onClick={onClick}>
      <div className="row between" style={{ flexWrap: 'nowrap', opacity: off ? 0.5 : 1 }}>
        <div>
          <div style={{ fontWeight: 600 }}>{m.name}</div>
          <div className="tiny muted">{off ? `не засчитано: ${m.unreliable}` : `норма ${m.idealDisplay} · ${MOD_LABEL[m.modifiable]}`}</div>
        </div>
        <div className="val" style={{ color: off ? 'var(--muted)' : `var(--${scoreClass(m.score)})` }}>{m.display}</div>
      </div>
      {!off && <div style={{ marginTop: 8 }}><Bar value={m.score} cls={scoreClass(m.score)} /></div>}
      {open && (
        <div className="small" style={{ marginTop: 12 }}>
          <p className="muted">{m.what}</p>
          {off ? <p><b>На этом фото измерение искажено ({m.unreliable}). Переснимите — и оно будет засчитано.</b></p> : <p><b>{m.verdict}</b></p>}
          <ul style={{ paddingLeft: 18, margin: 0 }}>{m.levers.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
