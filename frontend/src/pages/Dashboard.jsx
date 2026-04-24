import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts'
import {
  HardDrive, Files as FilesIcon, Upload, Server, Users,
  ArrowRight, TrendingUp, PieChart as PieIcon,
  ShieldCheck, FolderOpen, Clock, Activity, LogIn, Trash2, FolderPlus, Share2
} from 'lucide-react'
import api, { formatBytes } from '../services/api'
import { useAuth } from '../context/AuthContext'
import FileTypeIcon from '../components/FileTypeIcon'

const GREEN_DARK = '#0B3904'
const CARD_ST    = 'bg-white rounded-2xl border border-gray-100 shadow-sm'
const PIE_PAL    = ['#0B3904', '#1a7a0c', '#14532d', '#f59e0b', '#C41C1C', '#2563eb', '#7c3aed']

// Mapa de ícone por tipo de atividade
const ACTION_ICON = {
  LOGIN:         { icon: LogIn,      color: '#0B3904', label: 'Login' },
  FILE_UPLOAD:   { icon: Upload,     color: '#2563eb', label: 'Upload' },
  FILE_DELETE:   { icon: Trash2,     color: '#C41C1C', label: 'Exclusão' },
  FOLDER_CREATE: { icon: FolderPlus, color: '#f59e0b', label: 'Nova Pasta' },
  FOLDER_SHARE:  { icon: Share2,     color: '#7c3aed', label: 'Compartilhamento' },
}

function formatRelativeDate(dateStr) {
  const date = new Date(dateStr)
  const now  = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60)            return 'agora'
  if (diff < 3600)          return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400)         return `${Math.floor(diff / 3600)}h atrás`
  if (diff < 86400 * 7)     return `${Math.floor(diff / 86400)}d atrás`
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

