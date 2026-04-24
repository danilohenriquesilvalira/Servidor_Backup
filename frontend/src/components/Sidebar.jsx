import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Users, Activity, X, Globe, LogOut, ServerCog
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isTauri, clearServerConfig } from '../utils/platform'
import RLSLogo from './RLSLogo'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/files', icon: FolderOpen, label: 'Arquivos' },
  { to: '/shared', icon: Globe, label: 'Acervo Público' },
  { to: '/logs', icon: Activity, label: 'Atividades' },
]
const ADMIN_NAV = [
  { to: '/admin', icon: Users, label: 'Usuários' },
]

function SectionLabel({ children }) {
  return (
    <p className="text-[9.5px] font-black text-gray-400 uppercase tracking-[0.22em] px-3.5 mb-2 select-none">
      {children}
    </p>
  )
}

function NavItem({ to, icon: Icon, label, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 group
         ${isActive
          ? 'bg-[#0B3904] text-white shadow-sm shadow-green-950/25'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={17}
            strokeWidth={isActive ? 2.2 : 1.75}
            className={isActive
              ? 'text-white/90 shrink-0'
              : 'text-gray-400 group-hover:text-gray-600 shrink-0'
            }
          />
          <span className={`
            text-[11px] font-black uppercase tracking-widest truncate
            ${isActive ? 'text-white' : ''}
          `}>
            {label}
          </span>
          {isActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#C41C1C] shrink-0 shadow-sm" />
          )}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ open, onClose }) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  function handleChangeServer() {
    logout()
    clearServerConfig()
    navigate('/setup', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-30
      w-60 flex flex-col
      bg-white border-r border-gray-100/80
      transform transition-transform duration-300 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
    `}>

      {/* Header — Logo */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100/80">
        <RLSLogo size="sm" showText theme="light" />
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-gray-300 hover:text-gray-700 hover:bg-gray-100 transition-all"
        >
          <X size={17} />
        </button>
      </div>

      {/* Navegação */}
      <nav className="flex-1 px-3 overflow-y-auto custom-scrollbar pt-5 pb-2 space-y-5">
        <div>
          <SectionLabel>Explorar</SectionLabel>
          <div className="space-y-0.5">
            {NAV.map(item => <NavItem key={item.to} {...item} />)}
          </div>
        </div>

        {isAdmin && (
          <div>
            <SectionLabel>Administração</SectionLabel>
            <div className="space-y-0.5">
              {ADMIN_NAV.map(item => <NavItem key={item.to} {...item} />)}
            </div>
          </div>
        )}
      </nav>

      {/* Footer — Usuário */}
      <div className="p-3 border-t border-gray-100/80 mt-auto">
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 mb-1.5">
          {/* Avatar */}
          <div className="w-8 h-8 rounded-lg bg-[#0B3904] flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white text-[10px] font-black uppercase tracking-wide">
              {initials}
            </span>
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-gray-800 truncate uppercase tracking-tight leading-tight">
              {user?.name}
            </p>
            <p className="text-[9.5px] font-extrabold text-[#0B3904] uppercase tracking-wider opacity-70 leading-tight">
              {user?.role}
            </p>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-0.5 shrink-0">
            {isTauri() && (
              <button
                onClick={handleChangeServer}
                title="Trocar Servidor"
                className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
              >
                <ServerCog size={15} />
              </button>
            )}
            <button
              onClick={logout}
              title="Sair do Sistema"
              className="p-1.5 rounded-lg text-gray-300 hover:text-[#C41C1C] hover:bg-red-50 transition-all active:scale-90"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
