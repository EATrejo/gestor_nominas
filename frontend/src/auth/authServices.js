// src/auth/authServices.js
import api from '../services/api';

// ---------- Helpers de token ----------
export const getToken = () => localStorage.getItem('token');
export const getRefreshToken = () => localStorage.getItem('refresh_token');
export const isAuthenticated = () => !!localStorage.getItem('token');

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user_data');
};

// ---------- Auth ----------
export const login = async (email, password) => {
  try {
    const { data } = await api.post('/auth/token/', { email, password });
    if (data.access) localStorage.setItem('token', data.access);
    if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
    if (data.user) localStorage.setItem('user_data', JSON.stringify(data.user));
    return { success: true, ...data };
  } catch (error) {
    const msg =
      error?.response?.data?.detail ||
      error?.response?.data?.non_field_errors?.[0] ||
      'Credenciales inválidas';
    return { success: false, error: msg, details: error?.response?.data };
  }
};

export const refreshToken = async () => {
  try {
    const refresh = getRefreshToken();
    if (!refresh) throw new Error('No hay refresh token');
    const { data } = await api.post('/auth/token/refresh/', { refresh });
    if (!data.access) throw new Error('No se recibió nuevo token');
    localStorage.setItem('token', data.access);
    return { success: true, token: data.access };
  } catch (error) {
    logout();
    return { success: false, error: 'Sesión expirada' };
  }
};

// ---------- Registros ----------
// Registro de EMPRESA (incluye usuario principal y opcional secundario)
// IMPORTANTE: eliminamos tokens ANTES de llamar para evitar 401 por JWT inválido.
export const registerEmpresa = async (companyData) => {
  // Quitar tokens para que el interceptor no añada Authorization
  localStorage.removeItem('token');
  localStorage.removeItem('refresh_token');

  try {
    const { data } = await api.post('/auth/register/', companyData, {
      headers: { 'Content-Type': 'application/json' }
    });

    // Tokens se mantienen borrados tras el registro
    return {
      success: true,
      data,
      message: 'Registro exitoso. Por favor inicia sesión.'
    };
  } catch (error) {
    let errorMessage = 'Error de conexión con el servidor';
    let errorDetails = null;

    if (error.response) {
      errorDetails = error.response.data;
      if (error.response.status === 404) {
        errorMessage = 'Endpoint de registro no encontrado (404)';
      } else if (error.response.status === 400) {
        // Unir mensajes de validación del backend
        errorMessage = Object.values(error.response.data).flat().join(' ');
      } else {
        errorMessage = error.response.data?.message || error.response.statusText || 'Error en el registro';
      }
    }

    return { success: false, error: errorMessage, details: errorDetails };
  }
};

// (Opcionales) Endpoints para registrar usuarios por separado si algún día los usas.
// No eliminan token porque normalmente requieren autenticación.
export const registerUsuario = async (usuarioData) => {
  const { data } = await api.post('/auth/registro-usuario/', usuarioData, {
    headers: { 'Content-Type': 'application/json' }
  });
  return { success: true, data };
};

export const registerUsuarioSecundario = registerUsuario;

// ---------- Objeto de servicio (default + named) ----------
const authService = {
  login,
  logout,
  refreshToken,
  isAuthenticated,
  getToken,
  registerEmpresa,
  registerUsuario,
  registerUsuarioSecundario
};

export default authService;

// Compatibilidad con código existente:
export { authService };                 // Para imports: { authService }
export const register = registerEmpresa; // Para imports: { register }
