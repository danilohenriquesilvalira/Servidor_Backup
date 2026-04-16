import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import {
  HardDrive, Files as FilesIcon, Upload, Server, Users,
  Globe, Clock, ArrowRight, TrendingUp, PieChart as PieIcon,
  ShieldCheck, FolderOpen
} from 'lucide-react'
import api, { formatBytes, formatDate } from '../services/api'
import { useAuth } from '../context/AuthContext'
import FileTypeIcon from '../components/FileTypeIcon'

const GREEN_DARK = '#0B3904'
const CARD_ST = 'bg-white rounded-2xl border border-gray-100 shadow-sm'
const PIE_PAL    = ['#0B3904', '#1a7a0c', '#14532d', '#f59e0b', '#C41C1C', '#2563eb', '#7c3aed']

function BentoStat({ title, value, sub, icon: Icon, isMain = false, className = '' }) {
  if (isMain) {
    return (
      <div className={`relative overflow-hidden bg-[#0B3904] rounded-2xl border border-white/10 p-5 lg:p-4 shadow-lg shadow-green-900/10 ${className}`}>
        <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full bg-green-400/10 blur-3xl opacity-20 pointer-events-none" />
        <div className="flex flex-col h-full justify-between gap-4 lg:gap-2 relative z-10">
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/20 text-white border border-white/20">
            <Icon size={18} />
          </div>
          <div>
            <span className="font-black tracking-tighter leading-none text-3xl lg:text-2xl text-white block">{value}</span>
            <h3 className="text-[10px] lg:text-[9px] font-black uppercase tracking-widest text-white/70 mt-1">{title}</h3>
            {sub && <p className="text-[9px] text-white/40 font-bold uppercase mt-1">{sub}</p>}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5 lg:p-4 shadow-sm hover:shadow-md transition-all group ${className}`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-red-50 blur-3xl opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none" />
      <div className="flex flex-col h-full justify-between gap-4 lg:gap-2 relative z-10">
        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 group-hover:text-[#0B3904] group-hover:bg-green-50 border border-gray-100 group-hover:border-green-100 transition-colors">
          <Icon size={16} strokeWidth={1.5} />
        </div>
        <div>
          <span className="font-black tracking-tighter leading-none text-2xl lg:text-xl text-[#1E293B] block">{value}</span>
          <h3 className="text-[10px] lg:text-[9px] font-black uppercase tracking-[0.1em] text-[#64748B] mt-1 group-hover:text-[#0B3904] transition-colors">{title}</h3>
          {sub && <p className="text-[9px] text-gray-300 font-bold uppercase mt-1">{sub}</p>}
        </div>
      </div>
    </div>
  )
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xl px-4 py-3 text-[11px] z-50">
      <p className="font-black uppercase tracking-widest text-[#94A3B8] mb-2 border-b border-gray-100 pb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-[#1E293B] flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color || GREEN_DARK }} />
            {p.name}
          </span>
          <span className="ml-auto font-black">{typeof p.value === 'number' && p.value > 999999 ? (p.value / (1024**3)).toFixed(2) + ' GB' : p.value}</span>
        </p>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [storage, setStorage] = useState(null)
  const [charts,  setCharts]  = useState(null)
  const [loading, setLoading] = useState(true)

  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Bom dia'
    if (hour >= 12 && hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  useEffect(() => {
    Promise.all([
      api.get('/api/files/stats/summary'),
      api.get('/api/system/storage'),
      api.get('/api/system/charts'),
    ])
      .then(([sr, stor, ch]) => {
        setStats(sr.data)
        setStorage(stor.data)
        setCharts(ch.data)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const growthData = useMemo(() => {
    if (!charts?.daily?.length) return []
    return charts.daily.map((d) => {
      const dt  = new Date(d.day)
      const day = `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}`
      return { day, Armazenamento: d.cumulative, Uploads: d.uploads }
    })
  }, [charts])

  const pieData = useMemo(() => {
    if (!charts?.actionStats?.length) return []
    return charts.actionStats.map((a) => ({
      name:  a.action === 'FILE_UPLOAD' ? 'Uploads' : a.action === 'FILE_DOWNLOAD' ? 'Downloads' : a.action === 'FILE_DELETE' ? 'Exclusões' : a.action === 'LOGIN' ? 'Logins' : a.action.replace(/_/g, ' '),
      value: a.count,
    }))
  }, [charts])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-[4px] border-[#0B3904] border-t-transparent rounded-full animate-spin" />
          <p className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8]">Carregando Dashboard RLS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-4 lg:h-full lg:overflow-hidden animate-fadeIn pb-10 lg:pb-0 font-sans">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className={`${CARD_ST} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 lg:p-4 flex-shrink-0`}>
        <div className="min-w-0">
          <h2 className="text-2xl lg:text-lg font-black uppercase underline decoration-[#0B3904]/20 underline-offset-8 tracking-tighter text-[#1E293B]">
            Olá, {user?.name.split(' ')[0]}! {greeting}.
          </h2>
          <p className="text-[10px] text-[#94A3B8] font-black uppercase tracking-[0.2em] mt-3">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
          </p>
        </div>
        <Link to="/files" className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 lg:py-2.5 rounded-2xl lg:rounded-xl bg-[#0B3904] text-white text-xs lg:text-[10px] font-black uppercase tracking-[0.15em] hover:bg-black transition-all shadow-lg active:scale-95">
          <Upload size={18} /> Novo Upload
        </Link>
      </div>

      {/* ── Grid KPIs — CORRGIDO PARA MOSTRAR COTAS REAIS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-3 flex-shrink-0">
        <BentoStat 
          title="Meus Objetos" 
          value={(stats?.totalFiles ?? 0).toLocaleString('pt-BR')} 
          icon={FilesIcon} 
          isMain 
          className="lg:col-span-1" 
        />
        
        <BentoStat 
          title="Espaço Usado" 
          value={formatBytes(stats?.totalSize || 0)} 
          sub={isAdmin ? "Total Global" : "Sua Conta"}
          icon={HardDrive} 
        />

        <BentoStat 
          title="Diretórios" 
          value={(stats?.totalFolders ?? 0).toLocaleString('pt-BR')} 
          sub="Estrutura Ativa" 
          icon={FolderOpen} 
        />

        {isAdmin ? (
          <>
            <BentoStat title="Disco Livre" value={formatBytes(storage?.disk?.available || 0)} sub="Capacidade Hardware" icon={Server} />
            <BentoStat title="Contas Ativas" value={charts?.userUsage?.length || 0} sub="Painel Gestão" icon={Users} />
            <BentoStat 
              title="Sessões/Ações" 
              value={charts?.actionStats?.reduce((s, a) => s + a.count, 0) || 0} 
              sub="Últimos 30 dias"
              icon={TrendingUp} 
            />
          </>
        ) : (
          <>
            <BentoStat 
              title="Cota Disponível" 
              value={storage?.limit ? formatBytes(storage.limit) : 'Ilimitado'} 
              sub="Limite Contratado" 
              icon={ShieldCheck} 
            />
            <BentoStat 
              title="Uso de Cota" 
              value={`${storage?.usedPct ?? 0}%`} 
              sub={formatBytes(storage?.limit - storage?.used || 0) + " Restante"}
              icon={TrendingUp} 
              className="lg:col-span-2"
            />
          </>
        )}
      </div>

      {/* ── Main Canvas ─────────────────────────────────────────── */}
      <div className={`${CARD_ST} flex-1 lg:overflow-hidden flex flex-col`}>
        <div className="flex-1 overflow-y-auto lg:overflow-hidden p-6 lg:p-6 custom-scrollbar">
          
          <div className="flex flex-col lg:h-full gap-12 lg:gap-0 font-sans">
            
            <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0">
              <div className="flex-1 flex flex-col gap-6 lg:gap-3 min-h-[300px] lg:min-h-0 lg:pr-8">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-[#0B3904] rounded-full" />
                  <h3 className="text-[11px] lg:text-[9px] font-black uppercase tracking-widest text-[#64748B]">Trend Armazenamento (GB)</h3>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData} margin={{ left: -25, right: 10, top: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradStorage" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={GREEN_DARK} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={GREEN_DARK} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="4 4" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 9, fontWeight: 800, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 800, fill: '#CBD5E1' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v / (1024**3)).toFixed(1)} />
                      <Tooltip content={<Tip />} />
                      <Area type="monotone" dataKey="Armazenamento" stroke={GREEN_DARK} strokeWidth={2.5} fillOpacity={1} fill="url(#gradStorage)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="hidden lg:block w-[1.5px] bg-gray-100 my-4" />

              <div className="flex-1 flex flex-col gap-6 lg:gap-3 min-h-[400px] sm:min-h-[300px] lg:min-h-0 lg:pl-8">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-[#C41C1C] rounded-full" />
                  <h3 className="text-[11px] lg:text-[9px] font-black uppercase tracking-widest text-[#64748B]">Atividade Operacional</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-8 lg:gap-4 lg:flex-1 lg:min-h-0">
                  <div className="w-full sm:w-1/2 h-[250px] lg:h-full relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1 }]}
                          cx="50%" cy="50%" innerRadius="65%" outerRadius="90%"
                          paddingAngle={pieData.length > 1 ? 5 : 0} dataKey="value" stroke="none"
                        >
                          {(pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1 }]).map((_, i) => (
                            <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<Tip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                       <PieIcon size={24} className="text-gray-100 mb-1" />
                       <span className="text-[9px] font-black text-[#94A3B8] uppercase tracking-widest leading-none">Ações</span>
                    </div>
                  </div>
                  <div className="w-full sm:w-1/2 flex flex-col gap-4 lg:gap-3">
                    {pieData.slice(0, 5).map((e, i) => (
                      <div key={e.name} className="flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ background: PIE_PAL[i % PIE_PAL.length] }} />
                          <span className="text-xs lg:text-[9px] font-black text-[#64748B] uppercase tracking-wide group-hover:text-black transition-colors truncate">{e.name}</span>
                        </div>
                        <span className="text-xs font-black text-[#1E293B] flex-shrink-0">{e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-[1.5px] w-full bg-slate-50 flex-shrink-0 lg:my-8" />

            <div className="flex flex-col lg:flex-row lg:h-[40%] lg:min-h-0">
              <div className="flex-1 flex flex-col gap-6 lg:gap-4 min-h-0 lg:pr-8">
                <h3 className="text-[11px] lg:text-[9px] font-black uppercase tracking-widest text-[#64748B]">Auditoria de Acesso</h3>
                <div className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                   {stats?.recentFiles?.map((f) => (
                      <div key={f.id} className="flex items-center gap-3 p-2.5 bg-gray-50/50 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group">
                        <FileTypeIcon name={f.original_name} mimeType={f.mime_type} size={14} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black text-[#1E293B] truncate uppercase">{f.original_name}</p>
                          <p className="text-[9px] text-[#94A3B8] font-bold uppercase">{formatBytes(f.size)} • {f.user_name}</p>
                        </div>
                        <ArrowRight size={14} className="text-[#0B3904] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                </div>
              </div>

              <div className="hidden lg:block w-[1.5px] bg-gray-100 my-2" />

              <div className="flex-1 flex flex-col gap-6 lg:gap-4 min-h-0 lg:pl-8">
                 <div className="flex items-center justify-between">
                  <h3 className="text-[11px] lg:text-[9px] font-black uppercase tracking-widest text-[#64748B]">Sistema (uptime)</h3>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-100 flex flex-col items-center justify-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                     <div className="w-3 h-3 rounded-full bg-[#0B3904] animate-pulse" />
                   </div>
                   <p className="text-[10px] font-black text-[#0B3904] uppercase tracking-widest text-center">Protocolo de Operação 24/7 Ativo</p>
                   <p className="text-[9px] text-gray-400 font-bold uppercase text-center max-w-[200px]">Sincronização redundante de dados em tempo real</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}
