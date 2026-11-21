import { useEffect, useMemo, useRef, useState } from 'react'
import { analyzeSkin, gradeAcne, SEVERITY_NAMES, ZONE_NAMES, type Zone } from '../lib/skin'
import { ACNE_PLANS, AGE_NOTES, SKIN_TYPE_TIPS, SKINCARE_SOURCES, type Product } from '../data/skincare'
import { chat } from '../lib/openrouter'
import { setState, useStore } from '../lib/store'
import { PhotoInput, useCapture } from '../components/PhotoInput'
import { VideoBlock } from '../components/Media'
import { LineChart } from '../components/ui'

const TYPE_NAMES: Record<Product['type'], string> = { cleanser: 'Очищение', treatment: 'Лечение', moisturizer: 'Увлажнение', spf: 'Защита от солнца', spot: 'Точечно' }
const LIGHT = { ok: null, dark: 'Фото тёмное — часть воспалений может быть не видна.', bright: 'Фото пересвечено — краснота теряется.', uneven: 'Свет падает сбоку: на теневой стороне результат менее точен.' }

const AI_PROMPT = `Ты помощник дерматолога в приложении по уходу за собой. Посмотри на фото лица и опиши кожу по-русски, кратко и по делу, без оценок внешности:
1) Высыпания: типы (комедоны, папулы, пустулы, узлы), примерное количество и зоны.
2) Степень акне: чистая / лёгкая / средняя / тяжёлая.
3) Следы постакне, покраснение, жирность или сухость, если видны.
4) Что на фото мешает оценке (свет, резкость, макияж).
5) Нужно ли идти к дерматологу и почему.
Не ставь диагнозов и не назначай рецептурные препараты. Не пытайся определить, кто на фото.`

