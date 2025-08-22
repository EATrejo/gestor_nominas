// src/auth/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { userService } from '../services/userService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
    window.location.href = '/login';
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      const response = await api.post('/auth/token/refresh/', { refresh });
      const newAccessToken = response.data.access;
      localStorage.setItem('token', newAccessToken);
      
      // Actualizar información del usuario con el nuevo token
      const tokenInfo = userService.getUserInfoFromToken();
      if (user && tokenInfo) {
        setUser(prev => ({
          ...prev,
          token: newAccessToken,
          empresa_id: tokenInfo.empresa_id,
          empresa_nombre: tokenInfo.empresa_nombre
        }));
      }
      
      return newAccessToken;
    } catch (error) {
      logout();
      throw error;
    }
  }, [logout, user]);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Verificar el token
        await api.post('/auth/token/verify/', { token });
        
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
        } else {
          setUser({ token });
        }
      } catch (error) {
        try {
          const newToken = await refreshToken();
          setUser({ token: newToken });
        } catch (refreshError) {
          logout();
        }
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [refreshToken, logout]);

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