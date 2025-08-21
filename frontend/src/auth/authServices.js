// frontend/src/auth/authServices.js
import api from '../services/api';

/**
 * Servicio de autenticación
 * Contiene todas las operaciones relacionadas con autenticación
 */
export const authService = {
  /**
   * Inicia sesión y obtiene tokens JWT
   * @param {string} email - Correo electrónico del usuario
   * @param {string} password - Contraseña
   * @returns {Promise<{success: boolean, token?: string, refreshToken?: string, error?: any}>}
   */
  async login(email, password) {
    try {
      const response = await api.post('/auth/token/', {
        email,
        password
      });

      if (!response.data.access) {
        throw new Error('No se recibió token de acceso');
      }

      // Guardar tokens
      localStorage.setItem('token', response.data.access);
      localStorage.setItem('refresh_token', response.data.refresh);

      return {
        success: true,
        token: response.data.access,
        refreshToken: response.data.refresh,
        userData: response.data.user
      };
    } catch (error) {
      let errorMessage = 'Error de conexión';
      let errorDetails = null;

      if (error.response) {
        errorDetails = error.response.data;
        errorMessage = errorDetails.detail || 
                      errorDetails.non_field_errors?.[0] || 
                      'Credenciales inválidas';
      } else if (error.request) {
        errorMessage = 'El servidor no respondió';
      }

      console.error('Error en authService.login:', {
        message: errorMessage,
        details: errorDetails || error.message
      });

      return {
        success: false,
        error: errorMessage,
        details: errorDetails
      };
    }
  },

  /**
   * Registra una nueva empresa
   * @param {object} companyData - Datos de la empresa a registrar
   * @returns {Promise<{success: boolean, data?: any, error?: string}>}
   */
  async register(companyData) {
    try {
      const response = await api.post('/auth/register/', companyData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.data.success) {
        return { 
          success: true, 
          data: response.data,
          message: 'Registro exitoso. Por favor inicia sesión.'
        };
      }

      return { 
        success: false, 
        error: response.data.message || 'Error en el registro' 
      };
    } catch (error) {
      let errorMessage = 'Error de conexión con el servidor';
      let errorDetails = null;

      if (error.response) {
        errorDetails = error.response.data;
        if (error.response.status === 404) {
          errorMessage = 'Endpoint de registro no encontrado (404)';
        } else if (error.response.status === 400) {
          errorMessage = Object.values(error.response.data)
            .flat()
            .join(' ');
        } else {
          errorMessage = error.response.data?.message || error.response.statusText;
        }
      }

      console.error('Error en authService.register:', {
        message: errorMessage,
        details: errorDetails || error.message
      });

      return {
        success: false,
        error: errorMessage,
        details: errorDetails
      };
    }
  },

  /**
   * Cierra la sesión eliminando los tokens almacenados
   */
  logout() {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_data');
      return { success: true };
    } catch (error) {
      console.error('Error en authService.logout:', error);
      return { success: false, error: 'Error al cerrar sesión' };
    }
  },

  /**
   * Valida si existe un token activo
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!localStorage.getItem('token');
  },

  /**
   * Obtiene el token almacenado
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem('token');
  },

  /**
   * Obtiene el refresh token almacenado
   * @returns {string|null}
   */
  getRefreshToken() {
    return localStorage.getItem('refresh_token');
  },

  /**
   * Intenta refrescar el token de acceso
   * @returns {Promise<{success: boolean, token?: string}>}
   */
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) throw new Error('No hay refresh token disponible');

      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken
      });

      if (!response.data.access) {
        throw new Error('No se recibió nuevo token');
      }

      localStorage.setItem('token', response.data.access);
      return { success: true, token: response.data.access };
    } catch (error) {
      console.error('Error al refrescar token:', error);
      this.logout(); // Limpia los tokens inválidos
      return { success: false, error: 'Sesión expirada' };
    }
  }
};

// Exportaciones individuales para compatibilidad
export const login = authService.login;
export const register = authService.register;
export const logout = authService.logout;
export const isAuthenticated = authService.isAuthenticated;
export const getToken = authService.getToken;
export const refreshToken = authService.refreshToken;