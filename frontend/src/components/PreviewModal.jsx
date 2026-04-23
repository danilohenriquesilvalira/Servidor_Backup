import { useState, useEffect } from 'react'
import { X, Download, FileQuestion } from 'lucide-react'
import api from '../services/api'

export default function PreviewModal({ file, onClose, onDownload }) {
  const [url, setUrl]       = useState(null)
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState(false)

  const isImage = file.mime_type?.startsWith('image/')
  const isPdf   = file.mime_type === 'application/pdf'

  useEffect(() => {
    api.post(`/api/files/${file.id}/token`)
      .then(({ data }) => setUrl(`${api.defaults.baseURL}/api/files/download/turbo?token=${data.token}`))
      .catch(() => setError(true))
      .finally(() => setLoad(false))
  }, [file.id])

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden"
        style={{ maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <p className="text-sm font-black uppercase tracking-tight text-slate-800 truncate max-w-[70%]">
            {file.original_name}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0B3904] text-white text-[10px] font-black uppercase tracking-widest"
            >
              <Download size={13} /> Baixar
            </button>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-black rounded-lg hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-50 p-4">
          {loading && (
            <div className="w-8 h-8 border-[3px] border-[#0B3904] border-t-transparent rounded-full animate-spin" />
          )}
          {!loading && error && (
            <div className="text-center text-gray-400 space-y-3">
              <FileQuestion size={40} strokeWidth={1} className="mx-auto" />
              <p className="text-xs font-black uppercase">Erro ao carregar pré-visualização</p>
              <button onClick={onDownload} className="px-6 py-3 bg-[#0B3904] text-white rounded-xl text-xs font-black uppercase">
                Baixar Arquivo
              </button>
            </div>
          )}
          {!loading && !error && isImage && url && (
            <img
              src={url}
              alt={file.original_name}
              className="max-w-full object-contain rounded-lg shadow-md"
              style={{ maxHeight: '75vh' }}
            />
          )}
          {!loading && !error && isPdf && url && (
            <iframe
              src={url}
              title={file.original_name}
              className="w-full rounded-lg border border-gray-200"
              style={{ height: '75vh' }}
            />
          )}
          {!loading && !error && !isImage && !isPdf && (
            <div className="text-center text-gray-400 space-y-3">
              <FileQuestion size={40} strokeWidth={1} className="mx-auto" />
              <p className="text-xs font-black uppercase">Pré-visualização indisponível para este tipo</p>
              <button onClick={onDownload} className="px-6 py-3 bg-[#0B3904] text-white rounded-xl text-xs font-black uppercase">
                Baixar Arquivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
