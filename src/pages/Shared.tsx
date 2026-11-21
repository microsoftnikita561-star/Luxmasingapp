import { decodeShared } from '../lib/share'
import { levelInfo } from '../lib/store'
import { Bar } from '../components/ui'

export default function Shared({ code }: { code: string }) {
  const p = decodeShared(code)
  if (!p) return <div className="stack"><h1>Ссылка повреждена</h1><a className="btn" href="#home">На главную</a></div>
  const lvl = levelInfo(p.x)
  const cells: [string, string | number][] = [['XP', p.x], ['Серия, дней', p.s], ['Уроков', p.l]]
  if (p.h != null) cells.push(['Гармония', p.h])
  if (p.y != null) cells.push(['Симметрия', p.y])
  if (p.d != null) cells.push(['Мимика, %', p.d])
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <div className="kicker">Профиль · {new Date(p.t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <h1 style={{ fontSize: 56 }}>{p.n}</h1>
      <div className="hero-score" style={{ fontStyle: 'italic' }}>{lvl.name} · уровень {lvl.index + 1}</div>
      <Bar value={lvl.pct * 100} />
      <div className="grid g3">{cells.map(([k, v]) => <div key={k} className="card"><div className="label">{k}</div><div className="stat">{v}</div></div>)}</div>
      {p.f && <p className="muted">Форма лица: {p.f.toLowerCase()}</p>}
      <hr className="rule" />
      <p className="lead">LuxMasing — ежедневный тренажёр внешности: анализ лица, кожа, осанка, мимика, стиль.</p>
      <div><a className="btn primary" href="#home">Начать свой путь</a></div>
    </div>
  )
}
