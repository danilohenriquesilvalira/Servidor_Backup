import { useState, useEffect } from 'react'
import {
  Users, Plus, Edit2, UserX, UserCheck, X, Save, Shield,
  HardDrive, Files as FilesIcon
} from 'lucide-react'
import api, { formatBytes, formatDate } from '../services/api'
import StorageBar from '../components/StorageBar'

const CARD_ST = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

export default function Admin() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState({ name: '', email: '', password: '', role: 'user', storageLimitGb: '' })
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/users')
      setUsers(data.users)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', email: '', password: '', role: 'user', storageLimitGb: '' })
    setError('')
    setShowModal(true)
  }

  const openEdit = (user) => {
    setEditing(user)
    const gbVal = user.storage_limit ? (user.storage_limit / (1024 * 1024 * 1024)).toFixed(1) : ''
    setForm({ name: user.name, email: user.email, password: '', role: user.role, storageLimitGb: gbVal })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        storageLimitGb: form.storageLimitGb !== '' ? parseFloat(form.storageLimitGb) : null,
      }
      if (form.password) payload.password = form.password
      if (!editing)       payload.password = form.password

      if (editing) {
        await api.put(`/api/users/${editing.id}`, payload)
      } else {
        await api.post('/api/users', payload)
      }
      setShowModal(false)
      load()
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (user) => {
    if (!confirm(`${user.active ? 'Desativar' : 'Ativar'} usuário ${user.name}?`)) return
    try {
      if (user.active) {
        await api.delete(`/api/users/${user.id}`)
      } else {
        await api.put(`/api/users/${user.id}`, { active: true })
      }
      load()
    } catch (err) { alert(err.response?.data?.error || 'Erro') }
  }

  const totalSize  = users.reduce((s, u) => s + parseInt(u.total_size  || 0), 0)
  const totalFiles = users.reduce((s, u) => s + parseInt(u.file_count  || 0), 0)

  return (
    <div className="flex flex-col gap-6 lg:gap-4 lg:h-full lg:overflow-hidden animate-fadeIn pb-10 lg:pb-0 font-sans">
      
      {/* ── HEADER STYLE DASHBOARD ── */}
      <div className={`${CARD_ST} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 p-6 lg:p-4 flex-shrink-0`}>
        <div className="min-w-0">
          <h1 className="text-3xl lg:text-xl font-black uppercase underline decoration-[#0B3904]/20 underline-offset-8 tracking-tighter text-[#1E293B]">
             Gestão de Usuários
          </h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-5">
            Mapeamento e Controle de Cota RLS
          </p>
        </div>
        <button onClick={openCreate} className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 lg:py-2.5 rounded-2xl lg:rounded-xl bg-[#0B3904] text-white text-xs lg:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-900/10 hover:bg-black active:scale-95 transition-all">
          <Plus size={18} /> NOVO USUÁRIO
        </button>
      </div>

      <div className="h-[2px] w-full bg-slate-200 flex-shrink-0" />

      {/* Sumário */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-3 flex-shrink-0">
        {[
          { label: 'CONTAS', value: users.length, icon: Users, color: 'text-[#0B3904]', bg: 'bg-green-50' },
          { label: 'ATIVOS', value: users.filter(u=>u.active).length, icon: UserCheck, color: 'text-green-900', bg: 'bg-green-50/50' },
          { label: 'OBJETOS', value: totalFiles, icon: FilesIcon, color: 'text-blue-900', bg: 'bg-blue-50/50' },
          { label: 'DISCO', value: formatBytes(totalSize), icon: HardDrive, color: 'text-violet-900', bg: 'bg-violet-50/50' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border-2 border-slate-100 p-6 lg:p-4 flex flex-col items-start shadow-sm">
            <div className={`w-8 h-8 rounded-xl ${c.bg} flex items-center justify-center mb-4 lg:mb-2`}>
              <c.icon size={16} className={c.color} />
            </div>
            <p className="text-2xl lg:text-xl font-black text-slate-900 tracking-tighter leading-none">{c.value}</p>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mt-2 lg:mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto custom-scrollbar table-container">
          {loading ? (
             <div className="p-16 flex justify-center"><div className="w-8 h-8 border-[3px] border-[#0B3904] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                   <th className="th">Identidade</th>
                   <th className="th hidden md:table-cell">E-mail</th>
                   <th className="th hidden sm:table-cell">Nível</th>
                   <th className="th hidden lg:table-cell">Uso de Cota</th>
                   <th className="th text-right">Operações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {users.map(user => (
                  <tr key={user.id} className="table-row">
                    <td className="td">
                      <div className="flex items-center gap-4 group">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black shadow-lg
                          ${user.active ? 'bg-[#0B3904]' : 'bg-gray-400'}`}>
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base lg:text-sm font-black text-black truncate uppercase tracking-tight">{user.name}</p>
                          <p className="text-[10px] text-gray-500 font-black md:hidden truncate uppercase tracking-tighter">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="td hidden md:table-cell text-gray-600 font-bold">{user.email}</td>
                    <td className="td hidden sm:table-cell">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2
                        ${user.role === 'admin' ? 'bg-[#0B3904] text-white border-[#0B3904]' : 'bg-white text-gray-500 border-gray-200'}`}>
                        {user.role === 'admin' ? 'ADMIN' : 'USER'}
                      </span>
                    </td>
                    <td className="td hidden lg:table-cell w-56">
                      <div className="flex flex-col gap-2">
                        <StorageBar used={parseInt(user.total_size || 0)} limit={user.storage_limit ? parseInt(user.storage_limit) : null} showNumbers={false} height={8} />
                        <div className="flex justify-between text-[9px] font-black text-gray-500 uppercase">
                          <span>{formatBytes(user.total_size)}</span>
                          <span>{user.storage_limit ? formatBytes(user.storage_limit) : 'ILIMITADO'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(user)} className="p-2.5 rounded-xl bg-white border-2 border-gray-200 text-gray-400 hover:text-slate-900 hover:border-slate-200 transition-all">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => toggleActive(user)} className={`p-2.5 rounded-xl border-2 transition-all ${user.active ? 'bg-white text-gray-400 border-gray-200 hover:text-red-500 hover:border-red-500' : 'bg-green-600 text-white border-green-600'}`}>
                          {user.active ? <UserX size={16} /> : <UserCheck size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[50] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden relative border-2 border-slate-200">
             <div className="h-2 bg-[#0B3904]" />
             <div className="p-8 lg:p-10">
                <div className="flex items-center justify-between mb-8">
                   <h2 className="text-2xl font-black text-[#0B3904] uppercase tracking-tighter">{editing ? 'Editar Conta' : 'Nova Conta'}</h2>
                   <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500"><X size={20}/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Nome Completo</label>
                     <input className="input !bg-slate-50 border-2 border-slate-100" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">E-mail</label>
                     <input type="email" className="input !bg-slate-50 border-2 border-slate-100 text-gray-400" value={form.email} disabled />
                   </div>
                   <div>
                     <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Nova Senha</label>
                     <input type="password" className="input !bg-slate-50 border-2 border-slate-100" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editing} />
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Nível</label>
                       <select className="input !bg-slate-50 border-2 border-slate-100" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                         <option value="user">OPERÁRIO</option>
                         <option value="admin">ADMIN</option>
                       </select>
                     </div>
                     <div>
                       <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2 block">Cota (GB)</label>
                       <input type="number" className="input !bg-slate-50 border-2 border-slate-100" value={form.storageLimitGb} onChange={e => setForm({...form, storageLimitGb: e.target.value})} />
                     </div>
                   </div>
                   {error && <p className="text-[10px] font-black text-red-600 uppercase bg-red-50 p-3 rounded-xl border-2 border-red-100">{error}</p>}
                   <button type="submit" disabled={saving} className="w-full py-4 rounded-2xl bg-[#0B3904] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black transition-all mt-4">
                     {saving ? 'Sincronizando...' : 'Efetivar Registro'}
                   </button>
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}
