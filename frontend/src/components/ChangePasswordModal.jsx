import { useState } from 'react'
import { X, KeyRound, Eye, EyeOff } from 'lucide-react'
import api from '../services/api'

export default function ChangePasswordModal({ onClose }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [show, setShow] = useState({ current: false, new: false, confirm: false })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.newPassword !== form.confirm) {
      setError('As senhas não conferem')
      return
    }
    if (form.newPassword.length < 6) {
      setError('Nova senha deve ter no mínimo 6 caracteres')
      return
    }
    setLoading(true)
    try {
      await api.post('/api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      })
      setSuccess(true)
      setTimeout(onClose, 1500)
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <KeyRound size={18} className="text-primary-500" />
            <h2 className="text-base font-semibold text-gray-900">Alterar Senha</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {[
            { key: 'currentPassword', label: 'Senha atual', showKey: 'current' },
            { key: 'newPassword',     label: 'Nova senha',  showKey: 'new' },
            { key: 'confirm',         label: 'Confirmar nova senha', showKey: 'confirm' },
          ].map(({ key, label, showKey }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <div className="relative">
                <input
                  type={show[showKey] ? 'text' : 'password'}
                  className="input pr-10"
                  value={form[key]}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {show[showKey] ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          {error && (
            <div className="bg-danger-light text-danger-dark text-sm px-3 py-2 rounded-lg border border-danger/20">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-primary-50 text-primary-700 text-sm px-3 py-2 rounded-lg border border-primary-200">
              Senha alterada com sucesso!
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
