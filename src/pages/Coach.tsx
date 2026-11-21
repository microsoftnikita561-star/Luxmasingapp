import { useRef, useState } from 'react'
import { chat, COACH_SYSTEM } from '../lib/openrouter'
import { setState, useStore, type ChatMsg } from '../lib/store'
import { Icon } from '../components/Icon'
import { HAIRCUTS, HAIR_TYPES, OUTFITS } from '../data/styles'

const QUICK = [
  'Составь мне план на 12 недель по моему анализу',
  'Какая стрижка подойдёт к моей форме лица?',
  'Подбери уходовую рутину под мой тип кожи',
  'Как быстро убрать отёки перед важным событием?',
  'Как стать фотогеничнее?',
]

async function fileToDataUrl(f: File, max = 1024): Promise<string> {
  const url = URL.createObjectURL(f)
  const im = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
  const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight))
  const c = document.createElement('canvas')
  c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s)
  c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height)
  URL.revokeObjectURL(url)
  return c.toDataURL('image/jpeg', 0.85)
}

export default function Coach() {
  const settings = useStore((s) => s.settings)
  const profile = useStore((s) => s.profile)
  const progress = useStore((s) => s.progress)
  const msgs = useStore((s) => s.chat)
  const [text, setText] = useState('')
  const [img, setImg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const style = useStore((s) => s.style)
  const skinLog = useStore((s) => s.skin)
  const lastSkin = skinLog[skinLog.length - 1]
  const last = progress[progress.length - 1]?.analysis
  const context = `Профиль: пол ${profile.sex === 'male' ? 'мужской' : 'женский'}, возраст ${profile.age}, кожа: ${profile.skin}${profile.acne ? ', есть акне' : ''}${profile.heightCm ? `, рост ${profile.heightCm} см` : ''}${profile.weightKg ? `, вес ${profile.weightKg} кг` : ''}. Цели: ${profile.goals.join(', ') || 'не указаны'}.` +
    (last ? `\nПоследний геометрический анализ лица: гармония ${last.harmony}/100, симметрия ${last.symmetry}, форма лица «${last.shape.name}». Метрики: ${last.metrics.map((m) => `${m.name} ${m.display} (норма ${m.idealDisplay}, балл ${m.score})`).join('; ')}.` : '\nАнализ лица ещё не делался.') +
    `\nВолосы: ${HAIR_TYPES[style.hairType].toLowerCase()}.` + (style.myHair ? ` Выбранная причёска: ${HAIRCUTS.find((h) => h.id === style.myHair)?.name}.` : '') + (style.myOutfit ? ` Выбранный стиль одежды: ${OUTFITS.find((o) => o.id === style.myOutfit)?.name}.` : '') +
    (lastSkin ? `\nДетектор кожи: воспалений ${lastSkin.inflamed}, следов ${lastSkin.marks}, степень ${lastSkin.severity}.` : '')

  async function send(t = text) {
    if (!settings.openrouterKey) { setErr('Добавьте ключ OpenRouter в Профиле.'); return }
    if (!t.trim() && !img) return
    const m: ChatMsg = { role: 'user', content: t.trim(), image: img ?? undefined }
    const history = [...msgs, m]
    setState((s) => ({ ...s, chat: history }))
    setText(''); setImg(null); setErr(null); setBusy(true)
    try {
      // фото отправляем только в последнем сообщении, чтобы не раздувать запрос
      const payload = history.slice(-16).map((x, i, arr) => (i === arr.length - 1 ? x : { ...x, image: undefined }))
      const reply = await chat({ key: settings.openrouterKey, model: settings.model, system: COACH_SYSTEM + '\n\n' + context, messages: payload })
      setState((s) => ({ ...s, chat: [...s.chat.map((x) => ({ ...x, image: undefined })), { role: 'assistant', content: reply }], xp: s.xp + 2 }))
    } catch (e) {
      setErr((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div className="stack" style={{ maxWidth: 820 }}>
      <div className="row between">
        <div><div className="kicker">Коуч</div><h1 style={{ margin: 0 }}>Вопросы и разбор фото</h1></div>
        {msgs.length > 0 && <button className="btn sm ghost" onClick={() => setState((s) => ({ ...s, chat: [] }))}>Очистить</button>}
      </div>
      <p className="muted small">Коуч видит ваш профиль и последний анализ лица. Прикрепите фото — модель разберёт кожу, волосы, брови, стрижку и ракурс. Модель: <code>{settings.model}</code></p>
      {!settings.openrouterKey && (
        <div className="warn"><b>Нужен ключ</b>Чтобы коуч отвечал, добавьте ключ OpenRouter <a href="#profile">в профиле</a>.</div>
      )}
      <div className="card chat" style={{ minHeight: 240 }}>
        {msgs.length === 0 && (
          <div>
            <p className="muted small">Быстрые вопросы:</p>
            <div className="chips">{QUICK.map((q) => <button key={q} className="chip" onClick={() => send(q)}>{q}</button>)}</div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.image && <img src={m.image} alt="" />}
            {m.content}
          </div>
        ))}
        {busy && <div className="msg assistant muted">Думаю…</div>}
      </div>
      {err && <div className="warn small"><b>Ошибка</b>{err}</div>}
      {img && <div className="row"><img src={img} style={{ height: 70, borderRadius: 8 }} alt="" /><button className="btn sm" onClick={() => setImg(null)} aria-label="Убрать фото"><Icon name="x" /></button></div>}
      <div className="row" style={{ flexWrap: 'nowrap' }}>
        <button className="btn" onClick={() => fileRef.current?.click()} title="Прикрепить фото" aria-label="Прикрепить фото"><Icon name="clip" /></button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f) setImg(await fileToDataUrl(f)); e.target.value = '' }} />
        <textarea rows={2} value={text} placeholder="Спросите о коже, стрижке, тренировках, стиле…" onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
        <button className="btn primary" disabled={busy} onClick={() => send()} aria-label="Отправить"><Icon name="send" /></button>
      </div>
      <p className="tiny muted">Ответы ИИ могут содержать ошибки и не заменяют консультацию врача.</p>
    </div>
  )
}
