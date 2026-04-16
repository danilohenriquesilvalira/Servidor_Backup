import { useState, useEffect, useCallback } from 'react'
import { 
  Download, Search, X, Globe, RefreshCw, Trash2, 
  Folder, FolderOpen, ChevronRight, Home, FolderPlus 
} from 'lucide-react'
import api, { formatBytes, formatDate } from '../services/api'
import { useAuth } from '../context/AuthContext'
import FileTypeIcon from '../components/FileTypeIcon'

const CARD_ST = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

export default function Shared() {
  const { user, isAdmin } = useAuth()
  const [files, setFiles]           = useState([])
  const [folders, setFolders]       = useState([])
  const [loading, setLoad]          = useState(true)
  const [search, setSearch]         = useState('')
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [currentFolder, setCurrent] = useState(null)
  const [breadcrumb, setCrumb]      = useState([])
  const [showNewFolder, setNewFolder] = useState(false)
  const [folderName, setFolderName]   = useState('')

  const LIMIT = 50

  const load = useCallback(async () => {
    setLoad(true)
    try {
      const folderId = currentFolder?.id || 'null'
      const [fr, fold] = await Promise.all([
        api.get('/api/files/shared', { params: { folderId, search, page, limit: LIMIT } }),
        api.get('/api/folders', { params: { parentId: folderId, sharedOnly: 'true' } })
      ])
      setFiles(fr.data.files)
      setTotal(fr.data.total)
      setFolders(fold.data.folders)
    } catch (err) { console.error(err) }
    finally { setLoad(false) }
  }, [page, search, currentFolder])

  useEffect(() => { load() }, [load])

  const goFolder = (f) => { setCurrent(f); setCrumb(p => [...p, f]); setPage(1) }
  const goCrumb  = (i) => {
    setPage(1)
    if (i === -1) { setCurrent(null); setCrumb([]) }
    else { setCurrent(breadcrumb[i]); setCrumb(p => p.slice(0, i + 1)) }
  }

  const createSharedFolder = async (e) => {
    e.preventDefault()
    if (!folderName.trim()) return
    try {
      await api.post('/api/folders', { 
        name: folderName.trim(), 
        parentId: currentFolder?.id || null,
        isShared: true 
      })
      setFolderName(''); setNewFolder(false); load()
    } catch (err) { alert(err.response?.data?.error || 'Erro ao criar pasta compartilhada') }
  }

  const download = async (file) => {
    try {
      const { data } = await api.post(`/api/files/${file.id}/token`)
      const downloadUrl = `${api.defaults.baseURL}/api/files/download/turbo?token=${data.token}`
      window.location.href = downloadUrl
    } catch (err) { 
      alert(err.response?.data?.error || 'Erro ao preparar download')
    }
  }

  const deleteFile = async (id, name) => {
    if (!confirm(`Deletar "${name}" do acervo público?`)) return
    try { await api.delete(`/api/files/${id}`); load() }
    catch (err) { alert(err.response?.data?.error || 'Erro ao deletar') }
  }

  const canDelete = (file) => isAdmin || file.user_id === user?.id
  const empty = files.length === 0 && folders.length === 0

  return (
    <div className="flex flex-col gap-6 lg:gap-4 lg:h-full lg:overflow-hidden animate-fadeIn pb-10 lg:pb-0 font-sans">
      
      {/* ── HEADER STYLE DASHBOARD ── */}
      <div className={`${CARD_ST} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 p-6 lg:p-4 flex-shrink-0`}>
        <div className="min-w-0">
          <h1 className="text-3xl lg:text-xl font-black uppercase underline decoration-[#0B3904]/20 underline-offset-8 tracking-tighter text-[#1E293B]">
             Acervo Público
          </h1>
          <nav className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg w-fit mt-5">
            <button onClick={() => goCrumb(-1)} className="text-gray-500 hover:text-black flex items-center gap-1">
              <Home size={11} /> ACERVO
            </button>
            {breadcrumb.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1.5">
                <ChevronRight size={10} className="text-gray-400" />
                <button onClick={() => goCrumb(i)} className={i === breadcrumb.length - 1 ? 'text-black' : 'text-gray-500 hover:text-black'}>
                  {f.name}
                </button>
              </span>
            ))}
          </nav>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input !bg-white border-2 border-gray-100 pl-11 h-12 lg:h-10 text-xs font-black uppercase tracking-widest" placeholder="PESQUISAR..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <button onClick={() => setNewFolder(true)} className="p-3 lg:p-2.5 rounded-2xl lg:rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 shadow-sm transition-all active:scale-95">
            <FolderPlus size={18} />
          </button>
          <button onClick={load} className="p-3 lg:p-2.5 rounded-2xl lg:rounded-xl bg-gray-100 text-gray-400 hover:text-gray-900 transition-all active:scale-95">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="h-[2px] w-full bg-slate-200 flex-shrink-0" />

      {/* TABLE DATA — SEM CARD WRAPPER */}
      <div className="flex-1 flex flex-col min-h-0">
        {showNewFolder && (
          <form onSubmit={createSharedFolder} className="p-4 bg-slate-100 border-x border-t border-slate-200 rounded-t-2xl flex gap-3 animate-fadeIn flex-shrink-0">
            <input type="text" className="input flex-1 !bg-white border-slate-300" placeholder="Nome da pasta pública..." value={folderName} onChange={e => setFolderName(e.target.value)} autoFocus />
            <button type="submit" className="px-6 rounded-xl bg-[#0B3904] text-white text-[10px] font-black uppercase tracking-widest shadow-sm">Criar no Acervo</button>
            <button type="button" onClick={() => setNewFolder(false)} className="p-3 rounded-xl hover:bg-white text-gray-400"><X size={16} /></button>
          </form>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar table-container">
          {loading ? (
             <div className="p-20 flex justify-center"><div className="w-8 h-8 border-[3px] border-[#0B3904] border-t-transparent rounded-full animate-spin" /></div>
          ) : empty ? (
            <div className="p-24 text-center flex flex-col items-center gap-4 opacity-40 uppercase">
              <FolderOpen size={48} strokeWidth={1} className="text-[#0B3904]" />
              <p className="text-[11px] font-black tracking-widest text-[#0B3904]">Vazio</p>
            </div>
          ) : (
            <table className="w-full text-sm border-separate border-spacing-0">
               <thead>
                <tr>
                   <th className="th">Item Público</th>
                   <th className="th hidden sm:table-cell">Autor</th>
                   <th className="th hidden md:table-cell">Peso</th>
                   <th className="th text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {folders.map(folder => (
                  <tr key={folder.id} className="table-row">
                    <td className="td" onClick={() => goFolder(folder)}>
                      <div className="flex items-center gap-4 group-hover:translate-x-1 transition-transform cursor-pointer">
                        <div className="w-9 h-9 bg-white border-2 border-amber-500 rounded-xl flex items-center justify-center text-amber-500">
                           <Folder size={18} strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-black truncate uppercase tracking-tight">{folder.name}</p>
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">{folder.file_count} Objetos</span>
                        </div>
                      </div>
                    </td>
                    <td className="td hidden sm:table-cell text-[11px] font-black text-gray-500 uppercase">{folder.user_name}</td>
                    <td className="td hidden md:table-cell text-gray-300 font-black text-[10px]">—</td>
                    <td className="td">
                       <div className="flex justify-end pr-2">
                         <ChevronRight size={18} className="text-gray-300 group-hover:text-black transition-colors" />
                       </div>
                    </td>
                  </tr>
                ))}

                {files.map(file => (
                  <tr key={file.id} className="table-row">
                    <td className="td">
                      <div className="flex items-center gap-4">
                         <div className="w-9 h-9 bg-slate-50 border-2 border-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
                            <FileTypeIcon name={file.original_name} mimeType={file.mime_type} size={18} />
                         </div>
                         <div className="min-w-0">
                           <p className="text-sm font-black text-black truncate uppercase tracking-tight">{file.original_name}</p>
                           <p className="text-[10px] text-gray-500 font-bold uppercase md:hidden">{formatBytes(file.size)}</p>
                         </div>
                      </div>
                    </td>
                    <td className="td hidden sm:table-cell text-[11px] font-black text-gray-600 uppercase">{file.user_name}</td>
                    <td className="td hidden md:table-cell whitespace-nowrap text-[10px] font-black text-gray-500 uppercase">{formatBytes(file.size)}</td>
                    <td className="td">
                       <div className="flex items-center justify-end gap-3">
                        <button onClick={() => download(file)} className="p-2.5 rounded-xl bg-white border-2 border-gray-200 text-gray-400 hover:text-black transition-all"><Download size={16} /></button>
                        {canDelete(file) && <button onClick={() => deleteFile(file.id, file.original_name)} className="p-2.5 rounded-xl bg-white border-2 border-gray-200 text-gray-400 hover:text-red-500 transition-all"><Trash2 size={16} /></button>}
                       </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > LIMIT && (
           <div className="p-6 lg:p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6 bg-slate-50/50">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Pág {page} de {Math.ceil(total/LIMIT)}</span>
              <div className="flex gap-4 sm:gap-2 w-full sm:w-auto">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex-1 sm:flex-none px-6 py-4 lg:py-2.5 rounded-xl bg-white border-2 border-slate-200 text-[10px] font-black uppercase tracking-widest disabled:opacity-30">ANTERIOR</button>
                <button disabled={page * LIMIT >= total} onClick={() => setPage(p => p + 1)} className="flex-1 sm:flex-none px-6 py-4 lg:py-2.5 rounded-xl bg-[#0B3904] text-white text-[10px] font-black uppercase tracking-widest shadow-md disabled:opacity-30">PRÓXIMA</button>
              </div>
           </div>
        )}
      </div>
    </div>
  )
}
