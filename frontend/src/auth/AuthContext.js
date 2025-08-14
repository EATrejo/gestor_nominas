import { createContext, useContext, useState } from 'react';
import { authService } from './authServices';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (email, password) => {
    const result = await authService.login(email, password);
    
    if (result.success) {
      localStorage.setItem('token', result.token);
      setUser({ email }); // Guarda más datos del usuario si es necesario
    }
    
    return result;
  };

  const value = { user, login };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}