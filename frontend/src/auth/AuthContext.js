// src/auth/AuthContext.js
import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/token/', { email, password });
      const { access, refresh } = response.data;

      localStorage.setItem('token', access);
      localStorage.setItem('refresh_token', refresh);

      setUser({ email, token: access });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Credenciales inválidas' 
      };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    window.location.href = '/login';
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      const response = await api.post('/auth/token/refresh/', { refresh });
      const newAccessToken = response.data.access;
      localStorage.setItem('token', newAccessToken);
      return newAccessToken;
    } catch (error) {
      logout();
      throw error;
    }
  }, [logout]);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        await api.post('/auth/token/verify/', { token });
        setUser({ token });
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