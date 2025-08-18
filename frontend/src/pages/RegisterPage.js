import { Link, useNavigate, useLocation } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import '../styles/AuthPages.css';
import { useEffect, useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [businessType, setBusinessType] = useState(null);

  // Efecto para capturar el tipo de negocio si viene del CityMap
  useEffect(() => {
    if (location.state?.fromMap) {
      setBusinessType(location.state.businessType);
    }
  }, [location.state]);

  const handleRegistrationSuccess = () => {
    navigate('/login', { 
      state: { 
        registrationSuccess: true,
        // Mantenemos el estado de fromMap si viene del CityMap
        ...(businessType && { fromMap: true, businessType }) 
      } 
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Mostramos el tipo de negocio si viene del CityMap */}
        {businessType ? (
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Registro para tu {businessType}
            </Typography>
            <Chip 
              label={businessType} 
              color="primary" 
              sx={{ fontSize: '1rem', padding: '0.5rem' }} 
            />
          </Box>
        ) : (
          <h1>Registro de Empresa</h1>
        )}
        
        {/* Pasamos el businessType al formulario si existe */}
        <RegisterForm 
          onSuccess={handleRegistrationSuccess} 
          initialBusinessType={businessType}
        />
        
        <div className="auth-footer">
          ¿Ya tienes una cuenta? <Link to="/login" className="auth-link">Inicia sesión aquí</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;