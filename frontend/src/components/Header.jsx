import { Menu, LogOut, KeyRound, ChevronDown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import ChangePasswordModal from './ChangePasswordModal'

const PAGE_TITLES = {
  '/':        'Dashboard',
  '/files':   'Arquivos',
  '/shared':  'Compartilhados',
  '/logs':    'Atividades',
  '/admin':   'Usuários',
}

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth()
  const [showMenu, setShowMenu] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'RLS Backup'

  return (
    <>
      <header className="relative bg-white border-b border-gray-200 h-14 flex items-center px-4 lg:px-5 gap-3 flex-shrink-0">
        {/* Linha vermelha topo — alinhada com a sidebar */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-rls-red" />

        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
        >
          <Menu size={18} />
        </button>

        <h1 className="text-base font-semibold text-gray-800 flex-1">{title}</h1>

        {/* Perfil */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
          >
            <div className="w-7 h-7 rounded-lg bg-[#0B3904] flex items-center justify-center">
              <span className="text-white text-xs font-black">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
            <ChevronDown size={13} className="text-gray-400 hidden sm:block" />
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-1 animate-fadeIn z-50">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => { setShowPassword(true); setShowMenu(false) }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <KeyRound size={14} className="text-gray-400" />
                Alterar senha
              </button>
              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-rls-red hover:bg-red-50 transition-colors"
                >
                  <LogOut size={14} />
                  Sair do sistema
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
      {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />}
    </>
  )
}
