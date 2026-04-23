import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Upload, FolderPlus, Folder, Download, Trash2, Search,
  RefreshCw, ChevronRight, Home, X, FolderOpen, Globe,
  Edit2, Check, CheckCircle, AlertCircle
} from 'lucide-react'
import api, { formatBytes, formatDate } from '../services/api'
import { useAuth } from '../context/AuthContext'
import UploadModal from '../components/UploadModal'
import FileTypeIcon from '../components/FileTypeIcon'
import PreviewModal from '../components/PreviewModal'

const CARD_ST = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

export default function Files() {
  const { user, isAdmin } = useAuth()
  const location = useLocation()

  const [files, setFiles]           = useState([])
  const [folders, setFolders]       = useState([])
  const [loading, setLoad]          = useState(true)
  const [currentFolder, setCurrent] = useState(null)
  const [breadcrumb, setCrumb]      = useState([])
  const [search, setSearch]         = useState('')
  const [globalSearch, setGlobal]   = useState(false)
  const [showUpload, setUpload]     = useState(false)
  const [newFolder, setNewFolder]   = useState(false)
  const [folderName, setFolderName] = useState('')
  const [toggling, setToggling]     = useState(null)
  const [preview, setPreview]       = useState(null)
  const [renaming, setRenaming]     = useState(null)
  const [renameVal, setRenameVal]   = useState('')
  const [pageDrag, setPageDrag]     = useState(false)
  const [autoUp, setAutoUp]         = useState(null)
  const dragCounter                 = useRef(0)

  useEffect(() => {
    setCurrent(null); setCrumb([]); setSearch(''); setGlobal(false)
  }, [location.key])

  const load = useCallback(async () => {
    setLoad(true)
    try {
      const fileParams = {}
      if (!globalSearch || !search) fileParams.folderId = currentFolder?.id || 'null'
      if (search) fileParams.search = search
      if (search && globalSearch) {
        const { data } = await api.get('/api/files', { params: fileParams })
        setFiles(data.files); setFolders([])
      } else {
        const [fr, fold] = await Promise.all([
          api.get('/api/files', { params: fileParams }),
          api.get('/api/folders', { params: { parentId: currentFolder?.id || 'null' } }),
        ])
        setFiles(fr.data.files); setFolders(fold.data.folders)
      }
    } catch (err) { console.error(err) }
    finally { setLoad(false) }
  }, [currentFolder, search, globalSearch])

  useEffect(() => { load() }, [load])

  const goFolder = (f) => { setCurrent(f); setCrumb(p => [...p, f]); setSearch(''); setGlobal(false) }
  const goCrumb  = (i) => {
    setSearch(''); setGlobal(false)
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
      ? `Compartilhar "${folder.name}" tornará PÚBLICOS todos os arquivos dentro dela. Confirmar?`
      : `Tornar "${folder.name}" e todo seu conteúdo PRIVADOS?`
    if (!confirm(msg)) return
    try { await api.patch(`/api/folders/${folder.id}/is-shared`, { isShared: newShared }); load() }
    catch (err) { alert(err.response?.data?.error || 'Erro') }
  }

  const toggleFileVisibility = async (file) => {
    const newVis = file.visibility === 'public' ? 'private' : 'public'
    setToggling(file.id)
    try {
      await api.patch(`/api/files/${file.id}/visibility`, { visibility: newVis })
      setFiles(prev => prev.map(f => f.id === file.id ? { ...f, visibility: newVis } : f))
    } catch (err) { alert(err.response?.data?.error || 'Erro') }
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
      const { data } = await api.post(`/api/files/${file.id}/token`)
      const url = `${api.defaults.baseURL}/api/files/download/turbo?token=${data.token}`
      const a = document.createElement('a')
      a.href = url; a.download = file.original_name; a.style.display = 'none'
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
    } catch (err) { alert(err.response?.data?.error || 'Erro ao preparar download') }
  }

  const autoUpload = async (droppedFiles) => {
    const total = droppedFiles.length
    let done = 0; let errors = 0
    setAutoUp({ total, done, pct: 0, errors, finished: false })
    for (const file of droppedFiles) {
      const formData = new FormData()
      formData.append('file', file)
      if (currentFolder?.id) formData.append('folderId', currentFolder.id)
      try {
        await api.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            const filePct = Math.round((evt.loaded * 100) / (evt.total || 1))
            setAutoUp(p => ({ ...p, pct: Math.round(((done * 100) + filePct) / total) }))
          }
        })
      } catch { errors++ }
      done++
      setAutoUp(p => ({ ...p, done, pct: Math.round((done / total) * 100), errors }))
    }
    setAutoUp(p => ({ ...p, finished: true }))
    load()
    setTimeout(() => setAutoUp(null), 3000)
  }

  const onPageDragEnter = (e) => {
    e.preventDefault(); dragCounter.current += 1
    if (e.dataTransfer.types.includes('Files')) setPageDrag(true)
  }
  const onPageDragLeave = (e) => {
    e.preventDefault(); dragCounter.current -= 1
    if (dragCounter.current <= 0) { dragCounter.current = 0; setPageDrag(false) }
  }
  const onPageDragOver  = (e) => { e.preventDefault() }
  const onPageDrop = (e) => {
    e.preventDefault(); dragCounter.current = 0; setPageDrag(false)
    if (e.dataTransfer.files?.length > 0) autoUpload(Array.from(e.dataTransfer.files))
  }

  const startRename = (id, name, type, e) => {
    e.stopPropagation(); setRenaming({ id, type }); setRenameVal(name)
  }
  const submitRename = async (e) => {
    e?.preventDefault()
    if (!renameVal.trim() || !renaming) return
    try {
      if (renaming.type === 'folder') {
        await api.put(`/api/folders/${renaming.id}`, { name: renameVal.trim() })
        setFolders(prev => prev.map(f => f.id === renaming.id ? { ...f, name: renameVal.trim() } : f))
      } else {
        await api.patch(`/api/files/${renaming.id}/rename`, { name: renameVal.trim() })
        setFiles(prev => prev.map(f => f.id === renaming.id ? { ...f, original_name: renameVal.trim() } : f))
      }
    } catch (err) { alert(err.response?.data?.error || 'Erro ao renomear') }
    finally { setRenaming(null) }
  }

  const handleFileClick = (file) => {
    const previewable = file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf'
    if (previewable) setPreview(file)
    else download(file)
  }

  const empty = folders.length === 0 && files.length === 0
  const canManage = (item) => isAdmin || item.user_id === user?.id

  return (
    <div
      className="flex flex-col gap-4 lg:h-full lg:overflow-hidden animate-fadeIn pb-10 lg:pb-0 font-sans relative"
      onDragEnter={onPageDragEnter}
      onDragLeave={onPageDragLeave}
      onDragOver={onPageDragOver}
      onDrop={onPageDrop}
    >
      {/* Overlay drag */}
      {pageDrag && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0B3904]/10 border-4 border-dashed border-[#0B3904] rounded-2xl pointer-events-none animate-fadeIn">
          <Upload size={48} className="text-[#0B3904] mb-4" strokeWidth={1.5} />
          <p className="text-lg font-black uppercase tracking-widest text-[#0B3904]">Solte para enviar</p>
          <p className="text-xs font-bold text-[#0B3904]/60 mt-1 uppercase">
            {currentFolder ? `→ ${currentFolder.name}` : '→ Pasta Base'}
          </p>
        </div>
      )}

      {/* Toast upload */}
      {autoUp && (
        <div className="fixed bottom-5 right-5 z-[300] bg-[#0B3904] text-white rounded-2xl p-4 shadow-2xl w-72 animate-fadeIn">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {autoUp.finished ? <CheckCircle size={15} className="text-green-300" /> : <Upload size={15} className="animate-pulse" />}
              <span className="text-[11px] font-black uppercase">
                {autoUp.finished ? `Enviado${autoUp.errors > 0 ? ` (${autoUp.errors} erro${autoUp.errors > 1 ? 's' : ''})` : '!'}` : `Enviando ${autoUp.done}/${autoUp.total}...`}
              </span>
            </div>
            {autoUp.finished && <button onClick={() => setAutoUp(null)} className="text-white/50 hover:text-white"><X size={14} /></button>}
          </div>
          <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${autoUp.pct}%` }} />
          </div>
          {autoUp.finished && autoUp.errors > 0 && (
            <p className="text-[10px] text-red-300 mt-1.5 flex items-center gap-1"><AlertCircle size={11} /> {autoUp.errors} arquivo(s) falharam</p>
          )}
        </div>
      )}

      {/* Header */}
      <div className={`${CARD_ST} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 lg:p-4 flex-shrink-0`}>
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-xl font-black uppercase tracking-tighter text-[#1E293B]">Meus Arquivos</h1>
          <nav className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest bg-gray-100 px-3 py-1.5 rounded-lg w-fit mt-3">
            <button onClick={() => goCrumb(-1)} className="text-gray-500 hover:text-black flex items-center gap-1">
              <Home size={11} /> BASE
            </button>
            {breadcrumb.map((f, i) => (
              <span key={f.id} className="flex items-center gap-1.5">
                <ChevronRight size={10} className="text-gray-400" />
                <button onClick={() => goCrumb(i)} className={i === breadcrumb.length - 1 ? 'text-black' : 'text-gray-500 hover:text-black'}>{f.name}</button>
              </span>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex-1 sm:w-64 space-y-1">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input className="input !bg-white border-gray-100 pl-10 h-10 text-xs font-black uppercase w-full" placeholder="LOCALIZAR..." value={search} onChange={e => { setSearch(e.target.value); if (!e.target.value) setGlobal(false) }} />
            </div>
            {search && (
              <label className="flex items-center gap-1.5 cursor-pointer w-fit ml-1">
                <input type="checkbox" className="rounded accent-[#0B3904]" checked={globalSearch} onChange={e => setGlobal(e.target.checked)} />
                <span className={`text-[9px] font-black uppercase tracking-widest ${globalSearch ? 'text-[#0B3904]' : 'text-gray-400'}`}>Buscar em todos</span>
              </label>
            )}
          </div>
          <button onClick={() => setNewFolder(true)} className="p-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"><FolderPlus size={17} /></button>
          <button onClick={() => setUpload(true)} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#0B3904] text-white text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
            <Upload size={15} /> UPLOAD
          </button>
        </div>
      </div>

      {/* Tabela — card que preenche o restante, igual ao Logs */}
      <div className={`${CARD_ST} flex-1 flex flex-col lg:overflow-hidden`}>
        {newFolder && (
          <form onSubmit={createFolder} className="p-4 bg-gray-50 border-b border-gray-100 flex gap-3 animate-fadeIn flex-shrink-0">
            <input type="text" className="input flex-1 !bg-white" placeholder="Nome da pasta..." value={folderName} onChange={e => setFolderName(e.target.value)} autoFocus />
            <button type="submit" className="px-5 rounded-xl bg-[#0B3904] text-white text-[10px] font-black uppercase">Criar</button>
            <button type="button" onClick={() => setNewFolder(false)} className="p-2.5 text-gray-400 hover:text-gray-700"><X size={15} /></button>
          </form>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar">
          {loading ? (
            <div className="p-20 flex justify-center">
              <div className="w-8 h-8 border-[3px] border-[#0B3904] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : empty ? (
            <div className="p-20 flex flex-col items-center justify-center opacity-40">
              <FolderOpen size={44} className="mb-3 text-[#0B3904]" strokeWidth={1} />
              <p className="text-[11px] font-black text-[#0B3904] uppercase tracking-widest">Vazio — arraste arquivos aqui</p>
            </div>
          ) : (
            <table className="w-full text-sm border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="th-first">Item / Nome</th>
                  <th className="th hidden md:table-cell">Conteúdo</th>
                  <th className="th hidden sm:table-cell">Data / Tamanho</th>
                  <th className="th-last text-right px-5">Ações</th>
                </tr>
              </thead>
              <tbody>
                {folders.map(fold => (
                  <tr key={fold.id} className="table-row group cursor-pointer" onClick={() => renaming?.id !== fold.id && goFolder(fold)}>
                    <td className="td">
                      <div className={`flex items-center gap-3 ${renaming?.id !== fold.id ? 'group-hover:translate-x-1' : ''} transition-transform`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 flex-shrink-0 ${fold.is_shared ? 'border-[#0B3904] text-[#0B3904]' : 'border-amber-400 text-amber-500'}`}>
                          <Folder size={16} strokeWidth={2.5} />
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          {renaming?.id === fold.id ? (
                            <form onSubmit={submitRename} onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                              <input autoFocus className="text-sm font-black uppercase border-b-2 border-[#0B3904] outline-none bg-transparent w-full min-w-0" value={renameVal} onChange={e => setRenameVal(e.target.value)} onKeyDown={e => e.key === 'Escape' && setRenaming(null)} />
                              <button type="submit" className="text-[#0B3904] flex-shrink-0"><Check size={14} /></button>
                              <button type="button" onClick={() => setRenaming(null)} className="text-gray-400 flex-shrink-0"><X size={13} /></button>
                            </form>
                          ) : (
                            <p className="text-sm font-black text-black uppercase truncate">{fold.name}</p>
                          )}
                          {fold.is_shared && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 mt-0.5">
                              <Globe size={7} /> Compartilhada
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="td hidden md:table-cell">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{fold.item_count} itens</span>
                    </td>
                    <td className="td hidden sm:table-cell">
                      <p className="text-[10px] font-black text-gray-400 uppercase">{formatDate(fold.created_at)}</p>
                      <p className="text-[9px] font-bold text-[#0B3904] uppercase">{formatBytes(fold.total_size)}</p>
                    </td>
                    <td className="td px-5">
                      <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                        {canManage(fold) && (
                          <button onClick={e => startRename(fold.id, fold.name, 'folder', e)} className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-300 hover:text-slate-600 transition-all"><Edit2 size={13} /></button>
                        )}
                        {canManage(fold) && (
                          <button onClick={() => toggleFolderSharing(fold)} className={`p-1.5 rounded-lg border transition-all ${fold.is_shared ? 'bg-[#0B3904] text-white border-[#0B3904]' : 'bg-white text-gray-300 border-gray-100 hover:text-[#0B3904]'}`}>
                            <Globe size={14} />
                          </button>
                        )}
                        <button onClick={() => deleteFolder(fold.id, fold.name)} className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}

                {files.map(file => {
                  const previewable = file.mime_type?.startsWith('image/') || file.mime_type === 'application/pdf'
                  return (
                    <tr key={file.id} className="table-row group cursor-pointer" onClick={() => renaming?.id !== file.id && handleFileClick(file)}>
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center border border-slate-100 bg-slate-50 flex-shrink-0">
                            <FileTypeIcon name={file.original_name} mimeType={file.mime_type} size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            {renaming?.id === file.id ? (
                              <form onSubmit={submitRename} onClick={e => e.stopPropagation()} className="flex items-center gap-2">
                                <input autoFocus className="text-sm font-black uppercase border-b-2 border-[#0B3904] outline-none bg-transparent w-full min-w-0" value={renameVal} onChange={e => setRenameVal(e.target.value)} onKeyDown={e => e.key === 'Escape' && setRenaming(null)} />
                                <button type="submit" className="text-[#0B3904] flex-shrink-0"><Check size={14} /></button>
                                <button type="button" onClick={() => setRenaming(null)} className="text-gray-400 flex-shrink-0"><X size={13} /></button>
                              </form>
                            ) : (
                              <p className="text-sm font-black text-black truncate uppercase">{file.original_name}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {file.visibility === 'public' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-sky-100 text-sky-700 border border-sky-100">
                                  <Globe size={7} /> Público
                                </span>
                              )}
                              {previewable && !renaming && (
                                <span className="text-[9px] font-bold text-gray-300 uppercase">{file.mime_type?.startsWith('image/') ? 'imagem' : 'pdf'}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="td hidden md:table-cell text-gray-300 text-[10px] font-black uppercase">—</td>
                      <td className="td hidden sm:table-cell">
                        <p className="text-[10px] font-black text-gray-400 uppercase">{formatDate(file.created_at)}</p>
                        <p className="text-[10px] font-black text-slate-700 uppercase">{formatBytes(file.size)}</p>
                      </td>
                      <td className="td px-5">
                        <div className="flex items-center justify-end gap-2" onClick={e => e.stopPropagation()}>
                          {canManage(file) && (
                            <button onClick={e => startRename(file.id, file.original_name, 'file', e)} className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-300 hover:text-slate-600 transition-all"><Edit2 size={13} /></button>
                          )}
                          {canManage(file) && (
                            <button onClick={() => toggleFileVisibility(file)} disabled={toggling === file.id} className={`p-1.5 rounded-lg border transition-all ${file.visibility === 'public' ? 'bg-[#0B3904] text-white border-[#0B3904]' : 'bg-white text-gray-300 border-gray-100 hover:text-[#0B3904]'}`}>
                              {toggling === file.id ? <RefreshCw size={13} className="animate-spin" /> : <Globe size={14} />}
                            </button>
                          )}
                          <button onClick={() => download(file)} className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-300 hover:text-black transition-all"><Download size={14} /></button>
                          <button onClick={() => deleteFile(file.id, file.original_name)} className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-300 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showUpload && (
        <UploadModal onClose={() => { setUpload(false); load() }} onSuccess={() => { setUpload(false); load() }} currentFolderId={currentFolder?.id} currentFolderName={currentFolder?.name || 'Base'} />
      )}
      {preview && (
        <PreviewModal file={preview} onClose={() => setPreview(null)} onDownload={() => { download(preview); setPreview(null) }} />
      )}
    </div>
  )
}
