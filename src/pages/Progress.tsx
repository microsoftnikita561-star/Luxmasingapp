import { useState } from 'react'
import { setState, useStore } from '../lib/store'
import { LineChart, scoreClass } from '../components/ui'

export default function Progress() {
  const progress = useStore((s) => s.progress)
  const body = useStore((s) => s.body)
  const [sel, setSel] = useState<string[]>([])
  const [w, setW] = useState(''); const [waist, setWaist] = useState(''); const [sleep, setSleep] = useState('')

  const pick = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s.slice(-1), id]))
  const [a, b] = sel.map((id) => progress.find((p) => p.id === id)!).filter(Boolean).sort((x, y) => x.date - y.date)

  const addBody = () => {
    const e = { date: Date.now(), weightKg: w ? Number(w) : undefined, waistCm: waist ? Number(waist) : undefined, sleepH: sleep ? Number(sleep) : undefined }
    if (!e.weightKg && !e.waistCm && !e.sleepH) return
    setState((s) => ({ ...s, body: [...s.body.filter((x) => new Date(x.date).toDateString() !== new Date().toDateString()), e], xp: s.xp + (s.body.some((x) => new Date(x.date).toDateString() === new Date().toDateString()) ? 0 : 5) }))
    setW(''); setWaist(''); setSleep('')
  }

  const fmt = (t: number) => new Date(t).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })

  return (
    <div className="stack">
      <div><div className="kicker">Прогресс</div><h1>Замеры во времени</h1></div>
      <div className="card">
        <h3>Гармония и симметрия по замерам</h3>
        <LineChart series={[
          { name: 'Гармония', color: 'var(--ink)', points: progress.map((p) => ({ x: p.date, y: p.analysis.harmony })) },
          { name: 'Симметрия', color: 'var(--muted)', points: progress.map((p) => ({ x: p.date, y: p.analysis.symmetry })) },
        ]} />
        <div className="row small"><span style={{ color: 'var(--ink)' }}>● Гармония</span><span style={{ color: 'var(--muted)' }}>● Симметрия</span></div>
        <p className="tiny muted">Пропорции костей почти не меняются — колебания чаще отражают ракурс, свет, отёки и процент жира. Снимайте в одинаковых условиях.</p>
      </div>

      <div className="card">
        <div className="row between"><h3 style={{ margin: 0 }}>Фото-история</h3><a className="btn sm" href="#analyze">+ Новый замер</a></div>
        {progress.length === 0 ? <p className="muted small mt">Пока пусто. Сделайте анализ и нажмите «Сохранить в прогресс».</p> : (
          <>
            <p className="small muted mt">Выберите 2 фото, чтобы сравнить.</p>
            <div className="thumbs">
              {[...progress].reverse().map((p) => (
                <div key={p.id}>
                  <img src={p.thumb} className={sel.includes(p.id) ? 'sel' : ''} onClick={() => pick(p.id)} alt="" />
                  <div className="tiny muted center">{fmt(p.date)} · {p.analysis.harmony}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {a && b && (
        <div className="card">
          <h3>Сравнение: {fmt(a.date)} → {fmt(b.date)}</h3>
          <div className="grid g2">
            <img src={a.thumb} style={{ width: '100%', borderRadius: 12 }} alt="" />
            <img src={b.thumb} style={{ width: '100%', borderRadius: 12 }} alt="" />
          </div>
          <table className="plain mt" >
            <tbody>
              {[['Гармония', a.analysis.harmony, b.analysis.harmony], ...a.analysis.metrics.map((m) => {
                const mb = b.analysis.metrics.find((x) => x.id === m.id)
                return [m.name, m.score, mb?.score ?? 0]
              })].map(([n, x, y]) => {
                const diff = (y as number) - (x as number)
                return (
                  <tr key={n as string} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '6px 0' }}>{n}</td>
                    <td className="center">{x}</td>
                    <td className="center">{y}</td>
                    <td className="center" style={{ color: diff > 0 ? 'var(--good)' : diff < 0 ? 'var(--bad)' : 'var(--muted)' }}>{diff > 0 ? '+' : ''}{diff}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <button className="btn danger sm mt" onClick={() => { if (confirm('Удалить выбранные замеры?')) { setState((s) => ({ ...s, progress: s.progress.filter((p) => !sel.includes(p.id)) })); setSel([]) } }}>Удалить выбранные</button>
        </div>
      )}
      {sel.length === 1 && (
        <button className="btn danger sm" onClick={() => { if (confirm('Удалить замер?')) { setState((s) => ({ ...s, progress: s.progress.filter((p) => !sel.includes(p.id)) })); setSel([]) } }}>Удалить выбранный замер</button>
      )}

      <div className="card">
        <h3>Тело и сон</h3>
        <div className="grid g4">
          <div><label>Вес, кг</label><input type="number" step="0.1" value={w} onChange={(e) => setW(e.target.value)} /></div>
          <div><label>Талия, см</label><input type="number" step="0.5" value={waist} onChange={(e) => setWaist(e.target.value)} /></div>
          <div><label>Сон, ч</label><input type="number" step="0.5" value={sleep} onChange={(e) => setSleep(e.target.value)} /></div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}><button className="btn primary" style={{ width: '100%' }} onClick={addBody}>Записать</button></div>
        </div>
        <div className="grid g3 mt">
          <div><b className="small">Вес</b><LineChart height={120} series={[{ name: 'Вес', color: 'var(--ink)', points: body.filter((x) => x.weightKg).map((x) => ({ x: x.date, y: x.weightKg! })) }]} /></div>
          <div><b className="small">Талия</b><LineChart height={120} series={[{ name: 'Талия', color: 'var(--ink)', points: body.filter((x) => x.waistCm).map((x) => ({ x: x.date, y: x.waistCm! })) }]} /></div>
          <div><b className="small">Сон</b><LineChart height={120} series={[{ name: 'Сон', color: 'var(--ink)', points: body.filter((x) => x.sleepH).map((x) => ({ x: x.date, y: x.sleepH! })) }]} /></div>
        </div>
      </div>
      {progress.length > 0 && <div className="tiny muted">Последний замер: <span className={`pill ${scoreClass(progress[progress.length - 1].analysis.harmony)}`}>{progress[progress.length - 1].analysis.harmony}</span></div>}
    </div>
  )
}
