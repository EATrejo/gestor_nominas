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
      // Limpiar tokens previos
      localStorage.removeItem('token');
      localStorage.removeItem('refresh_token');
      
      const response = await api.post('/auth/token/', { email, password });
      const { access, refresh } = response.data;

      // Guardar tokens
      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);

      // Obtener información del token (sin verificar con el servidor)
      const tokenInfo = userService.getUserInfoFromToken();
      
      // Preparar datos del usuario
      const userInfo = {
        email,
        token: access,
        user_id: tokenInfo?.user_id,
        empresa_id: tokenInfo?.empresa_id,
        empresa_nombre: tokenInfo?.empresa_nombre,
        tipo_usuario: tokenInfo?.tipo_usuario
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
    // Limpiar localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('empresa_id');
    localStorage.removeItem('empresa_nombre');
    
    setUser(null);
    // Redirigir a la página principal (CityMap) en lugar de login
    window.location.href = '/';
  }, []);

  // Efecto para cargar información del usuario al iniciar
  useEffect(() => {
    const loadUserFromToken = () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Solo obtener información del token, sin verificar con el servidor
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
      } catch (error) {
        console.log('Error loading user from token:', error);
        // No hacer nada, el interceptor manejará tokens inválidos
      } finally {
        setIsLoading(false);
      }
    };

    loadUserFromToken();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading,
      login, 
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};