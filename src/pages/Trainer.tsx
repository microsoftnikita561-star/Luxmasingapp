import { useEffect, useRef, useState } from 'react'
import { DRILLS, type Drill, type DrillEval } from '../data/drills'
import { blendshapeMap, getVideoLandmarker, headPose } from '../lib/face'
import { addXp, setState, today, useStore } from '../lib/store'
import { drawMesh } from '../components/draw'
import { Bar, scoreClass } from '../components/ui'
import { Icon } from '../components/Icon'
import { ExerciseDemo, VideoBlock } from '../components/Media'
import { WORKOUTS, type Workout } from '../data/exercises'

export default function Trainer({ param }: { param?: string }) {
  const best = useStore((s) => s.drills)
  const [tab, sub] = (param || 'face').split('/')
  const drill = tab === 'face' ? DRILLS.find((d) => d.id === sub) : undefined
  if (drill) return <DrillRun key={drill.id} drill={drill} />
  const workout = WORKOUTS.find((w) => w.id === tab)
  return (
    <div className="stack">
      <div>
        <div className="kicker">Тренировки</div>
        <h1>{workout ? workout.name : 'Мимика и ракурс'}</h1>
        <p className="lead">{workout ? workout.desc : 'Камера следит за 52 мышечными показателями лица и сразу говорит, что поправить: взгляд, улыбку, лоб, положение подбородка.'}</p>
      </div>
      <nav className="tabs">
        <a href="#trainer/face" className={!workout ? 'active' : ''}>Мимика с камерой</a>
        {WORKOUTS.map((w) => <a key={w.id} href={`#trainer/${w.id}`} className={workout?.id === w.id ? 'active' : ''}>{w.name}</a>)}
      </nav>
      {!workout && (
        <>
          <div className="grid g2">
            {DRILLS.map((d) => (
              <a key={d.id} href={`#trainer/face/${d.id}`} className="card">
                <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
                  <h3 style={{ margin: 0 }}>{d.name}</h3>
                  {best[d.id] != null && <span className="pill gold">лучшее {best[d.id]}%</span>}
                </div>
                <p className="small muted" style={{ marginTop: 8 }}>{d.goal}</p>
                <span className="xp">{d.reps} × {d.holdSec} сек · +15 XP</span>
              </a>
            ))}
          </div>
          <p className="tiny muted">Видео с камеры не записывается и не покидает устройство.</p>
        </>
      )}
      {workout && <WorkoutView w={workout} />}
    </div>
  )
}

