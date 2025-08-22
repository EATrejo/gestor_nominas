import { Link, useNavigate, useLocation } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import '../styles/AuthPages.css';
import { useEffect, useState } from 'react';
import { Button } from '@mui/material';
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

  const handleRegistrationSuccess = (companyName) => {
    navigate('/login', { 
      state: { 
        registrationSuccess: true,
        companyName: companyName,
        fromRegistration: true, // ← NUEVO: Indicar que viene del registro
        ...(businessType && { fromMap: true, businessType }) 
      } 
    });
  };

  const handleBackClick = () => {
    // Navegación mejorada para el botón de regreso
    if (location.state?.fromMap) {
      // Si viene del mapa, regresar al home
      navigate('/');
    } else if (window.history.length > 2) {
      // Si hay historial de navegación
      navigate(-1);
    } else {
      // Por defecto, ir al home
      navigate('/');
    }
  };

  return (
    <div className={`auth-page register-page ${backgroundImage ? 'with-background' : ''}`}>
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
      
      <div className="register-container">
        <div className="register-form-section">
          <div className="form-wrapper">
            <div className="auth-container">
              <h1 className="auth-title">Datos de la Empresa</h1>
              
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

        <div className="register-text-section">
          <p className="register-description">
            En esta aplicación puedes calcular tu nómina gratuitamente y sin necesidad de registrar o dar información personal o de tu tarjeta de credito. Si al procesar tus nóminas te das cuenta que esta aplicación te facilita la vida podemos confeccionar la misma  a tu medida para que nos hagamos cargo de el proceso de tu nómina al 100% y contarás con asistencia de un chat-contador las 24 horas del día y los 365 dias del año, para cosultas y aclaraciones.
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;