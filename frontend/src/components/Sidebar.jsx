import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FolderOpen, Users, Activity, X, Globe, LogOut, ServerCog
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { isTauri, clearServerConfig } from '../utils/platform'
import RLSLogo from './RLSLogo'

const NAV = [
  { to: '/',       icon: LayoutDashboard, label: 'Dashboard',      exact: true },
  { to: '/files',  icon: FolderOpen,      label: 'Arquivos' },
  { to: '/shared', icon: Globe,           label: 'Acervo Público' },
  { to: '/logs',   icon: Activity,        label: 'Atividades' },
]
const ADMIN_NAV = [
  { to: '/admin', icon: Users, label: 'Usuários' },
]

function NavItem({ to, icon: Icon, label, exact }) {
  return (
    <NavLink
      to={to}
      end={exact}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group
         ${isActive
           ? 'bg-green-50 text-[#0B3904]'
           : 'text-[#000000] hover:bg-gray-50'
         }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#C41C1C] rounded-r-full" />
          )}
          <Icon
            size={18}
            className={isActive ? 'text-[#0B3904]' : 'text-gray-400 group-hover:text-black'}
            strokeWidth={1.5}
          />
          <span className={`text-[11px] font-black uppercase tracking-widest ${isActive ? 'text-[#0B3904]' : 'text-black'}`}>
            {label}
          </span>
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

  return (
    <aside className={`
      fixed lg:static inset-y-0 left-0 z-30
      w-60 flex flex-col
      bg-white border-r border-gray-100
      transform transition-transform duration-300 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
    `}>

      {/* Linha vermelha topo */}
      <div className="h-[2px] bg-[#C41C1C] flex-shrink-0" />

      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-6">
        <RLSLogo size="sm" showText theme="light" />
        <button
          onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-900 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 space-y-7 overflow-y-auto custom-scrollbar pt-4">
        <div>
          <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-4 mb-3">Explorar</p>
          <div className="space-y-0.5">
            {NAV.map(item => <NavItem key={item.to} {...item} />)}
          </div>
        </div>

        {isAdmin && (
          <div>
            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-4 mb-3">Administração</p>
            <div className="space-y-0.5">
              {ADMIN_NAV.map(item => <NavItem key={item.to} {...item} />)}
            </div>
          </div>
        )}
      </nav>

      {/* Footer — Logout Funcional */}
      <div className="p-4 border-t border-gray-50 mt-auto">
        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-gray-50/50 border border-transparent group">
          <div className="w-8 h-8 rounded-lg bg-[#0B3904] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-[10px] font-black uppercase">
              {user?.name?.charAt(0)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-black text-[#000000] truncate uppercase tracking-tight">{user?.name}</p>
            <p className="text-[9px] text-[#0B3904] font-black uppercase opacity-60">{user?.role}</p>
          </div>
          <div className="flex items-center gap-0.5">
            {isTauri() && (
              <button
                onClick={handleChangeServer}
                title="Trocar Servidor"
                className="p-1.5 rounded-lg text-gray-300 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
              >
                <ServerCog size={16} />
              </button>
            )}
            <button
              onClick={logout}
              title="Sair do Sistema"
              className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all active:scale-90"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