function WorkoutView({ w }: { w: Workout }) {
  const doneMap = useStore((s) => s.done)
  const key = `workout-${w.id}`
  const done = (doneMap[today()] ?? []).includes(key)
  const [open, setOpen] = useState<string | null>(null)
  const xp = w.id === 'posture' ? 10 : 25
  const finish = () => setState((s) => {
    const d = today(); const cur = s.done[d] ?? []
    if (cur.includes(key)) return s
    const linked = w.id === 'posture' ? 'posture' : 'train'
    return { ...s, xp: s.xp + xp, done: { ...s.done, [d]: [...new Set([...cur, key, linked])] } }
  })
  return (
    <div className="stack">
      <div className="row between">
        <span className="muted small">{w.items.length} упражнений · около {w.minutes} мин</span>
        <button className="btn primary" onClick={finish} disabled={done}>{done ? 'Выполнено сегодня' : `Отметить выполненной · +${xp} XP`}</button>
      </div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        {w.items.map((ex, i) => (
          <div key={ex.id} className="card">
            <ExerciseDemo ex={ex} />
            <div className="row between mt" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
              <h3 style={{ margin: 0 }}><span className="num muted" style={{ marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>{ex.name}</h3>
              <span className="xp">{ex.dose}</span>
            </div>
            <p className="small muted" style={{ marginTop: 6 }}>{ex.why}</p>
            <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>{ex.cues.map((c) => <li key={c}>{c}</li>)}</ol>
            <div className="mt">
              {open === ex.id
                ? <VideoBlock topic={ex.video} query={`${ex.name} техника выполнения`} />
                : <button className="btn sm ghost" onClick={() => setOpen(ex.id)}><Icon name="video" />Видео техники</button>}
            </div>
          </div>
        ))}
      </div>
      <p className="tiny muted">Фото упражнений — открытая база free-exercise-db (общественное достояние). Если есть травмы шеи или спины, сначала покажитесь врачу.</p>
    </div>
  )
}

function DrillRun({ drill }: { drill: Drill }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'run' | 'done' | 'error'>('idle')
  const [ev, setEv] = useState<DrillEval | null>(null)
  const [hold, setHold] = useState(0)
  const [rep, setRep] = useState(0)
  const [noFace, setNoFace] = useState(false)
  const [quality, setQuality] = useState(0)
  const stop = useRef<() => void>(() => {})

  useEffect(() => () => stop.current(), [])

  async function start() {
    setStatus('loading'); setRep(0); setHold(0)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } } })
    } catch { setStatus('error'); return }
    const lm = await getVideoLandmarker()
    const v = videoRef.current!
    v.srcObject = stream
    await v.play()
    setStatus('run')
    let raf = 0, alive = true
    let lastT = performance.now(), holdMs = 0, reps = 0, cooldown = 0
    let baseSum = 0, baseN = 0, baseChin: number | null = null
    const startT = performance.now()
    const qual: number[] = []
    stop.current = () => { alive = false; cancelAnimationFrame(raf); stream.getTracks().forEach((t) => t.stop()) }

    const loop = () => {
      if (!alive) return
      const now = performance.now()
      const dt = now - lastT; lastT = now
      if (v.readyState >= 2) {
        const res = lm.detectForVideo(v, now)
        const c = canvasRef.current!
        if (c.width !== v.videoWidth) { c.width = v.videoWidth; c.height = v.videoHeight }
        const ctx = c.getContext('2d')!
        ctx.clearRect(0, 0, c.width, c.height)
        const lms = res.faceLandmarks[0]
        if (lms) {
          setNoFace(false)
          drawMesh(ctx, lms, c.width, c.height, { mirror: true, color: 'rgba(255,255,255,.3)' })
          const pose = headPose(res) ?? { yaw: 0, pitch: 0, roll: 0 }
          const eyeY = (lms[468].y + lms[473].y) / 2
          const chinRatio = (lms[4].y - eyeY) / Math.max(1e-3, lms[152].y - eyeY)
          if (now - startT < 1200) { baseSum += chinRatio; baseN++ } else if (!baseChin && baseN) baseChin = baseSum / baseN
          const e = drill.evaluate(blendshapeMap(res), { yaw: pose.yaw, roll: pose.roll, chinRatio, baseChin })
          setEv(e)
          if (cooldown > 0) cooldown -= dt
          else if (e.ok && e.score > 0.7) {
            holdMs += dt; qual.push(e.score)
            if (holdMs >= drill.holdSec * 1000) {
              reps++; holdMs = 0; cooldown = 1200
              setRep(reps)
              if (reps >= drill.reps) {
                const q = Math.round((qual.reduce((s, x) => s + x, 0) / qual.length) * 100)
                setQuality(q)
                finish(q)
                stop.current()
                setStatus('done')
                return
              }
            }
          } else holdMs = Math.max(0, holdMs - dt * 2)
          setHold(holdMs / (drill.holdSec * 1000))
        } else setNoFace(true)
      }
      raf = requestAnimationFrame(loop)
    }
    loop()
  }

  function finish(q: number) {
    addXp(15)
    setState((s) => {
      const d = today()
      const done = s.done[d] ?? []
      return {
        ...s,
        drills: { ...s.drills, [drill.id]: Math.max(s.drills[drill.id] ?? 0, q) },
        done: done.includes('drill-face') ? s.done : { ...s.done, [d]: [...done, 'drill-face'] },
        xp: done.includes('drill-face') ? s.xp : s.xp + 15,
      }
    })
  }

  return (
    <div className="stack">
      <a href="#trainer/face" className="small muted">← Все упражнения</a>
      <h1>{drill.name}</h1>
      <p className="lead">{drill.goal}</p>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="canvas-wrap">
          <video ref={videoRef} playsInline muted style={{ transform: 'scaleX(-1)' }} />
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          {status !== 'run' && (
            <div className="overlay-msg">
              {status === 'idle' && <button className="btn primary" onClick={start}><Icon name="play" />Включить камеру</button>}
              {status === 'loading' && <div>Загружаю модель…</div>}
              {status === 'error' && <div>Нет доступа к камере.<br /><button className="btn mt" onClick={start}>Повторить</button></div>}
              {status === 'done' && (
                <div>
                  <h2>Готово! Качество {quality}%</h2>
                  <p className="muted">+15 XP. Повторяйте ежедневно — через 2–3 недели выражение станет привычным.</p>
                  <div className="row" style={{ justifyContent: 'center' }}>
                    <button className="btn primary" onClick={start}>Ещё раз</button>
                    <a className="btn" href="#trainer/face">Другие упражнения</a>
                  </div>
                </div>
              )}
            </div>
          )}
          {status === 'run' && noFace && <div className="overlay-msg">Лицо не видно — посмотрите в камеру</div>}
        </div>
        <div className="stack">
          <div className="card">
            <div className="row between"><b>Повтор {Math.min(rep + 1, drill.reps)} / {drill.reps}</b><span className="muted small">удерживайте {drill.holdSec} сек</span></div>
            <div style={{ marginTop: 10 }}><Bar value={hold * 100} cls="good" /></div>
            <div className="row between" style={{ marginTop: 14 }}><b>Точность</b><span>{ev ? Math.round(ev.score * 100) : 0}%</span></div>
            <div style={{ marginTop: 6 }}><Bar value={(ev?.score ?? 0) * 100} cls={scoreClass((ev?.score ?? 0) * 100)} /></div>
            <div style={{ marginTop: 12, minHeight: 50 }}>
              {status === 'run' && ev && (ev.ok ? <div className="pill good">Отлично, держите</div> : ev.hints.map((h) => <div key={h} className="pill mid" style={{ marginRight: 6, marginBottom: 6 }}>{h}</div>))}
            </div>
          </div>
          <div className="card">
            <div className="kicker">Техника</div>
            <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>{drill.how.map((h) => <li key={h}>{h}</li>)}</ol>
          </div>
          <div className="card">
            <div className="kicker">Как это выглядит</div>
            <VideoBlock topic={drill.video} query={`${drill.name} как делать для фото`} />
          </div>
        </div>
      </div>
    </div>
  )
}
