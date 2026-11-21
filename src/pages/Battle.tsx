import { useMemo, useRef, useState } from 'react'
import { battle, skinPoints, type BattleResult, type Fighter, type SkinScore } from '../lib/battle'
import { blendshapeMap, headPose } from '../lib/face'
import { analyze } from '../lib/metrics'
import { analyzeSkin } from '../lib/skin'
import { buildShared, decodeShared, type SharedProfile } from '../lib/share'
import { levelInfo, useStore, type AppState } from '../lib/store'
import { detectFace, useCapture } from '../components/PhotoInput'
import { faceThumb } from '../components/draw'
import { Icon } from '../components/Icon'
import type { Capture } from '../lib/session'

const TABS = [['photo', 'Фото против фото'], ['self', 'Я против себя'], ['friend', 'С другом по ссылке']] as const

export default function Battle({ param }: { param?: string }) {
  const tab = TABS.some(([id]) => id === param) ? param! : 'photo'
  return (
    <div className="stack">
      <div>
        <div className="kicker">Битва</div>
        <h1>Кто сильнее по раундам</h1>
        <p className="lead">Семь раундов: симметрия, глаза, челюсть, пропорции, кожа. Правила честные — раунд не засчитывается, если фото искажает измерение, а разница в пределах погрешности считается ничьей.</p>
      </div>
      <nav className="tabs">{TABS.map(([id, name]) => <a key={id} href={`#battle/${id}`} className={tab === id ? 'active' : ''}>{name}</a>)}</nav>
      {tab === 'photo' && <PhotoBattle />}
      {tab === 'self' && <SelfBattle />}
      {tab === 'friend' && <FriendBattle />}
    </div>
  )
}

function toFighter(name: string, cap: Capture, sex: AppState['profile']['sex']): Fighter {
  const lms = cap.res.faceLandmarks[0]
  return {
    name,
    analysis: analyze(lms, cap.img.width, cap.img.height, sex, headPose(cap.res), blendshapeMap(cap.res)),
    skin: analyzeSkin(cap.img, lms),
    thumb: faceThumb(cap.img, lms, cap.img.width, cap.img.height, 360),
  }
}

function Slot({ label, name, setName, cap, setCap, mine }: { label: string; name: string; setName: (s: string) => void; cap: Capture | null; setCap: (c: Capture | null) => void; mine?: Capture | null }) {
  const ref = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const thumb = useMemo(() => (cap ? faceThumb(cap.img, cap.res.faceLandmarks[0], cap.img.width, cap.img.height, 360) : null), [cap])
  function onFile(f: File) {
    setMsg('Ищу точки лица…')
    const url = URL.createObjectURL(f)
    const im = new Image()
    im.onload = async () => {
      try {
        const c = await detectFace(im, im.naturalWidth, im.naturalHeight)
        if (c) { setCap(c); setMsg(null) } else setMsg('Лицо не найдено — нужно фото анфас.')
      } catch { setMsg('Не удалось обработать фото.') }
      URL.revokeObjectURL(url)
    }
    im.onerror = () => setMsg('Не удалось открыть файл.')
    im.src = url
  }
  return (
    <div className="card">
      <div className="label">{label}</div>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} />
      <div className="mt">
        {thumb ? <img src={thumb} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 4, display: 'block' }} />
          : <button className="drop" onClick={() => ref.current?.click()}><Icon name="upload" /><div><b>Загрузить фото</b></div><div className="small muted">Анфас, нейтральное лицо</div></button>}
      </div>
      <div className="row mt">
        {thumb && <button className="btn sm ghost" onClick={() => ref.current?.click()}>Другое фото</button>}
        {mine && cap !== mine && <button className="btn sm ghost" onClick={() => setCap(mine)}>Взять моё последнее</button>}
      </div>
      {msg && <div className="small muted mt">{msg}</div>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </div>
  )
}

function PhotoBattle() {
  const profile = useStore((s) => s.profile)
  const mine = useCapture()
  const [a, setA] = useState<Capture | null>(mine)
  const [b, setB] = useState<Capture | null>(null)
  const [na, setNa] = useState(profile.name || 'Я')
  const [nb, setNb] = useState('Соперник')
  const fighters = useMemo(() => (a && b ? [toFighter(na, a, profile.sex), toFighter(nb, b, profile.sex)] as const : null), [a, b, na, nb, profile.sex])
  const res = useMemo(() => (fighters ? battle(fighters[0], fighters[1]) : null), [fighters])
  return (
    <div className="stack">
      <div className="grid g2">
        <Slot label="Левый угол" name={na} setName={setNa} cap={a} setCap={setA} mine={mine} />
        <Slot label="Правый угол" name={nb} setName={setNb} cap={b} setCap={setB} />
      </div>
      <p className="tiny muted">Сравнивайте только с теми, кто сам согласился. Оба фото обрабатываются на устройстве, не сохраняются и никуда не отправляются. Для честного боя — одинаковый свет и нейтральные лица.</p>
      {res && fighters && <Result res={res} a={fighters[0]} b={fighters[1]} share />}
    </div>
  )
}

