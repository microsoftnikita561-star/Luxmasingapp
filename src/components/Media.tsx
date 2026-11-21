import { useState } from 'react'
import { VIDEOS } from '../data/videos'
import type { Exercise } from '../data/exercises'
import { Icon } from './Icon'

const BASE = import.meta.env.BASE_URL

/** Реальные фото начала и конца движения, сменяющие друг друга */
export function ExerciseDemo({ ex }: { ex: Exercise }) {
  return (
    <div className="demo">
      <img src={`${BASE}exercises/${ex.img}_0.jpg`} alt={`${ex.name}: исходное положение`} loading="lazy" />
      <img src={`${BASE}exercises/${ex.img}_1.jpg`} alt={`${ex.name}: конечное положение`} loading="lazy" />
      <span className="tag">начало ↔ конец</span>
    </div>
  )
}

/** Видео с YouTube: плеер подгружается только по клику */
export function VideoBlock({ topic, query }: { topic?: string; query: string }) {
  const list = topic ? VIDEOS[topic] ?? [] : []
  const [open, setOpen] = useState<string | null>(null)
  const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
  return (
    <div className="stack">
      {list.map((v) => (
        <div key={v.id}>
          {open === v.id ? (
            <iframe className="video" src={`https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0`} title={v.title}
              allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen />
          ) : (
            <button className="btn ghost" style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left' }} onClick={() => setOpen(v.id)}>
              <Icon name="play" />
              <span><span style={{ display: 'block' }}>{v.title}</span><span className="tiny muted" style={{ fontWeight: 400 }}>{v.channel} · YouTube · {v.lang === 'ru' ? 'на русском' : 'на английском'}</span></span>
            </button>
          )}
          {open === v.id && <a className="tiny muted" href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer">Не открывается? Смотреть на YouTube</a>}
        </div>
      ))}
      <a className="small muted" href={search} target="_blank" rel="noreferrer">Ещё видео по теме на YouTube</a>
    </div>
  )
}
