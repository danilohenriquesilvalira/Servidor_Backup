import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, LogIn, Lock, FolderOpen, RefreshCw, ClipboardList } from 'lucide-react'
import RLSLogo from '../components/RLSLogo'

const FEATURES = [
  { icon: Lock,          label: 'Acesso controlado por usuário' },
  { icon: FolderOpen,    label: 'Organização por pastas' },
  { icon: RefreshCw,     label: 'Versionamento automático' },
  { icon: ClipboardList, label: 'Log completo de atividades' },
]

export default function Login() {
  const { user, login } = useAuth()
  const [form, setForm]     = useState({ email: '', password: '' })
  const [showPass, setShow] = useState(false)
  const [loading, setLoad]  = useState(false)
  const [error, setError]   = useState('')

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoad(true)
    try {
      await login(form.email, form.password)
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciais invalidas. Tente novamente.')
    } finally {
      setLoad(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-card-md overflow-hidden flex">

        {/* ── Painel esquerdo — brand ── */}
        <div className="hidden lg:flex lg:w-[42%] bg-gray-900 flex-col relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-rls-red" />

          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-16 -right-16 w-60 h-60 rounded-full border border-white/[0.04]" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full border border-white/[0.04]" />
            <div className="absolute top-0 right-12 bottom-0 w-px bg-gradient-to-b from-rls-red/40 via-rls-red/10 to-transparent" />
          </div>

          <div className="flex flex-col flex-1 justify-center px-9 py-10 relative z-10">
            <RLSLogo size="md" showText theme="dark" className="mb-8" />
            <div className="flex items-center gap-3 mb-7">
              <div className="h-0.5 w-6 bg-rls-red flex-shrink-0" />
              <div className="h-px flex-1 bg-white/10" />
            </div>
            <h2 className="text-2xl font-black text-white leading-snug mb-2">
              Sistema de<br />
              <span className="text-primary-400">Backup Interno</span>
            </h2>
            <p className="text-white/40 text-sm leading-relaxed mt-2 mb-8">
              Centralize e proteja os arquivos tecnicos da equipe.
            </p>
            <div className="space-y-2">
              {FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                  <Icon size={14} className="text-primary-400 flex-shrink-0" strokeWidth={1.8} />
                  <span className="text-white/55 text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="h-[3px] bg-rls-red/40 flex-shrink-0" />
        </div>

        {/* ── Painel direito — formulario ── */}
        <div className="flex-1 flex flex-col">
          <div className="h-[3px] bg-rls-red lg:hidden flex-shrink-0" />
          <div className="flex-1 flex flex-col justify-center px-7 py-10 lg:px-10">
            <div className="lg:hidden mb-8">
              <RLSLogo size="md" showText theme="light" />
              <div className="mt-3 h-px w-16 bg-gradient-to-r from-rls-red/50 to-transparent" />
            </div>
            <div className="mb-7">
              <h2 className="text-xl font-bold text-gray-900">Bem-vindo</h2>
              <p className="text-gray-400 text-sm mt-1">Faca login para acessar o sistema</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email" className="input" placeholder="exemplo@rls.local"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required autoFocus
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="label">Senha</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="input pr-10" placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShow(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-[11px] font-black uppercase tracking-wider px-3 py-3 rounded-xl shadow-sm animate-shake">
                  <Lock size={12} className="flex-shrink-0" />
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-[#1a7a0c] text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg shadow-green-500/20 hover:scale-[1.01] active:scale-95 transition-all">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" /> Entrando...</>
                  : <><LogIn size={16} className="mr-2 inline" /> Entrar no Sistema</>
                }
              </button>
            </form>
          </div>
          <p className="text-center text-[10px] font-bold text-gray-300 pb-4 uppercase tracking-widest">
            RLS Automacao Industrial &copy; {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </div>
  )
}
