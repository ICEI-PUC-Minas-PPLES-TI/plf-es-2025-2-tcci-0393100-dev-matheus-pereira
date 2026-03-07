import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { AUTH_TOKEN_KEY, isMockEnabled, USER_DISPLAY_KEY } from '@/lib/api'

const navItems = [
  { to: '/', label: 'Dashboard', icon: GridIcon },
  { to: '/clientes', label: 'Clientes', icon: PeopleIcon },
  { to: '/inadimplentes', label: 'Inadimplentes', icon: AlertIcon },
  { to: '/servicos', label: 'Serviços', icon: ServicesIcon },
  { to: '/reforma-tributaria', label: 'Cálculo', icon: CalculatorIcon },
  { to: '/relatorios', label: 'Relatórios', icon: ChartIcon },
]

function GridIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}

function ChartIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  )
}

function ServicesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M9 16h6" />
    </svg>
  )
}

function CalculatorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M8 10h1" />
      <path d="M11 10h1" />
      <path d="M14 10h1" />
      <path d="M8 14h1" />
      <path d="M11 14h1" />
      <path d="M14 14h1" />
      <path d="M17 10h-1" />
      <path d="M17 14h-1" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export default function Layout() {
  const navigate = useNavigate()
  const showSair = !isMockEnabled() && typeof localStorage !== 'undefined' && localStorage.getItem(AUTH_TOKEN_KEY)
  const userDisplay = typeof localStorage !== 'undefined' ? (localStorage.getItem(USER_DISPLAY_KEY) || 'Usuário') : 'Usuário'

  function handleSair() {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(USER_DISPLAY_KEY)
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand__logo">
            <LogoIcon />
          </div>
          <div className="sidebar-brand__textos">
            <span className="sidebar-brand__titulo">Contabilidade Sao Judas Tadeu</span>
            <span className="sidebar-brand__subtitulo">Sistema de Gerenciamento de Inadimplentes</span>
          </div>
        </div>
        <div className="sidebar-user" aria-label="Usuário logado">
          <span className="sidebar-user__icon" aria-hidden="true">
            <UserIcon />
          </span>
          <span className="sidebar-user__name" title={userDisplay}>
            {userDisplay}
          </span>
        </div>
        <nav className="sidebar-nav" aria-label="Menu">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}
            >
              <Icon />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {showSair && (
          <div className="sidebar-sair">
            <button type="button" className="sidebar-sair__btn" onClick={handleSair}>
              Sair
            </button>
          </div>
        )}
      </aside>
      <div className="main-wrapper">
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function LogoIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="4" cy="28" r="4" fill="#A43F9B" />
      <circle cx="12" cy="28" r="4" fill="#A43F9B" />
      <circle cx="20" cy="28" r="4" fill="#A43F9B" />
      <circle cx="28" cy="28" r="4" fill="#A43F9B" />
      <circle cx="12" cy="20" r="4" fill="#A43F9B" />
      <circle cx="20" cy="20" r="4" fill="#A43F9B" />
      <circle cx="28" cy="20" r="4" fill="#A43F9B" />
      <circle cx="20" cy="12" r="4" fill="#A43F9B" />
      <circle cx="28" cy="12" r="4" fill="#A43F9B" />
      <circle cx="28" cy="4" r="4" fill="#A43F9B" />
    </svg>
  )
}
