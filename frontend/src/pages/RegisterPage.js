import { Link, useNavigate, useLocation } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import '../styles/AuthPages.css';
import { useEffect, useState } from 'react';
import { Box, Typography, Chip, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const businessBackgrounds = {
  'GYM': 'gym_cartoon1.png',
  'Carnicería': 'carniceria_cartoon.png',
  'Minisupermercado': 'minisupermercado_cartoon1.png',
  'Taller mecánico': 'taller_mecanico_cartoon.png',
  'Escuela': 'school_cartoon.png',
  'Restaurante': 'restaurante_cartoon.png',
  'Librería': 'libreria_cartoon.png',
  'Otros': 'otros_cartoon1.png',
  'Salón de belleza': 'salon_de_belleza_cartoon.png',
  'Bar': 'bar_cartoon.png',
  'Cafetería': 'cafeteria_cartoon1.png',
  'Farmacia': 'farmacia_cartoon.png',
  'Fábrica': 'factory_cartoon.png'
};

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [businessType, setBusinessType] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);

  useEffect(() => {
    if (location.state?.fromMap) {
      setBusinessType(location.state.businessType);
      setBackgroundImage(businessBackgrounds[location.state.businessType] || 'otros_cartoon1.png');
    }
  }, [location.state]);

  const handleRegistrationSuccess = () => {
    navigate('/login', { 
      state: { 
        registrationSuccess: true,
        ...(businessType && { fromMap: true, businessType }) 
      } 
    });
  };

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <div className={`auth-page ${backgroundImage ? 'with-background' : ''}`}>
      {backgroundImage && (
        <div className="background-image-container">
          <img 
            src={require(`../assets/${backgroundImage}`)} 
            alt={`Fondo ${businessType}`}
            className="background-image"
            style={{ 
              transform: 'scale(0.7)',
              transformOrigin: 'center'
            }}
          />
          <div className="background-overlay"></div>
        </div>
      )}
      
      <div className="form-wrapper">
        <div className="auth-container">
          {businessType ? (
            <Box sx={{ 
              textAlign: 'center', 
              mb: 1,
              '& .MuiTypography-h4': {
                fontSize: '1.1rem',
                fontWeight: 'bold'
              },
              '& .MuiChip-root': {
                fontSize: '0.7rem',
                padding: '0.1rem 0.3rem',
                height: 'auto'
              }
            }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Registro para tu {businessType}
              </Typography>
              <Chip 
                label={businessType} 
                color="primary"
              />
            </Box>
          ) : (
            <h1 className="auth-title">Registro de Empresa</h1>
          )}
          
          <RegisterForm 
            onSuccess={handleRegistrationSuccess} 
            initialBusinessType={businessType}
          />
        </div>

        <Button
          onClick={handleBackClick}
          startIcon={<ArrowBackIcon />}
          className="back-button"
          variant="contained"
          color="primary"
          sx={{
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            '&:hover': {
              transform: 'scale(1.03)',
              boxShadow: '0 3px 10px rgba(0, 0, 0, 0.2)'
            },
            transition: 'all 0.2s ease',
            marginTop: '15px',
            width: 'fit-content',
            alignSelf: 'center'
          }}
        >
          Regresar
        </Button>

        <div className="auth-footer">
          ¿Ya tienes una cuenta? <Link to="/login" className="auth-link">Inicia sesión aquí</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;