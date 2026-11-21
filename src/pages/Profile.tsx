import { useRef, useState } from 'react'
import { exportData, importData, resetAll, setState, useStore } from '../lib/store'
import { MODEL_PRESETS } from '../lib/openrouter'
import { ProfileForm } from './Onboarding'

export default function ProfilePage() {
  const profile = useStore((s) => s.profile)
  const settings = useStore((s) => s.settings)
  const [saved, setSaved] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const download = () => {
    const blob = new Blob([exportData()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `luxmasing-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  return (
    <div className="stack">
      <h1>Профиль и настройки</h1>
      <div className="card">
        <h2>Профиль</h2>
        <ProfileForm value={profile} onChange={(p) => setState((s) => ({ ...s, profile: p }))} />
      </div>
      <div className="card stack">
        <h2>ИИ-коуч (OpenRouter)</h2>
        <p className="small muted">Анализ точек лица работает бесплатно и офлайн (MediaPipe). Для чата с коучем и разбора кожи/волос по фото нужен ключ <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">OpenRouter</a>. Ключ хранится только в этом браузере и отправляется только в OpenRouter.</p>
        <div>
          <label>API-ключ</label>
          <input type="password" value={settings.openrouterKey} placeholder="sk-or-v1-…" onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, openrouterKey: e.target.value.trim() } }))} />
        </div>
        <div>
          <label>Модель (нужна модель с поддержкой изображений для разбора фото)</label>
          <input list="models" value={settings.model} onChange={(e) => setState((s) => ({ ...s, settings: { ...s.settings, model: e.target.value.trim() } }))} />
          <datalist id="models">{MODEL_PRESETS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</datalist>
          <div className="chips mt">
            {MODEL_PRESETS.map((m) => (
              <button key={m.id} className={`chip ${settings.model === m.id ? 'on' : ''}`} title={m.label} onClick={() => setState((s) => ({ ...s, settings: { ...s.settings, model: m.id } }))}>{m.id.split('/')[1]}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="card stack">
        <h2>Данные</h2>
        <p className="small muted">Все данные хранятся локально. Сделайте резервную копию перед сменой устройства.</p>
        <div className="row">
          <button className="btn" onClick={download}>⬇️ Экспорт</button>
          <button className="btn" onClick={() => file.current?.click()}>⬆️ Импорт</button>
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