function SelfBattle() {
  const progress = useStore((s) => s.progress)
  const skin = useStore((s) => s.skin)
  const [ia, setIa] = useState(0)
  const [ib, setIb] = useState(Math.max(0, progress.length - 1))
  if (progress.length < 2) {
    return <div className="card"><h3>Нужно минимум два сохранённых замера</h3><p className="small muted">Сделайте анализ лица сейчас и ещё один через 3–4 недели. Это самая полезная битва: соперник — вы в прошлом.</p><a className="btn primary" href="#analyze">Сделать замер</a></div>
  }
  const near = (t: number): SkinScore | null => {
    const e = [...skin].sort((x, y) => Math.abs(x.date - t) - Math.abs(y.date - t))[0]
    return e && Math.abs(e.date - t) < 3 * 86400000 ? { clear: skinPoints(e.inflamed, e.marks), even: e.evenness } : null
  }
  const fmt = (t: number) => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
  const f = (i: number): Fighter => ({ name: fmt(progress[i].date), analysis: progress[i].analysis, skin: near(progress[i].date), thumb: progress[i].thumb })
  const A = f(Math.min(ia, progress.length - 1)), B = f(Math.min(ib, progress.length - 1))
  return (
    <div className="stack">
      <div className="grid g2">
        {([['Тогда', ia, setIa], ['Сейчас', ib, setIb]] as const).map(([label, v, set]) => (
          <div key={label}><label>{label}</label>
            <select value={v} onChange={(e) => set(Number(e.target.value))}>{progress.map((p, i) => <option key={p.id} value={i}>{fmt(p.date)} · гармония {p.analysis.harmony}</option>)}</select>
          </div>
        ))}
      </div>
      <Result res={battle(A, B)} a={A} b={B} />
      <p className="tiny muted">Раунды кожи считаются, если в те же дни (±3 дня) вы сохраняли замер в разделе «Кожа».</p>
    </div>
  )
}

