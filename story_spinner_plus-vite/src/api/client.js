import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing = null  // shared promise so concurrent requests don't double-refresh

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    const status = err.response?.status

    // Retry once on 401/403 after refreshing the access token
    if ((status === 401 || status === 403) && !original._retried) {
      original._retried = true
      try {
        if (!refreshing) {
          refreshing = axios.post(
            `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'}/api/auth/refresh/`,
            { refresh: localStorage.getItem('refresh_token') },
          ).then(({ data }) => {
            localStorage.setItem('access_token', data.access)
            return data.access
          }).finally(() => { refreshing = null })
        }
        const newToken = await refreshing
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch {
        // Refresh failed — clear tokens so the app knows the session is over
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user_email')
      }
    }
    return Promise.reject(err)
  }
)

export const getMatrix = (mode) => api.get(`/api/matrix/?mode=${mode}`)
export const generateSpin = (mode, wedgeId) =>
  api.get(`/api/generate/?mode=${mode}&wedge_id=${wedgeId}`)
export const saveSpin = (data) => api.post('/api/spins/', data)
export const register = (email, password) =>
  api.post('/api/auth/register/', { email, password })
export const login = (email, password) =>
  api.post('/api/auth/login/', { email, password })
export const getMe = () => api.get('/api/auth/me/')
export const listSpins = (type) => api.get(type ? `/api/spins/?type=${type}` : '/api/spins/')
export const deleteSpin = (id) => api.delete(`/api/spins/${id}/`)

export const listDrafts = () => api.get('/api/drafts/')
export const createDraft = (data) => api.post('/api/drafts/', data)
export const updateDraft = (id, data) => api.patch(`/api/drafts/${id}/`, data)
export const deleteDraft = (id) => api.delete(`/api/drafts/${id}/`)
export const listProjects = () => api.get('/api/projects/')
export const renameProject = (id, name) => api.patch(`/api/projects/${id}/`, { name })
export const getElementCategories = () => api.get('/api/elements/categories/')
export const shuffleElements = (categories) => {
  const param = categories ? `?categories=${categories.join(',')}` : ''
  return api.get(`/api/elements/shuffle/${param}`)
}
export const getWheelSet = (mode) => api.get(`/api/elements/wheel-set/?mode=${mode}`)

export default api
