// src/auth/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { userService } from '../services/userService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [verificationAttempts, setVerificationAttempts] = useState(0);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/token/', { email, password });
      const { access, refresh, user: userData } = response.data;

      // Guardar tokens
      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);

      // Extraer información del usuario y empresa del token
      const tokenInfo = userService.getUserInfoFromToken();
      
      // Preparar datos del usuario
      const userInfo = {
        email,
        token: access,
        user_id: tokenInfo?.user_id || userData?.id,
        empresa_id: tokenInfo?.empresa_id || userData?.empresa_id,
        empresa_nombre: tokenInfo?.empresa_nombre || userData?.empresa_nombre,
        tipo_usuario: tokenInfo?.tipo_usuario || userData?.tipo_usuario
      };

      // Guardar información de empresa en localStorage
      if (userInfo.empresa_id) {
        localStorage.setItem('empresa_id', userInfo.empresa_id.toString());
      }
      if (userInfo.empresa_nombre) {
        localStorage.setItem('empresa_nombre', userInfo.empresa_nombre);
      }

      setUser(userInfo);
      setVerificationAttempts(0); // Resetear contador
      return { success: true, user: userInfo };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Credenciales inválidas' 
      };
    }
  };

  const logout = useCallback(() => {
    userService.clearSession();
    setUser(null);
    setVerificationAttempts(0);
    window.location.href = '/';  // ← CAMBIO AQUÍ: de '/login' a '/'
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (!refresh) {
        throw new Error('No refresh token available');
      }

      // Usar axios directamente para evitar el interceptor
      const response = await api.post('/auth/token/refresh/', { refresh });
      const newAccessToken = response.data.access;
      localStorage.setItem('token', newAccessToken);
      
      return newAccessToken;
    } catch (error) {
      console.error('Refresh token failed:', error);
      logout();
      throw error;
    }
  }, [logout]);

  useEffect(() => {
    const verifyToken = async () => {
      // Prevenir bucles - máximo 3 intentos
      if (verificationAttempts > 3) {
        console.warn('⚠️ Demasiados intentos de verificación, cerrando sesión');
        logout();
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setVerificationAttempts(prev => prev + 1);
        
        // Verificar el token con timeout
        const verifyPromise = api.post('/auth/token/verify/', { token });
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        );

        await Promise.race([verifyPromise, timeoutPromise]);
        
        // Obtener información del usuario desde el token
        const tokenInfo = userService.getUserInfoFromToken();
        
        if (tokenInfo) {
          setUser({
            token,
            email: tokenInfo.email,
            user_id: tokenInfo.user_id,
            empresa_id: tokenInfo.empresa_id,
            empresa_nombre: tokenInfo.empresa_nombre,
            tipo_usuario: tokenInfo.tipo_usuario
          });
        }
        
        setVerificationAttempts(0); // Resetear en éxito
        
      } catch (error) {
        console.log('Token verification failed, attempting refresh...');
        try {
          await refreshToken();
          setVerificationAttempts(0); // Resetear en refresh exitoso
        } catch (refreshError) {
          console.error('Refresh also failed, logging out');
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    // Solo verificar si no hay demasiados intentos
    if (verificationAttempts <= 3) {
      verifyToken();
    }
  }, [refreshToken, logout, verificationAttempts]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading,
      login, 
      logout,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => React.useContext(AuthContext);