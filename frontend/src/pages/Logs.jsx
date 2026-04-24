import { useState, useEffect, useCallback } from 'react'
import {
  Activity, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Search, X, BarChart2
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import api, { formatDate, getActionLabel } from '../services/api'
import { useAuth } from '../context/AuthContext'

const CARD_ST = 'bg-white rounded-2xl border border-[#C41C1C]/10 shadow-sm'

const BADGE = 'inline-flex items-center px-2.5 py-1 rounded-md bg-[#0B3904] text-white text-[9px] font-black uppercase tracking-wider'
const ACTION_COLORS = {
  LOGIN:            BADGE,
  LOGIN_FAILED:     `inline-flex items-center px-2.5 py-1 rounded-md bg-[#C41C1C] text-white text-[9px] font-black uppercase tracking-wider`,
  FILE_UPLOAD:      BADGE,
  FILE_DOWNLOAD:    BADGE,
  FILE_DELETE:      BADGE,
}

const DATE_PRESETS = [
  { label: 'Hoje',        value: () => { const d = new Date(); d.setHours(0,0,0,0); return d.toISOString() } },
  { label: '7d',          value: () => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString() } },
  { label: '30d',         value: () => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString() } },
  { label: 'Tudo',        value: () => '' },
]

export default function Logs() {
  const { isAdmin } = useAuth()
  const [logs, setLogs]     = useState([])
  const [total, setTotal]   = useState(0)
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState(null)
  const [actions, setActions]   = useState([])
  const [users, setUsers]       = useState([])
  const [page, setPage]         = useState(1)
  const LIMIT = 25

  const [search, setSearch]     = useState('')
  const [action, setAction]     = useState('')
  const [userId, setUserId]     = useState('')
  const [since, setSince]       = useState('')
  const [activeDateLabel, setActiveDateLabel] = useState('Tudo')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT, action, search, userId, since }
      const { data } = await api.get('/api/logs', { params })
      setLogs(data.logs)
      setTotal(data.total)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [page, action, search, userId, since])

  useEffect(() => {
    const loadMeta = async () => {
      try {
        const [statsRes, actionsRes, usersRes] = await Promise.all([
          api.get('/api/logs/stats'),
          isAdmin ? api.get('/api/logs/actions') : Promise.resolve({ data: { actions: [] } }),
          isAdmin ? api.get('/api/logs/users')   : Promise.resolve({ data: { users: [] } }),
        ])
        setStatsData(statsRes.data)
        setActions(actionsRes.data.actions)
        setUsers(usersRes.data.users)
      } catch (err) { console.error(err) }
    }
    loadMeta()
  }, [isAdmin])

  useEffect(() => { loadLogs() }, [loadLogs])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="flex flex-col gap-6 lg:gap-4 lg:h-full lg:overflow-hidden animate-fadeIn pb-10 lg:pb-0">
      
      {/* ── HEADER STYLE DASHBOARD ────────────────── */}
      <div className={`${CARD_ST} p-6 lg:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 sm:gap-4 flex-shrink-0`}>
        <div className="flex items-center gap-4 w-full sm:w-auto min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600 shadow-sm border border-primary-100">
             <Activity size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl lg:text-lg font-black uppercase text-gray-900 tracking-tighter truncate">Auditores Log</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Histórico completo de eventos</p>
          </div>
        </div>
        <button onClick={loadLogs} className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 lg:py-2.5 rounded-2xl lg:rounded-xl bg-gray-100 text-gray-500 hover:text-gray-900 text-xs lg:text-[10px] font-black uppercase tracking-widest shadow-sm active:scale-95 transition-all">
          <RefreshCw size={18} className={`${loading ? 'animate-spin' : ''} lg:w-4 lg:h-4`} /> SINCRONIZAR
        </button>
      </div>

      {/* SEPARADOR GROSSO */}
      <div className="h-[1.5px] w-full bg-gradient-to-r from-transparent via-[#C41C1C]/25 to-transparent flex-shrink-0" />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-3 flex-shrink-0">
        {(statsData?.byAction || []).slice(0, 4).map(s => (
          <div key={s.action} className={`${CARD_ST} p-6 lg:p-4`}>
            <p className="text-[10px] lg:text-[9px] font-black uppercase tracking-widest text-[#64748B] truncate leading-none">{getActionLabel(s.action)}</p>
            <p className="text-3xl lg:text-xl font-black text-gray-900 mt-2 lg:mt-1">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className={`${CARD_ST} flex-1 lg:overflow-hidden flex flex-col`}>
        {/* Filters */}
        <div className="p-6 lg:p-4 border-b border-gray-100 bg-gray-50/20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input !bg-white pl-10 h-12 lg:h-10 text-sm lg:text-[11px] font-black uppercase tracking-widest" placeholder="BUSCAR..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input !bg-white h-12 lg:h-10 text-sm lg:text-[11px] font-black uppercase tracking-widest" value={action} onChange={e => { setAction(e.target.value); setPage(1) }}>
            <option value="">AÇÃO</option>
            {actions.map(a => <option key={a} value={a}>{getActionLabel(a)}</option>)}
          </select>
          {isAdmin && (
            <select className="input !bg-white h-12 lg:h-10 text-sm lg:text-[11px] font-black uppercase tracking-widest" value={userId} onChange={e => { setUserId(e.target.value); setPage(1) }}>
              <option value="">USUÁRIO</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          )}
          <div className="flex gap-2">
            {DATE_PRESETS.map(p => (
              <button key={p.label} onClick={() => { setSince(p.value()); setActiveDateLabel(p.label); setPage(1) }} className={`flex-1 text-[10px] font-black uppercase h-12 lg:h-10 rounded-xl transition-all ${activeDateLabel === p.label ? 'bg-[#1a7a0c] text-white shadow-md' : 'bg-white border border-gray-200 text-gray-400 hover:border-[#1a7a0c]/40'}`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
             <div className="p-16 flex justify-center"><div className="w-8 h-8 border-[3px] border-[#1a7a0c] border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead className="sticky top-0 z-10 bg-white shadow-sm">
                <tr>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 border-b border-gray-200">Evento</th>
                  {isAdmin && <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 border-b border-gray-200 hidden sm:table-cell">Responsável</th>}
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 border-b border-gray-200 hidden md:table-cell">Referência</th>
                  <th className="text-left px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 border-b border-gray-200 hidden lg:table-cell">IP ORIGEM</th>
                  <th className="text-right px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 border-b border-gray-200">Horário</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4"><span className={ACTION_COLORS[log.action] || 'inline-flex items-center px-2.5 py-1 rounded-md bg-[#0B3904] text-white text-[9px] font-black uppercase tracking-wider'}>{getActionLabel(log.action)}</span></td>
                    {isAdmin && (
                      <td className="px-6 py-4 hidden sm:table-cell">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0"><span className="text-[10px] font-black text-gray-800">{log.user_name?.charAt(0).toUpperCase()}</span></div>
                          <span className="text-xs font-bold text-gray-900 truncate">{log.user_name}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 hidden md:table-cell text-xs text-gray-800 font-medium truncate max-w-[250px]">{(log.details?.name || log.details?.email || '—')}</td>
                    <td className="px-6 py-4 hidden lg:table-cell text-[10px] font-mono text-gray-700">{log.ip_address}</td>
                    <td className="px-6 py-4 text-right text-[10px] font-black text-gray-700 uppercase whitespace-nowrap">{formatDate(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="p-6 lg:p-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6 sm:gap-4 flex-shrink-0 bg-gray-50/20">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Objetos Catalogados: {total}</p>
          <div className="flex items-center gap-4">
             <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="p-3 rounded-2xl bg-white shadow-sm border border-gray-100 hover:border-primary-500/20 disabled:opacity-30"><ChevronLeft size={18} className="lg:w-4 lg:h-4"/></button>
             <span className="text-sm lg:text-xs font-black text-gray-900 px-4 uppercase tracking-widest">Pág {page} de {totalPages || 1}</span>
             <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-3 rounded-2xl bg-white shadow-sm border border-gray-100 hover:border-primary-500/20 disabled:opacity-30"><ChevronRight size={18} className="lg:w-4 lg:h-4"/></button>
          </div>
        </div>
      </div>

    </div>
  )
}
