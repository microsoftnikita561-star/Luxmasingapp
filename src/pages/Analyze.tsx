import { useEffect, useRef, useState } from 'react'
import { getImageLandmarker, headPose, type FaceLandmarkerResult } from '../lib/face'
import { analyze, type Analysis, type Metric } from '../lib/metrics'
import { addXp, setState, useStore } from '../lib/store'
import { drawLines, drawMesh, faceThumb } from '../components/draw'
import { Bar, Ring, scoreClass } from '../components/ui'
import { lessonById } from '../data/courses'

const LESSON_FOR: Record<string, { lesson?: string; drill?: string }> = {
  symmetry: { lesson: 'face-posture' },
  canthal: { lesson: 'hair-brows' },
  fwhr: { lesson: 'body-fat' },
  midface: { lesson: 'hair-cut' },
  esr: { lesson: 'hair-brows' },
  thirds: { lesson: 'hair-beard' },
  chin: { lesson: 'face-posture', drill: 'chin' },
  jaw: { lesson: 'body-fat' },
  nose: { lesson: 'hardmaxxing' },
  mouth: { drill: 'duchenne' },
  fifths: { lesson: 'hair-brows' },
  eyeopen: { lesson: 'mind-photo', drill: 'squinch' },
  lips: { lesson: 'face-teeth' },
  brow: { lesson: 'hair-brows', drill: 'calm' },
}

const MOD_LABEL = { high: 'Легко улучшить', medium: 'Частично улучшаемо', low: 'Костная основа' }

let lastResult: { img: HTMLCanvasElement; res: FaceLandmarkerResult; analysis: Analysis } | null = null

