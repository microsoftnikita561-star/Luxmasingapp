import { useEffect, useRef, useState } from 'react'
import { exportData, importData, resetAll, setState, useStore } from '../lib/store'
import { MODEL_PRESETS, listVisionModels, type ModelInfo } from '../lib/openrouter'
import { ProfileForm } from './Onboarding'
import { buildShared, renderCard, shareUrl } from '../lib/share'
import { Icon } from '../components/Icon'

export default function ProfilePage() {
  const profile = useStore((s) => s.profile)
  const settings = useStore((s) => s.settings)
  const [saved, setSaved] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const [models, setModels] = useState<ModelInfo[] | null>(null)
  useEffect(() => { listVisionModels().then((l) => setModels(l.sort((a, b) => a.pricePerM - b.pricePerM))).catch(() => {}) }, [])

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `luxmasing-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  return (
    <div className="stack">
      <div><div className="kicker">Профиль</div><h1>{profile.name || 'Ваш профиль'}</h1></div>
      <ShareCard />
      <div className="card">
        <h2>Профиль</h2>
        <ProfileForm value={profile} onChange={(p) => setState((s) => ({ ...s, profile: p }))} />
      </div>
      <div className="card stack">
        <h2>Подключение ИИ</h2>
        <p className="small muted">Анализ точек лица работает бесплатно и офлайн (MediaPipe). Для чата с коучем и разбора кожи/волос по фото нужен ключ <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">OpenRouter</a>. Ключ хранится только в этом браузере и отправляется только в OpenRouter.</p>
        <div>
          <label>API-ключ</label>
          <input type="password" value={settings.openrouterKey} placeholder="sk-or-v1-…" onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, openrouterKey: e.target.value.trim() } }))} />
        </div>
        <div>
          <label>Модель (только те, что умеют смотреть фото)</label>
          {models ? (
            <select value={settings.model} onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, model: e.target.value } }))}>
              {!models.some((m) => m.id === settings.model) && <option value={settings.model}>{settings.model}</option>}
              {models.filter((m) => !m.makesImages).map((m) => <option key={m.id} value={m.id}>{m.name} — {m.pricePerM ? `$${m.pricePerM.toFixed(2)} за 1 млн токенов` : 'бесплатно'}</option>)}
            </select>
          ) : (
            <div className="chips">
              {MODEL_PRESETS.map((m) => (
                <button key={m.id} className={`chip ${settings.model === m.id ? 'on' : ''}`} onClick={() => setState((s) => ({ ...s, settings: { ...s.settings, model: m.id } }))}>{m.label}</button>
              ))}
            </div>
          )}
          {models && (
            <div className="mt">
              <label>Модель для картинок (примерка причёски, образы одежды)</label>
              <select value={settings.imageModel} onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, imageModel: e.target.value } }))}>
                {!models.some((m) => m.id === settings.imageModel) && <option value={settings.imageModel}>{settings.imageModel}</option>}
                {models.filter((m) => m.makesImages).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <p className="tiny muted" style={{ marginTop: 6 }}>{models ? `Список загружен из каталога OpenRouter: ${models.length} моделей.` : 'Каталог OpenRouter пока не загрузился — показан короткий список.'}</p>
        </div>
      </div>
      <div className="card stack">
        <h2>Оформление</h2>
        <div className="chips">
          {([['auto', 'Как в системе'], ['light', 'Светлое'], ['dark', 'Тёмное']] as const).map(([id, name]) => (
            <button key={id} className={`chip ${settings.theme === id ? 'on' : ''}`} onClick={() => setState((s) => ({ ...s, settings: { ...s.settings, theme: id } }))}>{name}</button>
          ))}
        </div>
      </div>
      <div className="card stack">
        <h2>Данные</h2>
        <p className="small muted">Все данные хранятся локально. Сделайте резервную копию перед сменой устройства.</p>
        <div className="row">
          <button className="btn ghost" onClick={download}><Icon name="download" />Экспорт</button>
          <button className="btn ghost" onClick={() => file.current?.click()}><Icon name="import" />Импорт</button>
          <input ref={file} type="file" accept="application/json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return
            try { importData(await f.text()); setSaved(true) } catch { alert('Не удалось прочитать файл') }
          }} />
          <button className="btn danger" onClick={() => { if (confirm('Удалить все данные приложения?')) resetAll() }}>Сбросить всё</button>
        </div>
        {saved && <div className="pill good">Данные импортированы</div>}
      </div>
      <p className="tiny muted">LuxMasing не является медицинским изделием. Рекомендации носят образовательный характер; по вопросам лекарств и процедур обращайтесь к врачу.</p>
    </div>
  )
}

function ShareCard() {
  const hasFace = useStore((s) => s.progress.length > 0)
  const [face, setFace] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let dead = false, u: string | null = null
    renderCard(buildShared(face)).then((b) => { if (dead) return; u = URL.createObjectURL(b); setUrl(u) }).catch(() => {})
    return () => { dead = true; if (u) URL.revokeObjectURL(u) }
  }, [face])

  const link = () => shareUrl(buildShared(face))
  async function copy() {
    try { await navigator.clipboard.writeText(link()); setNote('Ссылка скопирована') } catch { setNote(link()) }
  }
  async function share() {
    const blob = await renderCard(buildShared(face))
    const file = new File([blob], 'luxmasing.png', { type: 'image/png' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Мой профиль LuxMasing', url: link() }) } catch { /* отменено */ }
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'luxmasing.png'; a.click()
      setNote('Картинка сохранена')
    }
  }
  return (
    <div className="card">
      <div className="grid g2" style={{ alignItems: 'center' }}>
        <div>{url && <img src={url} alt="Карточка профиля" style={{ width: '100%', maxWidth: 300, display: 'block', border: '1px solid var(--line)', borderRadius: 4 }} />}</div>
        <div className="stack">
          <div><div className="kicker">Поделиться</div><h2>Карточка профиля</h2>
            <p className="small muted">Картинка для сторис и ссылка, по которой друг увидит ваш уровень, серию и уроки. Фото лица в карточку не попадает никогда.</p></div>
          {hasFace && (
            <label style={{ textTransform: 'none', letterSpacing: 0, fontSize: 14, color: 'var(--ink)', display: 'flex', gap: 8, alignItems: 'center' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={face} onChange={(e) => setFace(e.target.checked)} />Показать баллы анализа лица
            </label>
          )}
          <div className="row">
            <button className="btn primary" onClick={share}><Icon name="share" />Поделиться картинкой</button>
            <button className="btn ghost" onClick={copy}><Icon name="copy" />Скопировать ссылку</button>
          </div>
          {note && <div className="tiny muted" style={{ wordBreak: 'break-all' }}>{note}</div>}
        </div>
      </div>
    </div>
  )
}
