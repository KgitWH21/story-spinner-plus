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
export const listProjects = () => api.get('/api/projects/')
export const renameProject = (id, name) => api.patch(`/api/projects/${id}/`, { name })
export const getElementCategories = () => api.get('/api/elements/categories/')
export const shuffleElements = (categories) => {
  const param = categories ? `?categories=${categories.join(',')}` : ''
  return api.get(`/api/elements/shuffle/${param}`)
}
export const getWheelSet = (mode) => api.get(`/api/elements/wheel-set/?mode=${mode}`)

export default api
