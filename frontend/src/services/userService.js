// src/services/userService.js
export const userService = {
  // Función para decodificar el token JWT
  decodeToken(token) {
    try {
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      return JSON.parse(atob(parts[1]));
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  },

  // Obtener información del usuario desde el token
  getUserInfoFromToken() {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      
      const payload = this.decodeToken(token);
      if (!payload) return null;
      
      console.log('🔍 Payload completo del token:', payload);
      
      // Extraer información del payload del token
      return {
        user_id: payload.user_id,
        empresa_id: payload.empresa_id,
        empresa_nombre: payload.empresa_nombre,
        email: payload.email,
        tipo_usuario: payload.tipo_usuario
      };
    } catch (error) {
      console.error('Error getting user info from token:', error);
      return null;
    }
  },

  // Obtener empresa_id de forma confiable
  async getEmpresaId() {
    try {
      console.log('🔄 Buscando ID de empresa...');
      
      // 1. Intentar obtener del token JWT (más confiable)
      const tokenInfo = this.getUserInfoFromToken();
      console.log('📋 Información del token:', tokenInfo);
      
      if (tokenInfo && tokenInfo.empresa_id) {
        console.log('✅ ID de empresa obtenido del token:', tokenInfo.empresa_id);
        // Guardar también en localStorage para referencia futura
        localStorage.setItem('empresa_id', tokenInfo.empresa_id.toString());
        localStorage.setItem('empresa_nombre', tokenInfo.empresa_nombre || '');
        return tokenInfo.empresa_id;
      }
      
      // 2. Si el token no tiene empresa_id, intentar obtener de la respuesta del login
      try {
        const userInfo = await this.getUserInfoFromAPI();
        if (userInfo && userInfo.empresa_id) {
          console.log('✅ ID de empresa obtenido del API:', userInfo.empresa_id);
          localStorage.setItem('empresa_id', userInfo.empresa_id.toString());
          localStorage.setItem('empresa_nombre', userInfo.empresa_nombre || '');
          return userInfo.empresa_id;
        }
      } catch (apiError) {
        console.warn('No se pudo obtener información del API:', apiError.message);
      }
      
      // 3. Intentar obtener de localStorage (último recurso)
      const storedEmpresaId = localStorage.getItem('empresa_id');
      if (storedEmpresaId) {
        console.log('ℹ️ ID de empresa obtenido de localStorage:', storedEmpresaId);
        return parseInt(storedEmpresaId);
      }
      
      // 4. Si no hay nada, error crítico
      console.error('❌ No se pudo obtener ID de empresa');
      throw new Error('No se pudo identificar la empresa. Por favor cierre sesión y vuelva a ingresar.');
      
    } catch (error) {
      console.error('Error obteniendo empresa ID:', error);
      throw error;
    }
  },

  // Obtener información del usuario desde el API (para casos donde el token no tenga la info)
  async getUserInfoFromAPI() {
    try {
      // Intentar obtener información del endpoint de user info
      const response = await fetch('http://localhost:8000/api/auth/user/', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        console.log('📦 Información de usuario desde API:', userData);
        return userData;
      }
      throw new Error('Endpoint no disponible');
    } catch (error) {
      console.warn('No se pudo obtener información del usuario desde API:', error.message);
      return null;
    }
  },

  // Debuggear el token
  debugToken() {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('❌ No hay token en localStorage');
        return null;
      }
      
      const payload = this.decodeToken(token);
      if (!payload) {
        console.log('❌ Token inválido o mal formado');
        return null;
      }
      
      console.log('🔍 Contenido COMPLETO del token JWT:', payload);
      console.log('🗝️ Todas las keys del payload:', Object.keys(payload));
      
      // Buscar específicamente keys relacionadas con empresa
      const empresaKeys = Object.keys(payload).filter(key => 
        key.toLowerCase().includes('empresa') || 
        key.toLowerCase().includes('company') ||
        key.toLowerCase().includes('org') ||
        key.toLowerCase().includes('tenant')
      );
      
      console.log('🏢 Keys relacionadas con empresa:', empresaKeys);
      empresaKeys.forEach(key => {
        console.log(`   ${key}:`, payload[key]);
      });
      
      return payload;
    } catch (error) {
      console.error('Error debuggeando token:', error);
      return null;
    }
  },

  // Limpiar sesión completamente
  clearSession() {
    const keysToRemove = [
      'token',
      'refresh_token',
      'user_data',
      'empresa_id',
      'empresa_nombre',
      'old_empresa_id'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log('🧹 Sesión completamente limpiada');
  },

  // Obtener nombre de la empresa para mostrar en UI
  getEmpresaNombre() {
    return localStorage.getItem('empresa_nombre') || 'Sistema de Nóminas';
  },

  // Verificar si la sesión es válida
  isSessionValid() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      const payload = this.decodeToken(token);
      if (!payload) return false;
      
      // Verificar si el token ha expirado
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        console.log('❌ Token expirado');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error verificando sesión:', error);
      return false;
    }
  },

  // Forzar un empresa_id específico (solo para testing/emergencias)
  setEmpresaIdForTesting(id, nombre = '') {
    localStorage.setItem('empresa_id', id.toString());
    if (nombre) {
      localStorage.setItem('empresa_nombre', nombre);
    }
    console.log('⚡ Empresa ID forzado a:', id);
    return id;
  }
};

export default userService;