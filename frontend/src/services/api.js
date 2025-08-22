import axios from "axios";

// Crear una instancia de axios
const api = axios.create({
  baseURL: "http://localhost:8000/api/",
  timeout: 10000, // 10 segundos de timeout
});

// Interceptor para adjuntar el token en cada request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Error en interceptor de request:', error);
    return Promise.reject(error);
  }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    console.error('❌ Error en la respuesta:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });

    const originalRequest = error.config;
    
    // Si el error es 401 (Unauthorized) y no es una solicitud de refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('🔄 Token expirado, intentando refresh...');
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No hay refresh token disponible');
        }

        const response = await axios.post(
          'http://localhost:8000/api/auth/token/refresh/',
          { refresh: refreshToken },
          { 
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data.access) {
          const newAccessToken = response.data.access;
          localStorage.setItem('token', newAccessToken);
          console.log('✅ Token refrescado exitosamente');
          
          // Reintentar la petición original con el nuevo token
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Error al refrescar token:', refreshError);
        // Limpiar tokens y redirigir a login
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    // Para otros errores, simplemente rechazar
    return Promise.reject(error);
  }
);

export default api;