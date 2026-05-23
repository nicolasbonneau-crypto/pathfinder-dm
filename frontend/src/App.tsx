import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { BookOpen, Swords } from 'lucide-react'
import KnowledgePage from './pages/KnowledgePage'
import CombatPage from './pages/CombatPage'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav className="nav">
          <div className="nav-brand">PF2e DM Helper</div>
          <div className="nav-links">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <BookOpen size={18} />
              Knowledge
            </NavLink>
            <NavLink to="/combat" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              <Swords size={18} />
              Combat
            </NavLink>
          </div>
        </nav>
        <main className="main">
          <Routes>
            <Route path="/" element={<KnowledgePage />} />
            <Route path="/combat" element={<CombatPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
