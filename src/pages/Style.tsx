import { useMemo, useState } from 'react'
import { BUDGETS, HAIR_TYPES, LEN_NAMES, STYLE_SOURCES, VIBES, pickHaircuts, pickOutfits, type Budget, type HairType, type Haircut, type Len, type Outfit, type Ranked, type Vibe } from '../data/styles'
import { SHAPES, analyze } from '../lib/metrics'
import { headPose } from '../lib/face'
import { generateImage } from '../lib/openrouter'
import { setState, useStore } from '../lib/store'
import { useCapture } from '../components/PhotoInput'
import { Icon } from '../components/Icon'

const TABS = [['hair', 'Причёска'], ['outfit', 'Одежда']] as const

export default function Style({ param }: { param?: string }) {
  const tab = param === 'outfit' ? 'outfit' : 'hair'
  return (
    <div className="stack">
      <div>
        <div className="kicker">Стиль</div>
        <h1>{tab === 'hair' ? 'Причёска под вас' : 'Стиль одежды под вас'}</h1>
        <p className="lead">{tab === 'hair'
          ? 'Подбор из стрижек, которые реально носят сейчас: под форму лица, тип волос и время на укладку. С готовой фразой для барбера и примеркой на вашем фото.'
          : 'Подбор из стилей, которые сейчас носят подростки: под настроение, бюджет и школьные правила. С капсулой вещей и картинкой образа.'}</p>
      </div>
      <nav className="tabs">{TABS.map(([id, name]) => <a key={id} href={`#style/${id}`} className={tab === id ? 'active' : ''}>{name}</a>)}</nav>
      {tab === 'hair' ? <HairTab /> : <OutfitTab />}
      <details className="small muted">
        <summary>Откуда данные о трендах</summary>
        <p>Каталог собран в ноябре 2026 по обзорам барбершопов и модных медиа. Точной статистики по подросткам нет: источники — в основном редакционные подборки, и они не всегда сходятся. Тренды меняются за 1–2 года, поэтому посадка и уход важнее названия стиля.</p>
        <ul style={{ paddingLeft: 18 }}>{STYLE_SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.title}</a></li>)}</ul>
      </details>
    </div>
  )
}

function Chips<T extends string>({ value, options, onChange }: { value: T; options: Record<T, string>; onChange: (v: T) => void }) {
  return <div className="chips">{(Object.keys(options) as T[]).map((k) => <button key={k} className={`chip ${value === k ? 'on' : ''}`} onClick={() => onChange(k)}>{options[k]}</button>)}</div>
}

function HairTab() {
  const profile = useStore((s) => s.profile)
  const st = useStore((s) => s.style)
  const lastShape = useStore((s) => s.progress[s.progress.length - 1]?.analysis.shape.id ?? null)
  const cap = useCapture()
  const capShape = useMemo(() => (cap ? analyze(cap.res.faceLandmarks[0], cap.img.width, cap.img.height, profile.sex, headPose(cap.res)).shape.id : null), [cap, profile.sex])
  const shape = st.shape ?? capShape ?? lastShape
  const set = (p: Partial<typeof st>) => setState((s) => ({ ...s, style: { ...s.style, ...p } }))
  const ranked = useMemo(() => pickHaircuts({ sex: profile.sex, shape, type: st.hairType, len: st.hairLen, minutes: st.minutes, strict: st.strict }), [profile.sex, shape, st])

  return (
    <div className="stack">
      <div className="card stack">
        <div><label>Тип волос</label><Chips<HairType> value={st.hairType} options={HAIR_TYPES} onChange={(v) => set({ hairType: v })} /></div>
        <div><label>Длина сейчас (сверху)</label><Chips<Len> value={st.hairLen} options={LEN_NAMES} onChange={(v) => set({ hairLen: v })} /></div>
        <div><label>Сколько минут готовы тратить на укладку утром</label>
          <Chips value={String(st.minutes)} options={{ '0': 'Нисколько', '3': 'До 3 минут', '7': 'До 7 минут', '15': 'Сколько нужно' }} onChange={(v) => set({ minutes: Number(v) })} /></div>
        <div><label>Форма лица</label>
          <div className="chips">
            {(Object.keys(SHAPES) as (keyof typeof SHAPES)[]).map((k) => <button key={k} className={`chip ${shape === k ? 'on' : ''}`} onClick={() => set({ shape: k })}>{SHAPES[k].name}</button>)}
          </div>
          <p className="tiny muted" style={{ marginTop: 6 }}>{st.shape ? 'Выбрано вручную.' : capShape || lastShape ? 'Определено по вашему фото в «Анализе лица». Можно поправить.' : <>Не знаете? <a href="#analyze">Сделайте анализ лица</a> — форма определится сама.</>}</p>
        </div>
        <label style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink)', display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={st.strict} onChange={(e) => set({ strict: e.target.checked })} />В школе строгие правила к внешнему виду
        </label>
      </div>

      {ranked.slice(0, 4).map((r, i) => <HairCard key={r.item.id} r={r} rank={i} />)}
      {ranked.length > 4 && (
        <details><summary className="small muted">Остальные варианты ({ranked.length - 4})</summary><div className="stack mt">{ranked.slice(4).map((r, i) => <HairCard key={r.item.id} r={r} rank={i + 4} />)}</div></details>
      )}
    </div>
  )
}