export default function Analyze() {
  const profile = useStore((s) => s.profile)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState(lastResult)
  const [sel, setSel] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [cam, setCam] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => { getImageLandmarker().catch(() => {}) }, [])
  useEffect(() => () => stopCam(), [])

  // Перерисовка
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !data) return
    const { img, res, analysis } = data
    c.width = img.width; c.height = img.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    const lms = res.faceLandmarks[0]
    drawMesh(ctx, lms, c.width, c.height)
    const m = analysis.metrics.find((x) => x.id === sel)
    const pairs = m ? m.lines : analysis.metrics.slice(1, 8).flatMap((x) => x.lines)
    drawLines(ctx, lms, c.width, c.height, pairs, m ? '#e6c27a' : 'rgba(143,123,255,.85)')
  }, [data, sel])

  async function runOn(source: HTMLImageElement | HTMLVideoElement, w: number, h: number) {
    setError(null); setSaved(false); setSel(null)
    setBusy('Загружаю нейросеть (первый раз ~5 сек)…')
    try {
      const lm = await getImageLandmarker()
      setBusy('Ищу 478 точек лица…')
      const scale = Math.min(1, 1280 / Math.max(w, h))
      let img = document.createElement('canvas')
      img.width = Math.round(w * scale); img.height = Math.round(h * scale)
      img.getContext('2d')!.drawImage(source, 0, 0, img.width, img.height)
      let res = lm.detect(img)
      if (!res.faceLandmarks.length) { setError('Лицо не найдено. Нужна чёткая фотография анфас при хорошем освещении.'); setBusy(null); return }
      // Лицо мелкое → вырезаем область вокруг лица и детектим повторно (точнее и нагляднее)
      {
        const l = res.faceLandmarks[0]
        let x0 = 1, y0 = 1, x1 = 0, y1 = 0
        for (const q of l) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y) }
        if (y1 - y0 < 0.5) {
          const cx = ((x0 + x1) / 2) * img.width, cy = ((y0 + y1) / 2) * img.height
          const side = Math.min(Math.max(img.width, img.height), (y1 - y0) * img.height * 1.7)
          const sx = Math.max(0, cx - side / 2), sy = Math.max(0, cy - side / 2)
          const sw = Math.min(img.width - sx, side), sh = Math.min(img.height - sy, side)
          const k = Math.min(1280 / Math.max(sw, sh), 3)
          const crop = document.createElement('canvas')
          crop.width = Math.round(sw * k); crop.height = Math.round(sh * k)
          const cctx = crop.getContext('2d')!
          cctx.imageSmoothingQuality = 'high'
          cctx.drawImage(img, sx, sy, sw, sh, 0, 0, crop.width, crop.height)
          const r2 = lm.detect(crop)
          if (r2.faceLandmarks.length) { res = r2; img = crop }
        }
      }
      const analysis = analyze(res.faceLandmarks[0], img.width, img.height, profile.sex, headPose(res))
      lastResult = { img, res, analysis }
      setData(lastResult)
    } catch (e) {
      setError('Ошибка нейросети: ' + (e as Error).message)
    }
    setBusy(null)
  }

  async function onFile(f: File) {
    const url = URL.createObjectURL(f)
    const im = new Image()
    im.onload = () => { runOn(im, im.naturalWidth, im.naturalHeight); URL.revokeObjectURL(url) }
    im.onerror = () => setError('Не удалось открыть изображение')
    im.src = url
  }

  async function startCam() {
    setError(null)
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } } })
      streamRef.current = s
      setCam(true)
      setTimeout(() => { if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play() } }, 0)
    } catch {
      setError('Нет доступа к камере. Разрешите доступ или загрузите фото.')
    }
  }
  function stopCam() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setCam(false)
  }
  function snap() {
    const v = videoRef.current
    if (!v) return
    runOn(v, v.videoWidth, v.videoHeight)
    stopCam()
  }

  function save() {
    if (!data) return
    const thumb = faceThumb(data.img, data.res.faceLandmarks[0], data.img.width, data.img.height)
    setState((s) => ({ ...s, progress: [...s.progress, { id: crypto.randomUUID(), date: Date.now(), thumb, analysis: data.analysis }] }))
    addXp(20)
    setSaved(true)
  }

  const a = data?.analysis
  const priorities = a
    ? [...a.metrics].filter((m) => m.modifiable !== 'low' && m.score < 90).sort((x, y) => x.score * (x.modifiable === 'high' ? 0.8 : 1) - y.score * (y.modifiable === 'high' ? 0.8 : 1)).slice(0, 3)
    : []
  const strengths = a ? [...a.metrics].filter((m) => m.score >= 95).slice(0, 4) : []

  return (
    <div className="stack">
      <div>
        <h1>ИИ-анализ лица</h1>
        <p className="muted">Нейросеть MediaPipe Face Landmarker находит 478 точек лица прямо на устройстве и измеряет 14 ключевых пропорций, которые используют в эстетической медицине и луксмаксинге.</p>
      </div>

      {!cam && (
        <div className="grid g2">
          <div className="drop" onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}>
            <div style={{ fontSize: 34 }}>🖼️</div>
            <b>Загрузить фото</b>
            <div className="small muted">Анфас, без улыбки, губы сомкнуты, мягкий свет</div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
          </div>
          <div className="drop" onClick={startCam}>
            <div style={{ fontSize: 34 }}>📷</div>
            <b>Снять с камеры</b>
            <div className="small muted">Держите телефон на уровне глаз, на расстоянии вытянутой руки или дальше</div>
          </div>
        </div>
      )}

      {cam && (
        <div className="card stack">
          <div className="canvas-wrap" style={{ maxWidth: 560, margin: '0 auto' }}>
            <video ref={videoRef} playsInline muted style={{ transform: 'scaleX(-1)' }} />
          </div>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn primary" onClick={snap}>📸 Сделать снимок</button>
            <button className="btn" onClick={stopCam}>Отмена</button>
          </div>
        </div>
      )}

      {busy && <div className="card center">⏳ {busy}</div>}
      {error && <div className="warn">{error}</div>}

      {a && data && (
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <div className="stack">
            <div className="canvas-wrap"><canvas ref={canvasRef} /></div>
            <p className="tiny muted">Нажмите на метрику справа, чтобы увидеть, по каким точкам она измерена.</p>
            <div className="card">
              <h3>Форма лица: <span style={{ color: 'var(--gold)' }}>{a.shape.name}</span></h3>
              <p className="small muted">Стрижка, борода и очки, которые гармонизируют пропорции:</p>
              <b className="small">💈 Причёска</b>
              <ul className="small">{a.shape.hair.map((x) => <li key={x}>{x}</li>)}</ul>
              {profile.sex === 'male' && <><b className="small">🧔 Борода</b><ul className="small">{a.shape.beard.map((x) => <li key={x}>{x}</li>)}</ul></>}
              <b className="small">👓 Очки</b>
              <ul className="small">{a.shape.glasses.map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>

          <div className="stack">
            <div className="card glow">
              <div className="row" style={{ gap: 20 }}>
                <Ring value={a.harmony} size={130} sub="гармония" />
                <div style={{ flex: 1, minWidth: 180 }}>
                  <h2 style={{ marginBottom: 4 }}>Гармония пропорций: {a.harmony}</h2>
                  <p className="small muted">Насколько пропорции попадают в эстетические диапазоны. Это не «оценка красоты»: кожа, волосы, жир, мимика и стиль влияют сильнее — и именно их тренирует программа.</p>
                  <div className="row">
                    <span className={`pill ${scoreClass(a.symmetry)}`}>Симметрия {a.symmetry}</span>
                    {a.pose && <span className="pill">Поворот {a.pose.yaw.toFixed(0)}°</span>}
                  </div>
                </div>
              </div>
              {a.warnings.map((w) => <div key={w} className="warn small">{w}</div>)}
              <div className="row mt">
                <button className="btn primary" onClick={save} disabled={saved}>{saved ? '✓ Сохранено в прогресс' : '💾 Сохранить в прогресс (+20 XP)'}</button>
                <a className="btn" href="#coach">🤖 Обсудить с коучем</a>
              </div>
            </div>

            {strengths.length > 0 && (
              <div className="card">
                <h3>💎 Сильные стороны</h3>
                <div className="chips">{strengths.map((m) => <span key={m.id} className="pill good">{m.name}</span>)}</div>
              </div>
            )}

            {priorities.length > 0 && (
              <div className="card">
                <h3>🎯 Приоритеты на ближайшие недели</h3>
                {priorities.map((m) => {
                  const link = LESSON_FOR[m.id]
                  const les = link?.lesson ? lessonById(link.lesson) : null
                  return (
                    <div key={m.id} className="task">
                      <div style={{ flex: 1 }}>
                        <div className="ttl">{m.name}</div>
                        <div className="small muted">{m.levers[0]}</div>
                        <div className="row" style={{ marginTop: 6 }}>
                          {les && <a className="btn sm" href={`#academy/${les.id}`}>🎓 {les.title}</a>}
                          {link?.drill && <a className="btn sm" href={`#trainer/${link.drill}`}>🎯 Тренажёр</a>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="card">
              <h3>Все метрики</h3>
              <div className="stack" style={{ marginTop: 10 }}>
                {a.metrics.map((m) => <MetricCard key={m.id} m={m} open={sel === m.id} onClick={() => setSel(sel === m.id ? null : m.id)} />)}
              </div>
            </div>
          </div>
        </div>
      )}

      {!a && !busy && (
        <div className="card">
          <h3>Как получить точный результат</h3>
          <div className="grid g3 small">
            <div>☀️ <b>Свет</b><br /><span className="muted">Лицом к окну, без верхних ламп и резких теней.</span></div>
            <div>📐 <b>Ракурс</b><br /><span className="muted">Строго анфас, камера на уровне глаз, голова не наклонена.</span></div>
            <div>😐 <b>Мимика</b><br /><span className="muted">Нейтральное лицо, губы сомкнуты, брови расслаблены. Волосы убраны со лба.</span></div>
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ m, open, onClick }: { m: Metric; open: boolean; onClick: () => void }) {
  return (
    <div className={`metric ${open ? 'open' : ''}`} onClick={onClick}>
      <div className="row between">
        <div>
          <div style={{ fontWeight: 650 }}>{m.name}</div>
          <div className="tiny muted">норма {m.idealDisplay} · {MOD_LABEL[m.modifiable]}</div>
        </div>
        <div className="val" style={{ color: `var(--${scoreClass(m.score)})` }}>{m.display}</div>
      </div>
      <div style={{ marginTop: 8 }}><Bar value={m.score} cls={scoreClass(m.score)} /></div>
      {open && (
        <div className="small" style={{ marginTop: 10 }}>
          <p className="muted">{m.what}</p>
          <p><b>{m.verdict}</b></p>
          <b>Что можно сделать:</b>
          <ul>{m.levers.map((l) => <li key={l}>{l}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
