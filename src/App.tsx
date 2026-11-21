import { useEffect, useState } from 'react'
import { applyTheme, useHash, useStore } from './lib/store'
import { Icon } from './components/Icon'
import Home from './pages/Home'
import Analyze from './pages/Analyze'
import Skin from './pages/Skin'
import Program from './pages/Program'
import Trainer from './pages/Trainer'
import Academy from './pages/Academy'
import Progress from './pages/Progress'
import Coach from './pages/Coach'
import ProfilePage from './pages/Profile'
import Onboarding from './pages/Onboarding'
import Shared from './pages/Shared'
import Battle from './pages/Battle'

const NAV = [
  { id: 'home', name: 'Сегодня' },
  { id: 'analyze', name: 'Анализ лица' },
  { id: 'skin', name: 'Кожа' },
  { id: 'program', name: 'Программа' },
  { id: 'trainer', name: 'Тренировки' },
  { id: 'academy', name: 'Академия' },
  { id: 'progress', name: 'Прогресс' },
  { id: 'battle', name: 'Битва' },
  { id: 'coach', name: 'Коуч' },
  { id: 'profile', name: 'Профиль' },
]
const MOBILE_MAIN = ['home', 'analyze', 'program', 'trainer']

export default function App() {
  const [hash] = useHash()
  const onboarded = useStore((s) => s.profile.onboarded)
  const theme = useStore((s) => s.settings.theme)
  const [more, setMore] = useState(false)
  const [page, ...rest] = hash.split('/')
  const param = rest.join('/')
  useEffect(() => { applyTheme() }, [theme])
  useEffect(() => { setMore(false) }, [hash])

  if (page === 'u') return <main className="main" style={{ margin: '0 auto' }}><Shared code={param} /></main>

  let view
  switch (page) {
    case 'analyze': view = <Analyze />; break
    case 'skin': view = <Skin />; break
    case 'program': view = <Program />; break
    case 'trainer': view = <Trainer param={param} />; break
    case 'academy': view = <Academy lessonId={param} />; break
    case 'progress': view = <Progress />; break
    case 'battle': view = <Battle param={param} />; break
    case 'coach': view = <Coach />; break
    case 'profile': view = <ProfilePage />; break
    default: view = <Home />
  }
  const cur = NAV.some((n) => n.id === page) ? page : 'home'

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand">Lux<span>Masing</span></div>
        <nav className="nav">
          {NAV.map((n) => <a key={n.id} href={`#${n.id}`} className={cur === n.id ? 'active' : ''}><Icon name={n.id} />{n.name}</a>)}
        </nav>
        <div className="foot">Анализ лица и кожи считается на вашем устройстве. Фото не загружаются на сервер.</div>
      </aside>
      <main className="main">{view}</main>
      {more && (
        <div className="sheet" onClick={() => setMore(false)}>
          <div>{NAV.filter((n) => !MOBILE_MAIN.includes(n.id)).map((n) => <a key={n.id} href={`#${n.id}`}><Icon name={n.id} />{n.name}</a>)}</div>
        </div>
      )}
      <nav className="bottom">
        {NAV.filter((n) => MOBILE_MAIN.includes(n.id)).map((n) => (
          <a key={n.id} href={`#${n.id}`} className={cur === n.id && !more ? 'active' : ''}><Icon name={n.id} size={21} />{n.name.split(' ')[0]}</a>
        ))}
        <button className={more || !MOBILE_MAIN.includes(cur) ? 'active' : ''} onClick={() => setMore(!more)}><Icon name="menu" size={21} />Ещё</button>
      </nav>
      {!onboarded && <Onboarding />}
    </div>
  )
}
