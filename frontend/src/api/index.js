import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
})

export const moduleAPI = {
  list: () => api.get('/modules'),
  create: (data) => api.post('/modules', data),
  update: (id, data) => api.put(`/modules/${id}`, data),
  delete: (id) => api.delete(`/modules/${id}`),
}

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data) => api.put('/settings', data),
}

export const tagAPI = {
  list: () => api.get('/tags'),
  create: (name) => api.post('/tags', { name }),
  update: (id, name) => api.put(`/tags/${id}`, { name }),
  delete: (id) => api.delete(`/tags/${id}`),
}

export const noteAPI = {
  list: (params) => api.get('/notes', { params }),
  get: (id) => api.get(`/notes/${id}`),
  create: (data) => api.post('/notes', data),
  update: (id, data) => api.put(`/notes/${id}`, data),
  delete: (id) => api.delete(`/notes/${id}`),
  upload: (data) => api.post('/notes/upload', data),
  uploadImage: (file) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post('/notes/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default api