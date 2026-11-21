import { useState } from 'react'
import { setState, getState, type Profile } from '../lib/store'

export const GOALS = ['Чистая кожа', 'Чёткая челюсть / меньше жира', 'Стрижка и волосы', 'Фигура и плечи', 'Стиль', 'Фотогеничность', 'Уверенность', 'Улыбка и зубы']

export function ProfileForm({ value, onChange }: { value: Profile; onChange: (p: Profile) => void }) {
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => onChange({ ...value, [k]: v })
  return (
    <div className="stack">
      <div className="grid g2">
        <div><label>Имя</label><input value={value.name} onChange={(e) => set('name', e.target.value)} placeholder="Как к вам обращаться" /></div>
        <div><label>Возраст</label><input type="number" min={13} max={90} value={value.age} onChange={(e) => set('age', Number(e.target.value))} /></div>
      </div>
      <div>
        <label>Пол (влияет на целевые пропорции и программу)</label>
        <div className="chips">
          {(['male', 'female'] as const).map((s) => (
            <button key={s} className={`chip ${value.sex === s ? 'on' : ''}`} onClick={() => set('sex', s)}>{s === 'male' ? 'Мужской' : 'Женский'}</button>
          ))}
        </div>
      </div>
      <div>
        <label>Тип кожи</label>
        <select value={value.skin} onChange={(e) => set('skin', e.target.value as Profile['skin'])}>
          <option value="normal">Нормальная</option><option value="oily">Жирная</option><option value="dry">Сухая</option>
          <option value="combo">Комбинированная</option><option value="sensitive">Чувствительная</option>
        </select>
      </div>
      <div className="chips">
        <button className={`chip ${value.acne ? 'on' : ''}`} onClick={() => set('acne', !value.acne)}>Есть акне</button>
        {value.sex === 'male' && <button className={`chip ${value.beard ? 'on' : ''}`} onClick={() => set('beard', !value.beard)}>Ношу бороду/щетину</button>}
        <button className={`chip ${value.glasses ? 'on' : ''}`} onClick={() => set('glasses', !value.glasses)}>Ношу очки</button>
      </div>
      <div className="grid g2">
        <div><label>Рост, см</label><input type="number" value={value.heightCm ?? ''} onChange={(e) => set('heightCm', e.target.value ? Number(e.target.value) : undefined)} /></div>
        <div><label>Вес, кг</label><input type="number" value={value.weightKg ?? ''} onChange={(e) => set('weightKg', e.target.value ? Number(e.target.value) : undefined)} /></div>
      </div>
      <div>
        <label>Цели</label>
        <div className="chips">
          {GOALS.map((g) => {
            const on = value.goals.includes(g)
            return <button key={g} className={`chip ${on ? 'on' : ''}`} onClick={() => set('goals', on ? value.goals.filter((x) => x !== g) : [...value.goals, g])}>{g}</button>
          })}
        </div>
      </div>
    </div>
  )
}

export default function Onboarding() {
  const [step, setStep] = useState(0)
  const [p, setP] = useState<Profile>(getState().profile)
  const finish = () => { setState((s) => ({ ...s, profile: { ...p, onboarded: true }, xp: s.xp + 50 })); location.hash = 'analyze' }
  return (
    <div className="modal-bg">
      <div className="modal">
        {step === 0 ? (
          <div className="stack">
            <div className="brand" style={{ padding: 0 }}>Lux<span>Masing</span></div>
            <h1>Лучшая версия вашего лица — по плану, а не наугад</h1>
            <p className="lead">Анализ пропорций и кожи по фото, ежедневная программа под ваш возраст, тренировки осанки и мимики с камерой, уроки с разбором исследований.</p>
            <table className="plain">
              <tbody>
                <tr><td>Только безопасные методы с доказательной базой</td></tr>
                <tr><td>Фото обрабатываются на устройстве и никуда не отправляются</td></tr>
                <tr><td>Результат измеряется: замеры, серии, уровни</td></tr>
              </tbody>
            </table>
            <button className="btn primary" onClick={() => setStep(1)}>Начать</button>
          </div>
        ) : (
          <div className="stack">
            <h2>Расскажите о себе</h2>
            <p className="small muted">От возраста и пола зависят программа, целевые пропорции и то, какие средства вам можно.</p>
            <ProfileForm value={p} onChange={setP} />
            <div className="row between">
              <button className="btn ghost" onClick={() => setStep(0)}>Назад</button>
              <button className="btn primary" onClick={finish}>Сделать первый анализ</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
