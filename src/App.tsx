import { useHash, useStore } from './lib/store'
import Home from './pages/Home'
import Analyze from './pages/Analyze'
import Program from './pages/Program'
import Trainer from './pages/Trainer'
import Academy from './pages/Academy'
import Progress from './pages/Progress'
import Coach from './pages/Coach'
import ProfilePage from './pages/Profile'
import Onboarding from './pages/Onboarding'

const NAV = [
  { id: 'home', name: 'Главная', ico: '🏠' },
  { id: 'analyze', name: 'Анализ', ico: '🔬' },
  { id: 'program', name: 'Программа', ico: '✅' },
  { id: 'trainer', name: 'Тренажёр', ico: '🎯' },
  { id: 'academy', name: 'Академия', ico: '🎓' },
  { id: 'progress', name: 'Прогресс', ico: '📈' },
  { id: 'coach', name: 'ИИ-коуч', ico: '🤖' },
  { id: 'profile', name: 'Профиль', ico: '👤' },
]

export default function App() {
  const [hash] = useHash()
  const onboarded = useStore((s) => s.profile.onboarded)
  const [page, ...rest] = hash.split('/')
  const param = rest.join('/')

  let view
  switch (page) {
    case 'analyze': view = <Analyze />; break
    case 'program': view = <Program />; break
    case 'trainer': view = <Trainer drillId={param} />; break
    case 'academy': view = <Academy lessonId={param} />; break
    case 'progress': view = <Progress />; break
    case 'coach': view = <Coach />; break
    case 'profile': view = <ProfilePage />; break
    default: view = <Home />
  }

  return (
    <div className="layout">
      <aside className="side">
        <div className="brand"><div className="logo">L</div><b>LuxMasing</b></div>
        <nav className="nav">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className={page === n.id || (!page && n.id === 'home') ? 'active' : ''}>
              <span className="ico">{n.ico}</span>{n.name}
            </a>
          ))}
        </nav>
        <p className="tiny muted" style={{ position: 'absolute', bottom: 16, left: 22, right: 14 }}>
          Анализ лица работает на устройстве. Фото не загружаются на сервер.
        </p>
      </aside>
      <main className="main">{view}</main>
      <nav className="bottom">
        {NAV.map((n) => (
          <a key={n.id} href={`#${n.id}`} className={page === n.id || (!page && n.id === 'home') ? 'active' : ''}>
            <span className="ico">{n.ico}</span>{n.name}
          </a>
        ))}
      </nav>
      {!onboarded && <Onboarding />}
    </div>
  )
}
