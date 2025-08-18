// App.js
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import CityMap from './components/CityMap';
import MainLayout from './layouts/MainLayout';

// Componente de Ruta Privada
const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// Componente para la página de inicio (landing) con CityMap
const HomePage = () => (
  <MainLayout>
    <CityMap />
  </MainLayout>
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal ahora muestra el CityMap */}
        <Route path="/" element={<HomePage />} />
        
        {/* Ruta alternativa para el CityMap (si se necesita) */}
        <Route path="/city-map" element={<HomePage />} />

        {/* Rutas públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Ruta protegida */}
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />

        {/* Redirección desde el CityMap al registro */}
        <Route 
          path="/register-from-map" 
          element={<RegisterPage fromMap={true} />} 
        />

        {/* Redirección para rutas no encontradas */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;