function Result({ res, a, b, share }: { res: BattleResult; a: Fighter; b: Fighter; share?: boolean }) {
  const win = res.winner === 'draw' ? null : res.winner === 'a' ? a : b
  const lose = res.winner === 'draw' ? null : res.winner === 'a' ? b : a
  const loserKey = res.winner === 'a' ? 'b' : 'a'
  const tips = res.rounds.filter((r) => r.tip && r.winner !== loserKey && r.winner !== 'draw' && r.winner !== 'void' && !r.fixed)
  const voids = res.rounds.filter((r) => r.winner === 'void').length

  async function save() {
    await document.fonts.ready
    const W = 1080, H = 1080
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const g = c.getContext('2d')!
    g.fillStyle = '#17160f'; g.fillRect(0, 0, W, H)
    const load = (src: string) => new Promise<HTMLImageElement>((ok) => { const i = new Image(); i.onload = () => ok(i); i.src = src })
    const [ia, ib] = await Promise.all([load(a.thumb), load(b.thumb)])
    g.drawImage(ia, 60, 150, 450, 450); g.drawImage(ib, 570, 150, 450, 450)
    g.fillStyle = '#f1eee6'; g.font = "700 40px 'Playfair Display Variable', Georgia, serif"; g.fillText('LuxMasing · битва', 60, 96)
    g.font = "600 44px 'Golos Text Variable', sans-serif"
    g.fillText(a.name, 60, 670); g.textAlign = 'right'; g.fillText(b.name, 1020, 670)
    g.textAlign = 'center'; g.font = "500 230px 'JetBrains Mono Variable', monospace"; g.fillText(`${res.a}:${res.b}`, W / 2, 900)
    g.font = "500 34px 'Golos Text Variable', sans-serif"; g.fillStyle = '#b9b5a6'
    g.fillText(win ? `Победа: ${win.name}` : 'Ничья', W / 2, 980)
    c.toBlob(async (blob) => {
      if (!blob) return
      const file = new File([blob], 'battle.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Битва LuxMasing' }) } catch { /* отменено */ } }
      else { const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = 'battle.png'; l.click() }
    }, 'image/png')
  }

  return (
    <div className="stack">
      <div className="card ink">
        <div className="row between" style={{ flexWrap: 'nowrap', alignItems: 'center', gap: 16 }}>
          <Corner f={a} />
          <div className="center">
            <div className="num" style={{ fontSize: 56, lineHeight: 1 }}>{res.a}:{res.b}</div>
            <div className="label" style={{ margin: '8px 0 0' }}>{win ? `победа: ${win.name}` : 'ничья'}</div>
          </div>
          <Corner f={b} right />
        </div>
      </div>

      <div className="card">
        <table className="plain">
          <thead><tr><th>Раунд</th><th style={{ textAlign: 'right' }}>{a.name}</th><th style={{ textAlign: 'right' }}>{b.name}</th><th>Итог</th></tr></thead>
          <tbody>
            {res.rounds.map((r) => (
              <tr key={r.id} style={r.winner === 'void' ? { color: 'var(--muted)' } : undefined}>
                <td><b>{r.name}</b>{r.fixed && <div className="tiny muted">костная основа</div>}</td>
                <td className="num" style={{ textAlign: 'right', fontWeight: r.winner === 'a' ? 700 : 400 }}>{r.a ?? '—'}</td>
                <td className="num" style={{ textAlign: 'right', fontWeight: r.winner === 'b' ? 700 : 400 }}>{r.b ?? '—'}</td>
                <td>{r.winner === 'a' ? a.name : r.winner === 'b' ? b.name : r.winner === 'draw' ? 'Ничья' : 'Не засчитан'}{r.note && <div className="tiny muted">{r.note}</div>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {voids >= 3 && <div className="warn small"><b>Бой неполный</b>Не засчитано раундов: {voids}. Переснимите фото с нейтральным лицом, прямо в камеру и при ровном свете — тогда результат будет честным.</div>}
        {share && <div className="mt"><button className="btn ghost" onClick={save}><Icon name="share" />Поделиться результатом</button></div>}
      </div>

      {lose && tips.length > 0 && (
        <div className="card">
          <div className="kicker">План реванша · {lose.name}</div>
          <p className="small muted">Только те раунды, которые реально можно отыграть. Форму костей сравнивать бессмысленно — её не тренируют.</p>
          {tips.map((r) => <div key={r.id} className="task"><div style={{ flex: 1 }}><div className="ttl">{r.name}</div><div className="small muted">{r.tip}</div></div></div>)}
        </div>
      )}
    </div>
  )
}

function Corner({ f, right }: { f: Fighter; right?: boolean }) {
  return (
    <div style={{ textAlign: right ? 'right' : 'left', minWidth: 0 }}>
      <img src={f.thumb} alt="" style={{ width: 92, height: 92, objectFit: 'cover', borderRadius: 4, display: 'block', marginLeft: right ? 'auto' : 0 }} />
      <div style={{ fontWeight: 650, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
    </div>
  )
}

function FriendBattle() {
  const [text, setText] = useState('')
  const me = buildShared(true)
  const code = text.includes('#u/') ? text.split('#u/')[1].trim() : text.trim()
  const friend: SharedProfile | null = code ? decodeShared(code) : null
  const rows: [string, number | undefined, number | undefined][] = friend ? [
    ['Опыт (XP)', me.x, friend.x], ['Серия, дней', me.s, friend.s], ['Пройдено уроков', me.l, friend.l],
    ['Мимика, лучший результат %', me.d, friend.d], ['Гармония пропорций', me.h, friend.h], ['Симметрия', me.y, friend.y],
  ] : []
  let a = 0, b = 0
  for (const [, x, y] of rows) { if (x == null || y == null || x === y) continue; if (x > y) a++; else b++ }
  return (
    <div className="stack">
      <div className="card">
        <label>Ссылка на профиль друга</label>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Вставьте ссылку, которую друг скопировал в своём профиле" />
        <p className="tiny muted" style={{ marginTop: 8 }}>Свою ссылку можно скопировать в разделе <a href="#profile">Профиль</a>. Фото по ссылке не передаются — сравниваются дисциплина и баллы, которыми человек сам решил поделиться.</p>
        {text && !friend && <div className="warn small"><b>Не получилось</b>Ссылка не распознана. Скопируйте её целиком.</div>}
      </div>
      {friend && (
        <>
          <div className="card ink">
            <div className="row between" style={{ flexWrap: 'nowrap' }}>
              <div><div className="hero-score">{me.n}</div><div className="label" style={{ margin: '6px 0 0' }}>{levelInfo(me.x).name}</div></div>
              <div className="num" style={{ fontSize: 56, lineHeight: 1 }}>{a}:{b}</div>
              <div style={{ textAlign: 'right' }}><div className="hero-score">{friend.n}</div><div className="label" style={{ margin: '6px 0 0' }}>{levelInfo(friend.x).name}</div></div>
            </div>
          </div>
          <div className="card">
            <table className="plain">
              <thead><tr><th>Раунд</th><th style={{ textAlign: 'right' }}>{me.n}</th><th style={{ textAlign: 'right' }}>{friend.n}</th></tr></thead>
              <tbody>{rows.map(([n, x, y]) => (
                <tr key={n} style={x == null || y == null ? { color: 'var(--muted)' } : undefined}>
                  <td>{n}{(x == null || y == null) && <div className="tiny muted">не засчитан: нет данных у одного из участников</div>}</td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: x != null && y != null && x > y ? 700 : 400 }}>{x ?? '—'}</td>
                  <td className="num" style={{ textAlign: 'right', fontWeight: x != null && y != null && y > x ? 700 : 400 }}>{y ?? '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
