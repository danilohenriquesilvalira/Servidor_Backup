import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, ArrowRight } from 'lucide-react'
import { setServerUrl } from '../utils/platform'

export default function ServerConfig() {
  const [url, setUrl] = useState('http://192.168.1.70:3009')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const normalized = url.trim().replace(/\/$/, '')
  const isValid = normalized.startsWith('http://') || normalized.startsWith('https://')

  function handleSave() {
    if (!isValid) {
      setError('Informe o endereço completo (ex: http://192.168.1.70:3009)')
      return
    }
    setServerUrl(normalized)
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary-500/30">
            <Server className="w-8 h-8 text-primary-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Configurar Servidor</h1>
          <p className="text-slate-400 text-sm">
            Informe o endereço do servidor RLS Backup
          </p>
        </div>

        <div className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Endereço do Servidor
            </label>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="http://192.168.1.70:3009"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-colors"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              IP do servidor na rede + porta 3009 (ex: http://192.168.1.70:3009)
            </p>
          </div>

          {error && (
            <div className="text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!isValid}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-4 py-3 transition-colors"
          >
            Salvar e Entrar
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">RLS Automação Industrial — v2.0</p>
      </div>
    </div>
  )
}