function ProsCons({ r }: { r: Ranked<unknown> }) {
  return (
    <div className="chips">
      {r.pros.map((p) => <span key={p} className="pill good">{p}</span>)}
      {r.cons.map((p) => <span key={p} className="pill mid">{p}</span>)}
    </div>
  )
}

function useGen() {
  const settings = useStore((s) => s.settings)
  const [img, setImg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function run(prompt: string, image?: string) {
    setBusy(true); setErr(null)
    try { setImg(await generateImage({ key: settings.openrouterKey, model: settings.imageModel, prompt, image })) }
    catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  return { img, busy, err, run, hasKey: !!settings.openrouterKey, model: settings.imageModel }
}

function download(url: string, name: string) { const a = document.createElement('a'); a.href = url; a.download = name; a.click() }

function HairCard({ r, rank }: { r: Ranked<Haircut>; rank: number }) {
  const h = r.item
  const cap = useCapture()
  const chosen = useStore((s) => s.style.myHair === h.id)
  const gen = useGen()
  const [copied, setCopied] = useState(false)
  const pics = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(h.en + ' haircut')}`
  const video = `https://www.youtube.com/results?search_query=${encodeURIComponent(h.en + ' haircut tutorial how to style')}`

  function tryOn() {
    if (!cap) return
    const k = Math.min(1, 1024 / Math.max(cap.img.width, cap.img.height))
    const c = document.createElement('canvas'); c.width = Math.round(cap.img.width * k); c.height = Math.round(cap.img.height * k)
    c.getContext('2d')!.drawImage(cap.img, 0, 0, c.width, c.height)
    gen.run(`Edit this photo: change ONLY the hairstyle to ${h.prompt}. Keep the same person: identical face, skin, expression, clothing, lighting, background and framing. Photorealistic.`, c.toDataURL('image/jpeg', 0.9))
  }

  return (
    <div className="card">
      <div className="row between" style={{ alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}><span className="num muted" style={{ fontSize: 15, marginRight: 10 }}>{String(rank + 1).padStart(2, '0')}</span>{h.name}</h2>
        <span className="xp">{h.en} · укладка {h.styleMin} мин · обновлять раз в {h.everyWeeks} нед.</span>
      </div>
      <p style={{ marginTop: 10 }}>{h.what}</p>
      <ProsCons r={r} />
      {h.note && <div className="warn small"><b>Учтите</b>{h.note}</div>}
      <div className="grid g2 mt" style={{ alignItems: 'start' }}>
        <div>
          <div className="label">Что сказать барберу</div>
          <p className="small" style={{ background: 'var(--sunk)', padding: '10px 12px', borderRadius: 4 }}>«{h.barber}»</p>
          <button className="btn sm ghost" onClick={async () => { try { await navigator.clipboard.writeText(h.barber); setCopied(true) } catch { /* нет доступа к буферу */ } }}><Icon name="copy" />{copied ? 'Скопировано' : 'Скопировать'}</button>
        </div>
        <div>
          <div className="label">Укладка дома</div>
          <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>{h.styling.map((x) => <li key={x}>{x}</li>)}</ol>
        </div>
      </div>
      <div className="row mt">
        {gen.hasKey && cap && <button className="btn primary" onClick={tryOn} disabled={gen.busy}>{gen.busy ? 'Рисую, около 20 секунд…' : gen.img ? 'Примерить ещё раз' : 'Примерить на моём фото'}</button>}
        {gen.hasKey && !cap && <a className="btn ghost" href="#analyze">Загрузите фото в «Анализе», чтобы примерить</a>}
        {!gen.hasKey && <a className="btn ghost" href="#profile">Подключить ИИ для примерки</a>}
        <a className="btn ghost" href={pics} target="_blank" rel="noreferrer">Фото-примеры</a>
        <a className="btn ghost" href={video} target="_blank" rel="noreferrer">Видео</a>
        <button className={`btn ${chosen ? 'primary' : 'ghost'}`} onClick={() => setState((s) => ({ ...s, style: { ...s.style, myHair: chosen ? null : h.id } }))}>{chosen ? 'Мой выбор' : 'Выбрать'}</button>
      </div>
      {gen.hasKey && cap && !gen.img && <p className="tiny muted" style={{ marginTop: 8 }}>Примерка отправляет ваше фото в OpenRouter ({gen.model}) и стоит около 7 центов с вашего ключа.</p>}
      {gen.err && <div className="warn small"><b>Не получилось</b>{gen.err}</div>}
      {gen.img && cap && (
        <div className="mt">
          <div className="grid g2">
            <div><div className="label">Сейчас</div><img src={cap.img.toDataURL('image/jpeg', 0.85)} alt="Ваше фото" style={{ width: '100%', borderRadius: 4, display: 'block' }} /></div>
            <div><div className="label">С причёской «{h.name}»</div><img src={gen.img} alt="Примерка" style={{ width: '100%', borderRadius: 4, display: 'block' }} /></div>
          </div>
          <div className="row mt"><button className="btn sm ghost" onClick={() => download(gen.img!, `${h.id}.png`)}><Icon name="download" />Сохранить и показать барберу</button></div>
          <p className="tiny muted" style={{ marginTop: 6 }}>Это рисунок нейросети: он показывает идею, а не гарантирует результат. На ваших волосах стрижка ляжет по-своему.</p>
        </div>
      )}
    </div>
  )
}

function OutfitTab() {
  const profile = useStore((s) => s.profile)
  const st = useStore((s) => s.style)
  const set = (p: Partial<typeof st>) => setState((s) => ({ ...s, style: { ...s.style, ...p } }))
  const ranked = useMemo(() => pickOutfits({ sex: profile.sex, vibe: st.vibe, budget: st.budget, strict: st.strict }), [profile.sex, st])
  return (
    <div className="stack">
      <div className="card stack">
        <div><label>Как хочется выглядеть</label><Chips<Vibe> value={st.vibe} options={VIBES} onChange={(v) => set({ vibe: v })} /></div>
        <div><label>Бюджет</label><Chips<Budget> value={st.budget} options={BUDGETS} onChange={(v) => set({ budget: v })} /></div>
        <label style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink)', display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
          <input type="checkbox" style={{ width: 'auto' }} checked={st.strict} onChange={(e) => set({ strict: e.target.checked })} />В школе строгие правила к внешнему виду
        </label>
      </div>
      {ranked.slice(0, 3).map((r, i) => <OutfitCard key={r.item.id} r={r} rank={i} />)}
      <details><summary className="small muted">Остальные стили ({Math.max(0, ranked.length - 3)})</summary><div className="stack mt">{ranked.slice(3).map((r, i) => <OutfitCard key={r.item.id} r={r} rank={i + 3} />)}</div></details>
      <div className="card">
        <div className="kicker">Правила, которые работают в любом стиле</div>
        <table className="plain"><tbody>
          <tr><td><b>Посадка</b></td><td>Плечевой шов на краю плеча, даже у оверсайза он спущен ровно, а не висит. Широкий низ — верх чуть короче или заправлен.</td></tr>
          <tr><td><b>Чистота</b></td><td>Чистая обувь, вещи без катышков и запаха. Это замечают раньше, чем стиль.</td></tr>
          <tr><td><b>Три цвета</b></td><td>В одном образе — не больше трёх цветов, один из них нейтральный.</td></tr>
          <tr><td><b>Одна главная вещь</b></td><td>Яркая куртка, джерси или обувь. Остальное — спокойная база.</td></tr>
        </tbody></table>
      </div>
    </div>
  )
}

function OutfitCard({ r, rank }: { r: Ranked<Outfit>; rank: number }) {
  const o = r.item
  const sex = useStore((s) => s.profile.sex)
  const chosen = useStore((s) => s.style.myOutfit === o.id)
  const gen = useGen()
  const pics = `https://www.pinterest.com/search/pins/?q=${encodeURIComponent(o.en + ' outfit ' + (sex === 'male' ? 'men' : 'women'))}`
  return (
    <div className="card">
      <div className="row between" style={{ alignItems: 'baseline' }}>
        <h2 style={{ margin: 0 }}><span className="num muted" style={{ fontSize: 15, marginRight: 10 }}>{String(rank + 1).padStart(2, '0')}</span>{o.name}</h2>
        <span className="xp">{o.en}</span>
      </div>
      <p style={{ marginTop: 10 }}>{o.what}</p>
      <ProsCons r={r} />
      <div className="grid g2 mt" style={{ alignItems: 'start' }}>
        <div>
          <div className="label">С чего собрать</div>
          <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>{o.items.map((x) => <li key={x}>{x}</li>)}</ul>
          <table className="plain mt"><tbody>
            <tr><th style={{ width: 80 }}>Обувь</th><td>{o.shoes}</td></tr>
            <tr><th>Цвета</th><td>{o.colors}</td></tr>
            <tr><th>Дёшево</th><td>{o.cheap}</td></tr>
          </tbody></table>
        </div>
        <div>
          <div className="label">Частые ошибки</div>
          <ul className="small" style={{ paddingLeft: 18, margin: 0 }}>{o.mistakes.map((x) => <li key={x}>{x}</li>)}</ul>
          {gen.img && <img src={gen.img} alt={`Образ: ${o.name}`} style={{ width: '100%', borderRadius: 4, display: 'block', marginTop: 14 }} />}
        </div>
      </div>
      <div className="row mt">
        {gen.hasKey
          ? <button className="btn primary" onClick={() => gen.run(`Fashion flat lay photo on a plain light background, neatly arranged complete ${sex === 'male' ? "teen boy's" : "teen girl's"} outfit: ${o.prompt}. Clothes only, no person, no text, no logos.`)} disabled={gen.busy}>{gen.busy ? 'Рисую, около 20 секунд…' : gen.img ? 'Показать другой вариант' : 'Показать образ'}</button>
          : <a className="btn ghost" href="#profile">Подключить ИИ, чтобы увидеть образ</a>}
        {gen.img && <button className="btn ghost" onClick={() => download(gen.img!, `${o.id}.png`)}><Icon name="download" />Сохранить</button>}
        <a className="btn ghost" href={pics} target="_blank" rel="noreferrer">Фото-примеры</a>
        <button className={`btn ${chosen ? 'primary' : 'ghost'}`} onClick={() => setState((s) => ({ ...s, style: { ...s.style, myOutfit: chosen ? null : o.id } }))}>{chosen ? 'Мой выбор' : 'Выбрать'}</button>
      </div>
      {gen.hasKey && !gen.img && <p className="tiny muted" style={{ marginTop: 8 }}>Картинка образа стоит около 7 центов с вашего ключа. Ваше фото для неё не используется.</p>}
      {gen.err && <div className="warn small"><b>Не получилось</b>{gen.err}</div>}
    </div>
  )
}
