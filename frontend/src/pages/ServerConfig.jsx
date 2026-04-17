import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Server, Wifi, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { setServerUrl } from '../utils/platform'

export default function ServerConfig() {
  const [url, setUrl] = useState('http://')
  const [testing, setTesting] = useState(false)
  const [status, setStatus] = useState(null) // 'ok' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  async function testConnection(targetUrl) {
    const normalized = targetUrl.trim().replace(/\/$/, '')
    try {
      const res = await fetch(`${normalized}/health`, { signal: AbortSignal.timeout(5000) })
      return res.ok
    } catch {
      return false
    }
  }

  async function handleSave() {
    const normalized = url.trim().replace(/\/$/, '')
    if (!normalized || normalized === 'http://' || normalized === 'https://') {
      setErrorMsg('Informe o endereço do servidor')
      setStatus('error')
      return
    }

    setTesting(true)
    setStatus(null)
    setErrorMsg('')

    const ok = await testConnection(normalized)
    setTesting(false)

    if (ok) {
      setServerUrl(normalized)
      setStatus('ok')
      setTimeout(() => navigate('/login', { replace: true }), 800)
    } else {
      setStatus('error')
      setErrorMsg('Servidor não respondeu. Verifique o endereço e se o servidor está online.')
    }
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
            Informe o endereço do servidor RLS Backup da sua empresa
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
              onChange={e => { setUrl(e.target.value); setStatus(null) }}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              placeholder="http://192.168.1.100:3010"
              className="w-full bg-slate-900 border border-slate-600 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/50 transition-colors"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
            />
            <p className="text-xs text-slate-500 mt-1.5">
              Exemplo: http://192.168.1.100:3010 ou https://backup.suaempresa.com
            </p>
          </div>

          {status === 'ok' && (
            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span className="text-sm">Conectado! Redirecionando...</span>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-start gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="text-sm">{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={testing || status === 'ok'}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl px-4 py-3 transition-colors"
          >
            {testing ? (
              <>
                <Wifi className="w-4 h-4 animate-pulse" />
                Testando conexão...
              </>
            ) : (
              <>
                Conectar
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          RLS Automação Industrial — v2.0
        </p>
      </div>
    </div>
  )
}