export default function Skin() {
  const profile = useStore((s) => s.profile)
  const settings = useStore((s) => s.settings)
  const history = useStore((s) => s.skin)
  const cap = useCapture()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [off, setOff] = useState<number[]>([])
  const [savedAt, setSavedAt] = useState(0)
  const [ai, setAi] = useState<{ at: number; text?: string; err?: string; busy?: boolean } | null>(null)

  const res = useMemo(() => (cap ? analyzeSkin(cap.img, cap.res.faceLandmarks[0]) : null), [cap])
  useEffect(() => { setOff([]) }, [cap])
  const spots = useMemo(() => (res ? res.spots.filter((s) => !off.includes(s.id)) : []), [res, off])
  const grade = useMemo(() => gradeAcne(spots), [spots])
  const plan = ACNE_PLANS[grade.severity]
  const ageNote = AGE_NOTES.find((n) => profile.age >= n.min && profile.age <= n.max)

  useEffect(() => {
    const c = canvasRef.current
    if (!c || !cap || !res) return
    c.width = cap.img.width; c.height = cap.img.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(cap.img, 0, 0)
    ctx.lineWidth = Math.max(2, c.width / 420)
    for (const s of res.spots) {
      const on = !off.includes(s.id)
      ctx.strokeStyle = !on ? 'rgba(255,255,255,.35)' : s.kind === 'inflamed' ? '#ff5a3c' : '#ffd24a'
      ctx.setLineDash(on ? [] : [4, 4])
      ctx.beginPath()
      ctx.arc(s.x * c.width, s.y * c.height, Math.max(s.r * c.width, c.width / 110), 0, Math.PI * 2)
      ctx.stroke()
    }
  }, [cap, res, off])

  function onClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!res) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height
    const aspect = r.height / r.width
    let best: { id: number; d: number } | null = null
    for (const s of res.spots) {
      const d = Math.hypot(s.x - x, (s.y - y) * aspect)
      if (d < Math.max(s.r * 1.6, 0.025) && (!best || d < best.d)) best = { id: s.id, d }
    }
    if (best) { const id = best.id; setOff((o) => (o.includes(id) ? o.filter((v) => v !== id) : [...o, id])) }
  }

  function save() {
    if (!res || !cap) return
    setState((s) => ({ ...s, xp: s.xp + 10, skin: [...s.skin, { date: Date.now(), severity: grade.severity, inflamed: grade.inflamed, marks: grade.marks, redness: res.redness, evenness: res.evenness }] }))
    setSavedAt(cap.at)
  }

  async function secondOpinion() {
    if (!cap) return
    setAi({ at: cap.at, busy: true })
    try {
      const k = Math.min(1, 1024 / Math.max(cap.img.width, cap.img.height))
      const c = document.createElement('canvas'); c.width = cap.img.width * k; c.height = cap.img.height * k
      c.getContext('2d')!.drawImage(cap.img, 0, 0, c.width, c.height)
      const text = await chat({ key: settings.openrouterKey, model: settings.model, system: AI_PROMPT, messages: [{ role: 'user', content: `Возраст ${profile.age}, тип кожи: ${profile.skin}. Автоматический детектор нашёл воспалений: ${grade.inflamed}, следов: ${grade.marks}.`, image: c.toDataURL('image/jpeg', 0.88) }] })
      setAi({ at: cap.at, text })
    } catch (e) { setAi({ at: cap.at, err: (e as Error).message }) }
  }

  const products = plan.products
  const saved = !!cap && savedAt === cap.at

  return (
    <div className="stack">
      <div>
        <div className="kicker">Кожа</div>
        <h1>Детектор воспалений</h1>
        <p className="lead">Находит покрасневшие участки на коже лица, считает их по зонам и подбирает схему ухода под степень и возраст. Считается на устройстве.</p>
      </div>
      <PhotoInput hint="Без макияжа, дневной свет спереди, чёткий кадр крупным планом" />

      {res && cap && (
        <>
          <div className="grid g2" style={{ alignItems: 'start' }}>
            <div className="stack">
              <div className="canvas-wrap"><canvas ref={canvasRef} onClick={onClick} style={{ cursor: 'pointer' }} /></div>
              <div className="row tiny muted">
                <span><span style={{ color: '#ff5a3c' }}>●</span> воспаление</span>
                <span><span style={{ color: '#d6a400' }}>●</span> след или слабое покраснение</span>
                <span>Нажмите на отметку, если это родинка или ошибка.</span>
              </div>
              {LIGHT[res.lighting] && <div className="warn small"><b>Свет</b>{LIGHT[res.lighting]}</div>}
            </div>
            <div className="stack">
              <div className="card">
                <div className="kicker">Результат</div>
                <h2>{SEVERITY_NAMES[grade.severity]}</h2>
                <div className="grid g4" style={{ marginTop: 14 }}>
                  <div><div className="label">Воспаления</div><div className="stat">{grade.inflamed}</div></div>
                  <div><div className="label">Следы</div><div className="stat">{grade.marks}</div></div>
                  <div><div className="label">Краснота</div><div className="stat">{res.redness}</div></div>
                  <div><div className="label">Ровность тона</div><div className="stat">{res.evenness}</div></div>
                </div>
                <hr className="rule" />
                <table className="plain">
                  <tbody>{(Object.keys(ZONE_NAMES) as Zone[]).map((z) => <tr key={z}><td>{ZONE_NAMES[z]}</td><td className="num" style={{ textAlign: 'right' }}>{grade.byZone[z]}</td></tr>)}</tbody>
                </table>
                <p className="tiny muted mt">Детектор видит покраснения, а не диагноз. Закрытые комедоны, подкожные узлы и высыпания под бородой он пропускает; румянец и родинки может принять за воспаление.</p>
                <div className="row">
                  <button className="btn primary" onClick={save} disabled={saved}>{saved ? 'Сохранено' : 'Сохранить замер'}</button>
                  {settings.openrouterKey
                    ? <button className="btn ghost" onClick={secondOpinion} disabled={ai?.busy}>{ai?.busy ? 'Модель смотрит фото…' : 'Второе мнение от ИИ'}</button>
                    : <a className="btn ghost" href="#profile">Подключить ИИ для второго мнения</a>}
                </div>
                {settings.openrouterKey && <p className="tiny muted" style={{ marginTop: 8 }}>Второе мнение отправляет это фото в OpenRouter ({settings.model}).</p>}
              </div>
              {ai && ai.at === cap.at && (ai.text || ai.err) && (
                <div className="card">
                  <div className="kicker">Второе мнение · {settings.model}</div>
                  {ai.err ? <div className="warn small"><b>Ошибка</b>{ai.err}</div> : <div className="small" style={{ whiteSpace: 'pre-wrap' }}>{ai.text}</div>}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="kicker">Схема ухода · {plan.title}</div>
            <p className="lead" style={{ fontSize: 16 }}>{plan.summary}</p>
            <div className="grid g2">
              <div><div className="label">Утро</div><ol className="small" style={{ paddingLeft: 18, margin: 0 }}>{plan.am.map((x) => <li key={x}>{x}</li>)}</ol></div>
              <div><div className="label">Вечер</div><ol className="small" style={{ paddingLeft: 18, margin: 0 }}>{plan.pm.map((x) => <li key={x}>{x}</li>)}</ol></div>
            </div>
            <hr className="rule" />
            <div className="label">Что купить</div>
            <table className="plain">
              <thead><tr><th>Средство</th><th>Действующее вещество</th><th>Как применять</th></tr></thead>
              <tbody>
                {products.map((p) => {
                  const young = p.minAge != null && profile.age < p.minAge
                  return (
                    <tr key={p.name} style={young ? { opacity: 0.5 } : undefined}>
                      <td style={{ minWidth: 170 }}><b>{p.name}</b><div className="tiny muted">{TYPE_NAMES[p.type]} · {p.price}</div>
                        <div className="row" style={{ gap: 4, marginTop: 4 }}>
                          {p.rx && <span className="pill bad">по рецепту</span>}
                          {p.minAge != null && <span className={`pill ${young ? 'bad' : ''}`}>с {p.minAge} лет</span>}
                        </div>
                      </td>
                      <td>{p.active}</td>
                      <td>{young ? 'По инструкции не подходит по возрасту — спросите врача.' : p.how}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className="grid g2 mt small">
              <div><div className="label">Когда ждать результат</div>{plan.timeline}</div>
              <div><div className="label">Когда к дерматологу</div>{plan.doctor}</div>
            </div>
          </div>
        </>
      )}

      <div className="grid g2" style={{ alignItems: 'start' }}>
        {ageNote && (
          <div className="card">
            <div className="kicker">Ваш возраст · {profile.age}</div>
            <h3>{ageNote.title}</h3>
            <div className="label mt">На чём сосредоточиться</div>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>{ageNote.focus.map((x) => <li key={x}>{x}</li>)}</ul>
            <div className="label mt">Чего не делать</div>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>{ageNote.avoid.map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
        )}
        <div className="stack">
          <div className="card">
            <div className="kicker">Ваш тип кожи</div>
            <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>{SKIN_TYPE_TIPS[profile.skin].map((x) => <li key={x}>{x}</li>)}</ul>
          </div>
          <div className="card">
            <div className="kicker">Видео от дерматологов</div>
            <VideoBlock topic="spf-apply" query="сколько наносить солнцезащитного крема" />
            <hr className="rule" />
            <VideoBlock topic="retinoid-start" query="как начать ретиноиды адапален" />
          </div>
        </div>
      </div>

      {history.length > 1 && (
        <div className="card">
          <div className="kicker">Динамика воспалений</div>
          <LineChart height={130} series={[{ name: 'Воспаления', color: 'var(--bad)', points: history.map((h) => ({ x: h.date, y: h.inflamed })) }]} />
        </div>
      )}

      <details className="small muted">
        <summary>Источники рекомендаций</summary>
        <ul style={{ paddingLeft: 18 }}>{SKINCARE_SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul>
        <p>Информация справочная и не заменяет приём врача. Наличие и условия отпуска препаратов меняются — сверяйтесь с инструкцией.</p>
      </details>
    </div>
  )
}
