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

// Función para normalizar errores del backend - NUEVA FUNCIÓN
function normalizeBackendError(errorData) {
  console.log('📋 Error data recibido para normalización:', errorData);
  
  // CASO 1: Error directo en string
  if (typeof errorData === 'string') {
    return errorData;
  }
  
  // CASO 2: Objeto con propiedad 'error' que es string
  if (errorData.error && typeof errorData.error === 'string') {
    return errorData.error;
  }
  
  // CASO 3: Objeto con propiedad 'error' que es OTRO OBJETO (el problema principal)
  if (errorData.error && typeof errorData.error === 'object') {
    const nestedError = errorData.error;
    
    // Extraer mensaje del objeto anidado
    if (nestedError.error && typeof nestedError.error === 'string') {
      return nestedError.error;
    }
    
    // Construir mensaje descriptivo para errores de empleados
    if (nestedError.empleado || nestedError.id_empleado) {
      const empleadoNombre = nestedError.empleado?.nombre_completo || 
                            nestedError.empleado?.nombre || 
                            'empleado';
      const empleadoId = nestedError.id_empleado || nestedError.empleado?.id || 'N/A';
      
      if (nestedError.error && typeof nestedError.error === 'string') {
        return `${nestedError.error} (Empleado: ${empleadoNombre}, ID: ${empleadoId})`;
      }
      
      return `Error con empleado ${empleadoNombre} (ID: ${empleadoId})`;
    }
    
    // Para otros objetos anidados, convertirlos a string
    return JSON.stringify(nestedError);
  }
  
  // CASO 4: Otras propiedades que puedan contener el mensaje
  const possibleMessage = errorData.message || errorData.detail || errorData.msg;
  if (possibleMessage) {
    return typeof possibleMessage === 'string' ? possibleMessage : JSON.stringify(possibleMessage);
  }
  
  // CASO 5: Error de validación con detalles
  if (errorData.detalles) {
    return Object.entries(errorData.detalles)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join('\n');
  }
  
  // CASO 6: Convertir objeto completo a string como último recurso
  return JSON.stringify(errorData);
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

// Interceptor para responses - VERSIÓN CORREGIDA CON NORMALIZACIÓN DE ERRORES
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

    // ✅ CORRECCIÓN PRINCIPAL: Normalizar TODOS los errores del backend
    if (error.response && error.response.data) {
      console.log('⚠️ Error del backend detectado, normalizando...');
      
      // Crear un nuevo error normalizado
      const normalizedError = new Error(normalizeBackendError(error.response.data));
      normalizedError.response = {
        ...error.response,
        data: normalizedError.message // Reemplazar data con el mensaje normalizado
      };
      
      return Promise.reject(normalizedError);
    }

    // Para otros errores (red, timeout, etc.)
    return Promise.reject(error);
  }
);

export default api;