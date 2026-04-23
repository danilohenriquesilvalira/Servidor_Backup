import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, FolderOpen, CheckCircle, AlertCircle, File } from 'lucide-react'
import api, { formatBytes } from '../services/api'

export default function UploadModal({ currentFolderId, currentFolderName, onClose, onSuccess, initialFiles = [] }) {
  const [files, setFiles] = useState(initialFiles)
  const [folderId, setFolderId] = useState(currentFolderId || '')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState({})
  const [results, setResults] = useState([])
  const [userFolders, setUserFolders] = useState([])
  const inputRef = useRef()

  useEffect(() => {
    api.get('/api/folders/all')
      .then(r => setUserFolders(r.data.folders))
      .catch(err => console.error(err))
  }, [])

  const addFiles = (newFiles) => {
    const arr = Array.from(newFiles)
    setFiles(prev => [...prev, ...arr])
  }

  const handleUpload = async () => {
    if (files.length === 0) return
    setUploading(true)
    const uploadResults = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const formData = new FormData()
      formData.append('file', file)
      if (folderId) formData.append('folderId', folderId)
      if (description) formData.append('description', description)

      try {
        const { data } = await api.post('/api/files/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (evt) => {
            const pct = Math.round((evt.loaded * 100) / (evt.total || 1))
            setProgress(prev => ({ ...prev, [i]: pct }))
          }
        })
        uploadResults.push({ name: file.name, success: true, message: data.message })
      } catch (err) {
        uploadResults.push({ name: file.name, success: false, message: err.response?.data?.error || 'Erro' })
      }
    }

    setResults(uploadResults)
    setUploading(false)
    if (uploadResults.some(r => r.success)) onSuccess?.()
  }

  const allDone = results.length === files.length && results.length > 0 && !uploading

  const [dragging, setDragging] = useState(false)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') setDragging(true)
    else if (e.type === 'dragleave') setDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
        
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-800">Upload de Arquivos</h2>
          {!uploading && <button onClick={onClose} className="text-gray-400 hover:text-black"><X size={18} /></button>}
        </div>

        <div className="p-6 space-y-4">
          {!uploading && results.length === 0 && (
            <>
              <div 
                onClick={() => inputRef.current?.click()}
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${dragging ? 'border-[#0B3904] bg-green-50 scale-[0.99]' : 'border-gray-200 hover:border-[#0B3904] hover:bg-green-50/30'}`}
              >
                <Upload size={30} className={`mx-auto mb-2 transition-colors ${dragging ? 'text-[#0B3904]' : 'text-gray-300'}`} />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">
                  {dragging ? 'SOLTE PARA ADICIONAR' : 'Selecione ou arraste arquivos aqui'}
                </p>
                <input ref={inputRef} type="file" multiple className="hidden" onChange={e => addFiles(e.target.files)} />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Pasta de Destino</label>
                  <select className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold" value={folderId} onChange={e => setFolderId(e.target.value)}>
                    <option value="">RAIZ / PRINCIPAL</option>
                    {currentFolderId && <option value={currentFolderId}>📍 ATUAL: {currentFolderName?.toUpperCase()}</option>}
                    {userFolders.filter(f => f.id !== currentFolderId).map(f => (
                      <option key={f.id} value={f.id}>{f.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-400 mb-1 block">Breve Descrição</label>
                  <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs" placeholder="Opcional..." value={description} onChange={e => setDescription(e.target.value)} />
                </div>
              </div>

              {files.length > 0 && (
                <div className="max-h-32 overflow-y-auto divide-y divide-gray-100 border border-gray-100 rounded-lg">
                  {files.map((f, i) => (
                    <div key={i} className="flex justify-between items-center p-2 text-[11px] font-medium">
                      <span className="truncate max-w-[200px]">{f.name}</span>
                      <span className="text-gray-400">{formatBytes(f.size)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {uploading && (
            <div className="space-y-3">
              {files.map((file, i) => (
                <div key={i} className="text-[10px] font-bold">
                  <div className="flex justify-between mb-1"><span>{file.name}</span><span>{progress[i] || 0}%</span></div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#0B3904]" style={{ width: `${progress[i] || 0}%` }} /></div>
                </div>
              ))}
            </div>
          )}

          {allDone && (
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`p-3 rounded-lg text-[11px] font-bold flex items-center gap-2 ${r.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {r.success ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span className="truncate flex-1">{r.name}</span>
                  <span>{r.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 pt-0 flex gap-3">
          {!uploading && results.length === 0 && (
             <button onClick={handleUpload} disabled={files.length === 0} className="w-full py-3 bg-[#0B3904] text-white rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50">Enviar {files.length} Item(s)</button>
          )}
          {allDone && <button onClick={onClose} className="w-full py-3 bg-slate-900 text-white rounded-xl text-[11px] font-black uppercase tracking-widest">Fechar</button>}
        </div>
      </div>
    </div>
  )
}
