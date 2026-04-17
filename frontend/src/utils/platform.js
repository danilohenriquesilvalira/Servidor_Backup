export const isTauri = () =>
  typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

const SERVER_URL_KEY = 'rls_server_url'

export function getServerUrl() {
  if (!isTauri()) return ''
  const url = localStorage.getItem(SERVER_URL_KEY) || ''
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function setServerUrl(url) {
  const normalized = url.trim().replace(/\/$/, '')
  localStorage.setItem(SERVER_URL_KEY, normalized)
}

export function isServerConfigured() {
  if (!isTauri()) return true
  return !!localStorage.getItem(SERVER_URL_KEY)
}

export function clearServerConfig() {
  localStorage.removeItem(SERVER_URL_KEY)
}
