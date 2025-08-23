// src/services/userService.js
class UserService {
  constructor() {
    this.verificationCount = 0;
    this.maxVerifications = 3;
    this.lastVerificationTime = 0;
    this.verificationCooldown = 30000; // 30 segundos
  }

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
  }

  // Obtener información del usuario desde el token
  getUserInfoFromToken() {
    try {
      // Verificar si estamos en un bucle de verificaciones
      if (this.verificationCount > this.maxVerifications) {
        console.warn('⚠️ Demasiadas verificaciones de token, posible bucle');
        return null;
      }

      const token = localStorage.getItem("token");
      if (!token) return null;
      
      const payload = this.decodeToken(token);
      if (!payload) return null;
      
      // Extraer información del payload del token
      return {
        user_id: payload.user_id,
        empresa_id: payload.empresa_id,
        empresa_nombre: payload.empresa_nombre,
        email: payload.email,
        tipo_usuario: payload.tipo_usuario,
        exp: payload.exp
      };
    } catch (error) {
      console.error('Error getting user info from token:', error);
      return null;
    }
  }

  // Obtener empresa_id de forma confiable (OPTIMIZADO)
  async getEmpresaId() {
    try {
      // 1. Primero intentar desde localStorage
      const storedEmpresaId = localStorage.getItem('empresa_id');
      if (storedEmpresaId) {
        return parseInt(storedEmpresaId);
      }

      // 2. Intentar desde el token (sin verificar)
      const tokenInfo = this.getUserInfoFromToken();
      if (tokenInfo && tokenInfo.empresa_id) {
        localStorage.setItem('empresa_id', tokenInfo.empresa_id.toString());
        localStorage.setItem('empresa_nombre', tokenInfo.empresa_nombre || '');
        return tokenInfo.empresa_id;
      }

      // 3. Valor por defecto
      console.log('⚠️ Usando empresa ID por defecto: 34');
      return 34;
      
    } catch (error) {
      console.error('Error obteniendo empresa ID:', error);
      return 34;
    }
  }

  // Obtener información del usuario desde el API (con control de frecuencia)
  async getUserInfoFromAPI() {
    // Evitar llamadas API demasiado frecuentes
    if (this.verificationCount > this.maxVerifications) {
      console.warn('⚠️ Demasiadas llamadas API, omitiendo');
      return null;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token disponible');
      }

      // Intentar obtener información del endpoint de user info
      const response = await fetch('http://localhost:8000/api/auth/user/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        return userData;
      }
      
      throw new Error(`API responded with status: ${response.status}`);
    } catch (error) {
      console.warn('No se pudo obtener información del usuario desde API:', error.message);
      return null;
    }
  }

  // Debuggear el token (con control de frecuencia)
  debugToken() {
    // Limitar las verificaciones de debug
    if (this.verificationCount > this.maxVerifications * 2) {
      console.warn('⚠️ Demasiados debug de token, omitiendo');
      return null;
    }

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
      
      console.log('🔍 Contenido del token JWT:', payload);
      
      // Buscar específicamente keys relacionadas con empresa
      const empresaKeys = Object.keys(payload).filter(key => 
        key.toLowerCase().includes('empresa')
      );
      
      console.log('🏢 Keys relacionadas con empresa:', empresaKeys);
      empresaKeys.forEach(key => {
        console.log(`   ${key}:`, payload[key]);
      });

      this.verificationCount++;
      return payload;
    } catch (error) {
      console.error('Error debuggeando token:', error);
      return null;
    }
  }

  // Limpiar sesión completamente y resetear contadores
  clearSession() {
    const keysToRemove = [
      'token',
      'refresh_token',
      'user_data',
      'empresa_id',
      'empresa_nombre'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Resetear contadores
    this.verificationCount = 0;
    this.lastVerificationTime = 0;
    
    console.log('🧹 Sesión completamente limpiada');
  }

  // Obtener nombre de la empresa para mostrar en UI
  getEmpresaNombre() {
    return localStorage.getItem('empresa_nombre') || 'Sistema de Nóminas';
  }

  // Forzar un empresa_id específico (solo para testing/emergencias)
  setEmpresaIdForTesting(id, nombre = '') {
    localStorage.setItem('empresa_id', id.toString());
    if (nombre) {
      localStorage.setItem('empresa_nombre', nombre);
    }
    console.log('⚡ Empresa ID forzado a:', id);
    return id;
  }

  // Resetear contadores (útil después de login exitoso)
  resetVerificationCount() {
    this.verificationCount = 0;
    this.lastVerificationTime = 0;
    console.log('🔄 Contadores de verificación reseteados');
  }

  // Método para verificar estado actual
  getVerificationStatus() {
    return {
      count: this.verificationCount,
      max: this.maxVerifications,
      lastTime: this.lastVerificationTime,
      cooldown: this.verificationCooldown
    };
  }
}

// Exportar como singleton
export const userService = new UserService();
export default userService;