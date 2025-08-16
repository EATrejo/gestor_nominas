import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/',
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  
  // Endpoints públicos (sin token)
  const publicEndpoints = ['/auth/login/', '/auth/register/'];

  if (token && !publicEndpoints.some(endpoint => config.url.includes(endpoint))) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});


export default api;