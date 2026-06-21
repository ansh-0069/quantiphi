import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getMeals       = ()     => api.get('/meals').then(r => r.data)
export const postMeal       = (body) => api.post('/meals', body).then(r => r.data)
export const getFoods       = (q='') => api.get(`/foods${q ? `?q=${q}` : ''}`).then(r => r.data)

// Undo-aware delete flow:
//   softDeleteMeal  → marks pendingDeletion=true, bars update instantly
//   confirmDelete   → permanently removes after grace period
//   restoreMeal     → undo: clears pendingDeletion, meal reappears
export const softDeleteMeal = (id)   => api.delete(`/meals/${id}`).then(r => r.data)
export const confirmDelete  = (id)   => api.delete(`/meals/${id}/confirm`).then(r => r.data)
export const restoreMeal    = (id)   => api.post(`/meals/${id}/restore`).then(r => r.data)

export const getGoal        = ()     => api.get('/goal').then(r => r.data)
export const setGoal        = (goal) => api.post('/goal', { goal }).then(r => r.data)
export const getWeekHistory = ()     => api.get('/history/week').then(r => r.data)