/* ─── Card KPI ──────────────────────────────────────────── */
function BentoStat({ title, value, sub, icon: Icon, isMain = false, className = '', progress = null }) {
  if (isMain) {
    return (
      <div className={`relative overflow-hidden bg-[#0B3904] rounded-2xl border border-white/10 h-[120px] lg:h-[110px] p-5 lg:p-4 shadow-lg shadow-green-900/10 ${className}`}>
        {/* Ícone — canto superior direito */}
        <div className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-white/15 text-white border border-white/15">
          <Icon size={14} />
        </div>
        {/* Valor alinhado à esquerda, sem conflito com o ícone */}
        <div className="flex flex-col items-start justify-center h-full">
          <span className="font-black tracking-tighter leading-none text-3xl lg:text-2xl text-white">{value}</span>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-white/65 mt-1.5">{title}</h3>
          {sub && <p className="text-[10px] text-white/45 font-semibold mt-0.5">{sub}</p>}
        </div>
      </div>
    )
  }
  return (
    <div className={`relative overflow-hidden bg-white rounded-2xl border border-gray-100 h-[120px] lg:h-[110px] p-5 lg:p-4 shadow-sm hover:shadow-md transition-all group ${className}`}>
      {/* Ícone — canto superior direito */}
      <div className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 group-hover:bg-green-50 group-hover:border-green-100 transition-colors">
        <Icon size={14} strokeWidth={1.75} className="text-gray-400 group-hover:text-[#0B3904] transition-colors" />
      </div>
      {/* Valor alinhado à esquerda, sem conflito com o ícone */}
      <div className="flex flex-col items-start justify-center h-full pr-10">
        <span className="font-black tracking-tighter leading-none text-2xl lg:text-xl text-[#1E293B]">{value}</span>
        <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-gray-500 mt-1.5 group-hover:text-[#0B3904] transition-colors">{title}</h3>
        {sub && <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{sub}</p>}
      </div>
      {/* Barra de progresso — faixa colada no fundo, não afeta altura */}
      {progress !== null && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-1.5 bg-white">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(progress, 100)}%`,
                  backgroundColor: progress >= 90 ? '#C41C1C' : progress >= 70 ? '#f59e0b' : '#0B3904',
                }}
              />
            </div>
            <span className="text-[10px] text-gray-400 font-bold flex-shrink-0">{progress}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Tooltip dos gráficos ──────────────────────────────── */
function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-xs z-50">
      <p className="font-black uppercase tracking-widest text-gray-500 mb-2 border-b border-gray-100 pb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold text-gray-800 flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color || GREEN_DARK }} />
            {p.name}
          </span>
          <span className="ml-auto font-black">
            {typeof p.value === 'number' && p.value > 999999
              ? (p.value / (1024 ** 3)).toFixed(2) + ' GB'
              : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

/* ─── Dashboard principal ───────────────────────────────── */
export default function Dashboard() {
  const { user, isAdmin } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [storage, setStorage] = useState(null)
  const [charts,  setCharts]  = useState(null)
  const [loading, setLoading] = useState(true)

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h >= 5  && h < 12) return 'Bom dia'
    if (h >= 12 && h < 18) return 'Boa tarde'
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
      name:  a.action === 'FILE_UPLOAD'   ? 'Uploads'
           : a.action === 'FILE_DOWNLOAD' ? 'Downloads'
           : a.action === 'FILE_DELETE'   ? 'Exclusões'
           : a.action === 'LOGIN'         ? 'Logins'
           : a.action.replace(/_/g, ' '),
      value: a.count,
    }))
  }, [charts])

  // Últimas atividades agregadas a partir dos logs de ações
  const recentActivity = useMemo(() => {
    if (!charts?.actionStats?.length) return []
    return charts.actionStats.slice(0, 4)
  }, [charts])

  const usedPct = storage?.usedPct ?? 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-[4px] border-[#0B3904] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-widest text-gray-400">Carregando Dashboard RLS...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-4 lg:h-full lg:overflow-hidden animate-fadeIn pb-10 lg:pb-0 font-sans">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className={`${CARD_ST} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 lg:p-4 flex-shrink-0`}>
        <div className="min-w-0">
          <h2 className="text-xl lg:text-base font-black uppercase tracking-tight text-gray-900">
            {greeting}, {user?.name.split(' ')[0]}!
          </h2>
          <p className="text-xs text-gray-500 font-semibold mt-1">
            {new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
          </p>
        </div>
        <Link
          to="/files"
          className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-6 py-3 lg:py-2.5 rounded-xl bg-[#0B3904] text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95"
        >
          <Upload size={15} /> Novo Upload
        </Link>
      </div>

      {/* ── KPIs ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 lg:gap-3 flex-shrink-0">
        <BentoStat
          title="Meus Arquivos"
          value={(stats?.totalFiles ?? 0).toLocaleString('pt-BR')}
          icon={FilesIcon}
          isMain
          className="lg:col-span-1"
        />
        <BentoStat
          title="Espaço Usado"
          value={formatBytes(stats?.totalSize || 0)}
          sub={isAdmin ? 'Total global' : 'Sua conta'}
          icon={HardDrive}
        />
        <BentoStat
          title="Diretórios"
          value={(stats?.totalFolders ?? 0).toLocaleString('pt-BR')}
          sub="Estrutura ativa"
          icon={FolderOpen}
        />

        {isAdmin ? (
          <>
            <BentoStat title="Disco Livre"     value={formatBytes(storage?.disk?.available || 0)} sub="Capacidade hardware" icon={Server} />
            <BentoStat title="Contas Ativas"   value={charts?.userUsage?.length || 0}             sub="Usuários no sistema"  icon={Users} />
            <BentoStat title="Sessões / Ações" value={charts?.actionStats?.reduce((s, a) => s + a.count, 0) || 0} sub="Últimos 30 dias" icon={TrendingUp} />
          </>
        ) : (
          <>
            <BentoStat
              title="Cota Disponível"
              value={storage?.limit ? formatBytes(storage.limit) : 'Ilimitado'}
              sub="Limite contratado"
              icon={ShieldCheck}
            />
            {/* Card de uso com barra de progresso */}
            <BentoStat
              title="Uso de Cota"
              value={formatBytes(storage?.used || 0)}
              sub={`${formatBytes((storage?.limit || 0) - (storage?.used || 0))} restantes`}
              icon={TrendingUp}
              progress={usedPct}
              className="lg:col-span-2"
            />
          </>
        )}
      </div>

      {/* ── Canvas principal ────────────────────────────────── */}
      <div className={`${CARD_ST} flex-1 lg:overflow-hidden flex flex-col`}>
        <div className="flex-1 overflow-y-auto lg:overflow-hidden p-6 custom-scrollbar">
          <div className="flex flex-col lg:h-full gap-10 lg:gap-0">

            {/* Linha 1 — Gráficos */}
            <div className="flex flex-col lg:flex-row lg:flex-1 lg:min-h-0">

              {/* Gráfico de área */}
              <div className="flex-1 flex flex-col gap-4 lg:gap-3 min-h-[280px] lg:min-h-0 lg:pr-8">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#0B3904] rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">Crescimento de Armazenamento (GB)</h3>
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
                      {/* Melhorado: ticks legíveis */}
                      <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#6B7280' }} axisLine={false} tickLine={false} tickFormatter={(v) => (v / (1024 ** 3)).toFixed(1)} />
                      <Tooltip content={<Tip />} />
                      <Area type="monotone" dataKey="Armazenamento" stroke={GREEN_DARK} strokeWidth={2.5} fillOpacity={1} fill="url(#gradStorage)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="hidden lg:block w-px bg-gray-100 my-4" />

              {/* Gráfico de pizza */}
              <div className="flex-1 flex flex-col gap-4 lg:gap-3 min-h-[360px] sm:min-h-[280px] lg:min-h-0 lg:pl-8">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-[#C41C1C] rounded-full" />
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">Atividade Operacional</h3>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-6 lg:flex-1 lg:min-h-0">
                  <div className="w-full sm:w-1/2 h-[220px] lg:h-full relative shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1 }]}
                          cx="50%" cy="50%" innerRadius="62%" outerRadius="88%"
                          paddingAngle={pieData.length > 1 ? 4 : 0} dataKey="value" stroke="none"
                        >
                          {(pieData.length > 0 ? pieData : [{ name: 'Sem dados', value: 1 }]).map((_, i) => (
                            <Cell key={i} fill={PIE_PAL[i % PIE_PAL.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<Tip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <PieIcon size={20} className="text-gray-200 mb-1" />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ações</span>
                    </div>
                  </div>

                  {/* Legenda da pizza — texto maior e contraste ok */}
                  <div className="w-full sm:w-1/2 flex flex-col gap-3">
                    {pieData.slice(0, 5).map((e, i) => (
                      <div key={e.name} className="flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-2.5 truncate">
                          <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_PAL[i % PIE_PAL.length] }} />
                          <span className="text-xs font-semibold text-gray-600 group-hover:text-gray-900 transition-colors truncate">{e.name}</span>
                        </div>
                        <span className="text-sm font-black text-gray-800 flex-shrink-0">{e.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-gray-100 flex-shrink-0 lg:my-6" />

            {/* Linha 2 — Arquivos Recentes + Atividade Rápida */}
            <div className="flex flex-col lg:flex-row lg:h-[38%] lg:min-h-0 gap-8 lg:gap-0">

              {/* Arquivos Recentes (renomeado de "Auditoria de Acesso") */}
              <div className="flex-1 flex flex-col gap-4 min-h-0 lg:pr-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">Arquivos Recentes</h3>
                  <Link to="/files" className="text-[11px] font-bold text-[#0B3904] hover:underline flex items-center gap-1">
                    Ver todos <ArrowRight size={11} />
                  </Link>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 custom-scrollbar">
                  {stats?.recentFiles?.length > 0 ? stats.recentFiles.map((f) => (
                    <div key={f.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100 group cursor-default">
                      <FileTypeIcon name={f.original_name} mimeType={f.mime_type} size={15} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate">{f.original_name}</p>
                        <p className="text-[11px] text-gray-400 font-medium">
                          {formatBytes(f.size)} · {f.user_name}
                          {f.created_at && <span className="ml-1 text-gray-300">· {formatRelativeDate(f.created_at)}</span>}
                        </p>
                      </div>
                      <ArrowRight size={13} className="text-[#0B3904] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  )) : (
                    <div className="flex flex-col items-center justify-center h-24 gap-2">
                      <FilesIcon size={24} className="text-gray-200" />
                      <p className="text-xs text-gray-400 font-semibold">Nenhum arquivo enviado ainda</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="hidden lg:block w-px bg-gray-100 my-2" />

              {/* Resumo de Atividades (substitui o "Sistema uptime" vazio) */}
              <div className="flex-1 flex flex-col gap-4 min-h-0 lg:pl-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-widest text-gray-600">Resumo de Atividades</h3>
                  <Link to="/logs" className="text-[11px] font-bold text-[#0B3904] hover:underline flex items-center gap-1">
                    Ver logs <ArrowRight size={11} />
                  </Link>
                </div>

                {/* Status do sistema */}
                <div className="flex items-center gap-3 px-3 py-2.5 bg-green-50 rounded-xl border border-green-100">
                  <div className="w-2 h-2 rounded-full bg-[#0B3904] animate-pulse shrink-0" />
                  <p className="text-xs font-bold text-[#0B3904]">Sistema operacional · Protocolo 24/7 ativo</p>
                </div>

                {/* Contadores de ações */}
                <div className="flex-1 grid grid-cols-2 gap-2 content-start">
                  {recentActivity.map((a) => {
                    const actionKey = a.action
                    const meta = ACTION_ICON[actionKey] || { icon: Activity, color: '#6B7280', label: a.action.replace(/_/g, ' ') }
                    const IconComp = meta.icon
                    return (
                      <div key={a.action} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: meta.color + '18' }}>
                          <IconComp size={13} style={{ color: meta.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-gray-700 uppercase tracking-wide truncate">{meta.label}</p>
                          <p className="text-xs font-black text-gray-900">{a.count}</p>
                        </div>
                      </div>
                    )
                  })}
                  {recentActivity.length === 0 && (
                    <div className="col-span-2 flex flex-col items-center justify-center h-20 gap-2">
                      <Clock size={20} className="text-gray-200" />
                      <p className="text-xs text-gray-400 font-semibold">Sem atividades registradas</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}
