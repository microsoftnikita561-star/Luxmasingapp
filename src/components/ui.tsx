import type { ReactNode } from 'react'

export function Ring({ value, size = 120, stroke = 10, label, sub }: { value: number; size?: number; stroke?: number; label?: ReactNode; sub?: string }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(100, value))
  const color = 'var(--ink)'
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="butt"
          strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} style={{ transition: 'stroke-dashoffset .6s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 500, fontSize: size * 0.27, lineHeight: 1, letterSpacing: '-.04em' }}>{label ?? Math.round(v)}</div>
          {sub && <div className="tiny muted" style={{ marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  )
}

export const scoreClass = (s: number) => (s >= 80 ? 'good' : s >= 55 ? 'mid' : 'bad')

export function Bar({ value, cls }: { value: number; cls?: string }) {
  return <div className={`bar ${cls ?? ''}`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
}

/** Мини-рендерер текста уроков */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = []
  let list: string[] = []
  const flush = () => {
    if (list.length) out.push(<ul key={out.length}>{list.map((l, i) => <li key={i}>{l}</li>)}</ul>)
    list = []
  }
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) { flush(); continue }
    if (line.startsWith('- ')) { list.push(line.slice(2)); continue }
    flush()
    if (line.startsWith('## ')) out.push(<h3 key={out.length}>{line.slice(3)}</h3>)
    else if (line.startsWith('> ')) out.push(<div className="tip" key={out.length}><b>Совет</b>{line.slice(2)}</div>)
    else if (line.startsWith('! ')) out.push(<div className="warn" key={out.length}><b>Важно</b>{line.slice(2)}</div>)
    else out.push(<p key={out.length}>{line}</p>)
  }
  flush()
  return <div className="lesson-body">{out}</div>
}

export function LineChart({ series, height = 160 }: { series: { name: string; color: string; points: { x: number; y: number }[] }[]; height?: number }) {
  const all = series.flatMap((s) => s.points)
  if (all.length < 2) return <div className="muted small">Нужно минимум 2 замера, чтобы построить график.</div>
  const w = 600
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y)
  const x0 = Math.min(...xs), x1 = Math.max(...xs)
  const y0 = Math.min(...ys) - 2, y1 = Math.max(...ys) + 2
  const X = (x: number) => 30 + ((x - x0) / Math.max(1, x1 - x0)) * (w - 40)
  const Y = (y: number) => 10 + (1 - (y - y0) / Math.max(1, y1 - y0)) * (height - 30)
  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height }}>
      {[0, 0.5, 1].map((t) => {
        const y = y0 + (y1 - y0) * t
        return <g key={t}><line x1={30} x2={w - 10} y1={Y(y)} y2={Y(y)} stroke="var(--line)" /><text x={0} y={Y(y) + 4} fill="var(--muted)" fontSize={11}>{y.toFixed(0)}</text></g>
      })}
      {series.map((s) => (
        <g key={s.name}>
          <polyline fill="none" stroke={s.color} strokeWidth={2.5} points={s.points.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ')} />
          {s.points.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r={3.5} fill={s.color} />)}
        </g>
      ))}
    </svg>
  )
}
