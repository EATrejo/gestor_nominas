import axios from "axios";

// Crear una instancia de axios
const api = axios.create({
  baseURL: "http://localhost:8000/api/",
  timeout: 10000,
});

// Variable para controlar el estado de refresh
let isRefreshing = false;
let refreshSubscribers = [];

// Función para suscribirse al refresh del token
function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}

// Función para ejecutar todos los callbacks cuando el token se refresca
function onRefreshed(token) {
  refreshSubscribers.map(cb => cb(token));
  refreshSubscribers = [];
}

// Lista de endpoints excluidos del interceptor
const excludedEndpoints = [
  '/auth/token/verify/',
  '/auth/token/refresh/',
  '/auth/login/',
  '/auth/register/',
  '/auth/token/'
];

// Función para verificar si un endpoint está excluido
function isExcludedEndpoint(url) {
  return excludedEndpoints.some(endpoint => url.includes(endpoint));
}

// Interceptor para requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    
    // No agregar token a endpoints excluidos
    if (token && !isExcludedEndpoint(config.url)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para responses - VERSIÓN CORREGIDA SIN BUCLE
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es un endpoint excluido, no procesar
    if (originalRequest.url && isExcludedEndpoint(originalRequest.url)) {
      console.log('🛑 Endpoint excluido del interceptor:', originalRequest.url);
      return Promise.reject(error);
    }

    // Si es error 401 y no hemos intentado refrescar
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // Evitar bucles múltiples
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        console.log('🔄 Intentando refresh token...');
        
        // Usar axios directamente para evitar el interceptor
        const refreshResponse = await axios.post(
          'http://localhost:8000/api/auth/token/refresh/',
          { refresh: refreshToken },
          {
            headers: {
              'Content-Type': 'application/json'
            },
            timeout: 5000
          }
        );

        if (refreshResponse.data.access) {
          const newToken = refreshResponse.data.access;
          localStorage.setItem('token', newToken);
          
          console.log('✅ Token refrescado exitosamente');
          
          // Actualizar el header por defecto
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          
          // Ejecutar todos los callbacks en cola
          onRefreshed(newToken);
          
          // Reintentar la request original
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        
        // Limpiar todo
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('empresa_id');
        localStorage.removeItem('empresa_nombre');
        
        // Redirigir al login
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Para otros errores, simplemente rechazar
    return Promise.reject(error);
  }
);

export default api;