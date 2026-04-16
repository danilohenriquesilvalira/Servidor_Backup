import { useState, useEffect, useCallback } from 'react'
import {
  Upload, FolderPlus, Folder, Download, Trash2, Search,
  RefreshCw, ChevronRight, Home, X, FolderOpen, Globe
} from 'lucide-react'
import api, { formatBytes, formatDate } from '../services/api'
import { useAuth } from '../context/AuthContext'
import UploadModal from '../components/UploadModal'
import FileTypeIcon from '../components/FileTypeIcon'

const CARD_ST = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

export default function Files() {
  const { user, isAdmin } = useAuth()
  const [files, setFiles]           = useState([])
  const [folders, setFolders]       = useState([])
  const [loading, setLoad]          = useState(true)
  const [currentFolder, setCurrent] = useState(null)
  const [breadcrumb, setCrumb]      = useState([])
  const [search, setSearch]         = useState('')
  const [showUpload, setUpload]     = useState(false)
  const [newFolder, setNewFolder]   = useState(false)
  const [folderName, setFolderName] = useState('')
  const [toggling, setToggling]     = useState(null)

  const load = useCallback(async () => {
    setLoad(true)
    try {
      const params = { folderId: currentFolder?.id || 'null' }
      if (search) params.search = search
      const [fr, fold] = await Promise.all([
        api.get('/api/files', { params }),
        api.get('/api/folders', { params: { parentId: currentFolder?.id || 'null' } }),
      ])
      setFiles(fr.data.files)
      setFolders(fold.data.folders)
    } catch (err) { console.error(err) }
    finally { setLoad(false) }
  }, [currentFolder, search])

  useEffect(() => { load() }, [load])

  const goFolder = (f) => { setCurrent(f); setCrumb(p => [...p, f]) }
  const goCrumb  = (i) => {
    if (i === -1) { setCurrent(null); setCrumb([]) }
    else { setCurrent(breadcrumb[i]); setCrumb(p => p.slice(0, i + 1)) }
  }

  const createFolder = async (e) => {
    e.preventDefault()
    if (!folderName.trim()) return
    try {
      await api.post('/api/folders', { name: folderName.trim(), parentId: currentFolder?.id || null, isShared: false })
      setFolderName(''); setNewFolder(false); load()
    } catch (err) { alert(err.response?.data?.error || 'Erro ao criar pasta') }
  }

  const toggleFolderSharing = async (folder) => {
    const newShared = !folder.is_shared
    const msg = newShared 
      ? `ATENÇÃO: Compartilhar a pasta "${folder.name}" irá tornar PÚBLICOS todos os arquivos e subpastas dentro dela. Confirmar?`
      : `Tornar a pasta "${folder.name}" e todo seu conteúdo PRIVADOS?`
    
    if (!confirm(msg)) return

    try {
      await api.patch(`/api/folders/${folder.id}/is-shared`, { isShared: newShared })
      load()
    } catch (err) { alert(err.response?.data?.error || 'Erro ao alterar compartilhamento') }
  }

  const toggleFileVisibility = async (file) => {
    const newVis = file.visibility === 'public' ? 'private' : 'public'
    setToggling(file.id)
    try {
      await api.patch(`/api/files/${file.id}/visibility`, { visibility: newVis })
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, visibility: newVis } : f))
    } catch (err) { alert(err.response?.data?.error || 'Erro ao alterar visibilidade') }
    finally { setToggling(null) }
  }

  const deleteFile = async (id, name) => {
    if (!confirm(`Deletar "${name}" permanentemente?`)) return
    try { await api.delete(`/api/files/${id}`); load() }
    catch (err) { alert(err.response?.data?.error || 'Erro ao deletar') }
  }

  const deleteFolder = async (id, name) => {
    if (!confirm(`Deletar pasta "${name}"? Somente pastas vazias podem ser removidas.`)) return
    try { await api.delete(`/api/folders/${id}`); load() }
    catch (err) { alert(err.response?.data?.error || 'Erro ao deletar pasta') }
  }

  const download = async (file) => {
    try {
      // 1. Obter um token temporário (válido por 60s)
      const { data } = await api.post(`/api/files/${file.id}/token`)
      
      // 2. URL de download direto (agora via query param para evitar erros de rota 404)
      const downloadUrl = `${api.defaults.baseURL}/api/files/download/turbo?token=${data.token}`
      
      // 3. Abrir em nova aba ou disparar download nativo
      window.location.href = downloadUrl
      
      // Notificação opcional
      console.log('Download iniciado nativamente...');
    } catch (err) { 
      alert(err.response?.data?.error || 'Erro ao preparar download')
    }
  }

  const empty = folders.length === 0 && files.length === 0
  const canManage = (item) => isAdmin || item.user_id === user?.id

  return (
    <div className="flex flex-col gap-6 lg:gap-4 lg:h-full lg:overflow-hidden animate-fadeIn pb-10 lg:pb-0 font-sans">

      {/* HEADER PREMIUM */}
      <div className={`${CARD_ST} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 p-6 lg:p-4 flex-shrink-0`}>
        <div className="min-w-0">
          <h1 className="text-3xl lg:text-xl font-black uppercase underline decoration-[#0B3904]/20 underline-offset-8 tracking-tighter text-[#1E293B]">
             Meus Arquivos
          </h1>
          <nav className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg w-fit mt-5">
            <button onClick={() => goCrumb(-1)} className="text-gray-500 hover:text-black flex items-center gap-1">
              <Home size={11} /> BASE
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
             <input className="input !bg-white border-2 border-gray-100 pl-11 h-12 lg:h-10 text-xs font-black uppercase" placeholder="LOCALIZAR..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button onClick={() => setNewFolder(true)} className="p-3 lg:p-2.5 rounded-2xl lg:rounded-xl bg-gray-100 text-gray-900"><FolderPlus size={18} /></button>
          <button onClick={() => setUpload(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-4 lg:py-2.5 rounded-2xl lg:rounded-xl bg-[#0B3904] text-white text-xs lg:text-[10px] font-black uppercase tracking-widest shadow-xl shadow-green-950/20 active:scale-95 transition-all">
            <Upload size={18} /> NOVO UPLOAD
          </button>
        </div>
      </div>

      <div className="h-[2px] w-full bg-slate-200 flex-shrink-0" />

      {/* TABLE DATA */}
      <div className="flex-1 flex flex-col min-h-0">
        {newFolder && (
          <form onSubmit={createFolder} className="p-4 bg-slate-100 border-x border-t border-slate-200 rounded-t-2xl flex gap-3 animate-fadeIn flex-shrink-0">
             <input type="text" className="input flex-1 !bg-white" placeholder="Nome da pasta..." value={folderName} onChange={e => setFolderName(e.target.value)} autoFocus />
             <button type="submit" className="px-6 rounded-xl bg-[#0B3904] text-white text-[10px] font-black uppercase">Criar</button>
             <button type="button" onClick={() => setNewFolder(false)} className="p-3 text-gray-400"><X size={16} /></button>
          </form>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar table-container">
           {loading ? (
             <div className="p-20 flex justify-center"><div className="w-8 h-8 border-[3px] border-[#0B3904] border-t-transparent rounded-full animate-spin" /></div>
          ) : empty ? (
             <div className="p-24 flex flex-col items-center justify-center opacity-40 uppercase">
              <FolderOpen size={48} className="mb-4 text-[#0B3904]" strokeWidth={1} />
              <p className="text-[11px] font-black text-[#0B3904]">Vazio</p>
            </div>
          ) : (
            <table className="w-full text-sm border-separate border-spacing-0">
               <thead>
                <tr>
                  <th className="th">Item / Nome</th>
                  <th className="th hidden md:table-cell">Conteúdo</th>
                  <th className="th hidden sm:table-cell">Modificação / Tamanho</th>
                  <th className="th text-right px-6">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300">
                {folders.map(fold => (
                  <tr key={fold.id} className="table-row group">
                    <td className="td">
                      <button onClick={() => goFolder(fold)} className="flex items-center gap-4">
                         <div className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 ${fold.is_shared ? 'border-[#0B3904] text-[#0B3904]' : 'border-amber-500 text-amber-500'}`}>
                           <Folder size={18} strokeWidth={2.5} />
                         </div>
                         <div className="text-left">
                           <p className="text-sm font-black text-black uppercase">{fold.name}</p>
                           {fold.is_shared && <span className="text-[8px] font-black text-[#0B3904] uppercase tracking-widest flex items-center gap-1 mt-1"><Globe size={8}/> Compartilhada (Recurso Ativo)</span>}
                         </div>
                      </button>
                    </td>
                    <td className="td hidden md:table-cell">
                       <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                         {fold.item_count} Itens detectados
                       </span>
                    </td>
                    <td className="td hidden sm:table-cell">
                       <p className="text-[10px] font-black text-gray-400 uppercase">{formatDate(fold.created_at)}</p>
                       <p className="text-[9px] font-bold text-[#0B3904] uppercase">{formatBytes(fold.total_size)} Total</p>
                    </td>
                    <td className="td px-6">
                       <div className="flex items-center justify-end gap-3">
                         {canManage(fold) && (
                           <button onClick={() => toggleFolderSharing(fold)} title="Compartilhar Pasta Completa" className={`p-2 rounded-lg border-2 transition-all ${fold.is_shared ? 'bg-[#0B3904] text-white border-[#0B3904]' : 'bg-white text-gray-300 border-gray-100 hover:text-[#0B3904]'}`}>
                             <Globe size={16} />
                           </button>
                         )}
                         <button onClick={() => deleteFolder(fold.id, fold.name)} title="Excluir Pasta" className="p-2 rounded-lg bg-white border-2 border-gray-100 text-gray-300 hover:text-red-600 hover:border-red-200 transition-all"><Trash2 size={16} /></button>
                       </div>
                    </td>
                  </tr>
                ))}

                {files.map(file => (
                  <tr key={file.id} className="table-row group">
                    <td className="td">
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center border-2 border-slate-100 bg-slate-50">
                           <FileTypeIcon name={file.original_name} mimeType={file.mime_type} size={18} />
                        </div>
                        <div className="min-w-0">
                           <p className="text-sm font-black text-black truncate uppercase">{file.original_name}</p>
                           {file.visibility === 'public' && <span className="text-[8px] font-black text-[#0B3904] uppercase flex items-center gap-1 mt-1"><Globe size={8}/> Público</span>}
                        </div>
                      </div>
                    </td>
                    <td className="td hidden md:table-cell text-gray-500 uppercase">—</td>
                    <td className="td hidden sm:table-cell">
                       <p className="text-[10px] font-black text-gray-400 uppercase">{formatDate(file.created_at)}</p>
                       <p className="text-[10px] font-black text-slate-900 uppercase">{formatBytes(file.size)}</p>
                    </td>
                    <td className="td px-6">
                      <div className="flex items-center justify-end gap-3">
                        {canManage(file) && (
                          <button onClick={() => toggleFileVisibility(file)} disabled={toggling === file.id} title="Privacidade" className={`p-2 rounded-lg border-2 transition-all ${file.visibility === 'public' ? 'bg-[#0B3904] text-white border-[#0B3904]' : 'bg-white text-gray-300 border-gray-100 hover:text-[#0B3904]'}`}>
                            {toggling === file.id ? <RefreshCw size={14} className="animate-spin" /> : <Globe size={16} />}
                          </button>
                        )}
                        <button onClick={() => download(file)} title="Baixar" className="p-2 rounded-lg bg-white border-2 border-gray-100 text-gray-300 hover:text-black transition-all"><Download size={16} /></button>
                        <button onClick={() => deleteFile(file.id, file.original_name)} title="Excluir" className="p-2 rounded-lg bg-white border-2 border-gray-100 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal 
          onClose={() => { setUpload(false); load() }} 
          onSuccess={() => { setUpload(false); load() }}
          currentFolderId={currentFolder?.id} 
          currentFolderName={currentFolder?.name || 'Base'}
        />
      )}
    </div>
  )
}
