import axios from 'axios'
import { isTauri, getServerUrl } from '../utils/platform'

// Adapter nativo para Tauri: usa tauri-plugin-http (Rust) em vez do XHR do WebView.
// Bypassa completamente o bloqueio mixed-content (https://tauri.localhost -> http://servidor).
async function tauriAdapter(config) {
  const { fetch: nativeFetch } = await import('@tauri-apps/plugin-http')

  // Extrai headers — AxiosHeaders para objeto plano
  const rawHeaders = config.headers
  const headers = {}
  if (rawHeaders) {
    const flat = typeof rawHeaders.toJSON === 'function' ? rawHeaders.toJSON() : rawHeaders
    for (const [k, v] of Object.entries(flat)) {
      if (v !== null && v !== undefined && typeof v !== 'object') {
        headers[k] = String(v)
      }
    }
  }

  // Prepara body e Content-Type
  let body
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
  if (config.data !== undefined && config.data !== null) {
    if (isFormData) {
      body = config.data
      // Deixa o runtime definir o Content-Type com o boundary correto
      delete headers['Content-Type']
      delete headers['content-type']
    } else {
      body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json'
      }
    }
  }

  // Timeout via AbortController
  const timeout = config.timeout || 20000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  let res
  try {
    res = await nativeFetch(config.url, {
      method: (config.method || 'GET').toUpperCase(),
      headers,
      body,
      signal: controller.signal,
    })
  } catch (networkErr) {
    clearTimeout(timer)
    if (networkErr.name === 'AbortError') {
      const err = new Error(`Timeout: servidor nao respondeu em ${timeout / 1000}s`)
      err.config = config
      throw err
    }
    const err = new Error('Servidor nao encontrado. Verifique o endereco e a conexao de rede.')
    err.config = config
    throw err
  }
  clearTimeout(timer)

  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }

  if (res.status >= 400) {
    const err = new Error(`Request failed with status code ${res.status}`)
    err.response = { status: res.status, data, headers: {}, config }
    err.config = config
    throw err
  }

  return { data, status: res.status, statusText: res.statusText, headers: {}, config }
}

const api = axios.create({
  adapter: isTauri() ? tauriAdapter : undefined,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rls_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`

  // Timeout: upload = 5 min, requests normais = 20s
  const isUpload = typeof FormData !== 'undefined' && config.data instanceof FormData
  config.timeout = isUpload ? 300000 : 20000

  // Prepend URL do servidor (Tauri + URL relativa)
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
      const isLogin = isTauri()
        ? window.location.hash.includes('/login')
        : window.location.pathname === '/login'
      if (!isLogin) {
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
