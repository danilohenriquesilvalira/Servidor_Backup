import axios from 'axios'
import { isTauri, getServerUrl } from '../utils/platform'

const api = axios.create({
  timeout: 300000 // 5 minutos para uploads grandes
})

// Resolve URL dinamicamente: Tauri usa servidor configurado, web usa proxy relativo
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rls_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`

  if (isTauri() && config.url && !config.url.startsWith('http')) {
    const serverUrl = getServerUrl()
    if (serverUrl) config.url = `${serverUrl}${config.url}`
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rls_token')
      if (window.location.hash !== '#/login' && window.location.pathname !== '/login') {
        window.location.href = isTauri() ? '/#/login' : '/login'
      }
    }
    return Promise.reject(error)
  }
)

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(dateStr))
}

export function getFileIcon(mimeType, name) {
  if (!mimeType && !name) return '📄'
  const ext = name?.split('.').pop()?.toLowerCase()
  if (mimeType?.startsWith('image/') || ['jpg','jpeg','png','gif','svg','webp'].includes(ext)) return '🖼️'
  if (mimeType?.startsWith('video/') || ['mp4','avi','mov','mkv'].includes(ext)) return '🎬'
  if (mimeType?.startsWith('audio/') || ['mp3','wav','ogg'].includes(ext)) return '🎵'
  if (['pdf'].includes(ext) || mimeType === 'application/pdf') return '📕'
  if (['doc','docx'].includes(ext)) return '📝'
  if (['xls','xlsx','csv'].includes(ext)) return '📊'
  if (['ppt','pptx'].includes(ext)) return '📋'
  if (['zip','rar','tar','gz','7z'].includes(ext)) return '📦'
  if (['dwg','dxf','step','stp','iges','igs'].includes(ext)) return '📐'
  if (['py','js','ts','java','cpp','c','h','rs','go'].includes(ext)) return '💻'
  if (['txt','md','log'].includes(ext)) return '📄'
  return '📁'
}

export function getActionLabel(action) {
  const labels = {
    LOGIN: 'Login',
    LOGIN_FAILED: 'Tentativa de Login',
    FILE_UPLOAD: 'Upload de Arquivo',
    FILE_DOWNLOAD: 'Download de Arquivo',
    FILE_DELETE: 'Exclusão de Arquivo',
    FOLDER_CREATE: 'Criação de Pasta',
    FOLDER_DELETE: 'Exclusão de Pasta',
    USER_CREATE: 'Criação de Usuário',
    USER_UPDATE: 'Edição de Usuário',
    USER_DEACTIVATE: 'Desativação de Usuário',
    PASSWORD_CHANGED: 'Alteração de Senha',
    VISIBILITY_CHANGE: 'Alteração de Visibilidade',
  }
  return labels[action] || action
}

export default api
