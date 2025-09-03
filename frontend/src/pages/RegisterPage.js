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
  const [isFromMapClick, setIsFromMapClick] = useState(false);

  useEffect(() => {
    if (location.state?.fromMap) {
      setBusinessType(location.state.businessType);
      setBackgroundImage(businessBackgrounds[location.state.businessType] || 'otros_cartoon1.png');
    }
    
    if (location.state?.fromMapClick) {
      setIsFromMapClick(true);
      setBackgroundImage('working-beach.png');
    }
  }, [location.state]);

  const handleRegistrationSuccess = (companyName) => {
    navigate('/login', { 
      state: { 
        registrationSuccess: true,
        companyName: companyName,
        fromRegistration: true,
        ...(businessType && { fromMap: true, businessType }) 
      } 
    });
  };

  const handleBackClick = () => {
    if (location.state?.fromMap || location.state?.fromMapClick) {
      navigate('/');
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
      margin: 0,
      padding: 0
    }}>
      {/* Fondo de pantalla sin márgenes */}
      {backgroundImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          margin: 0,
          padding: 0
        }}>
          <img 
            src={require(`../assets/${backgroundImage}`)} 
            alt={isFromMapClick ? "Fondo de playa" : `Fondo ${businessType}`}
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              display: 'block',
              margin: 0,
              padding: 0
            }}
          />
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.4)'
          }}></div>
        </div>
      )}
      
      {/* Contenido principal */}
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        width: '90%',
        maxWidth: '1400px',
        margin: '0 auto',
        gap: '20px',
        padding: '20px',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        zIndex: 1
      }}>
        {/* Formulario de registro */}
        <div style={{
          flex: '0 1 700px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '15px'
        }}>
          <div style={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '25px 20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxSizing: 'border-box'
          }}>
            <h1 style={{
              textAlign: 'center',
              marginBottom: '20px',
              color: '#fff',
              fontWeight: '600',
              fontSize: '1.8rem',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.5)'
            }}>Datos de la Empresa</h1>
            
            <div style={{ width: '100%' }}>
              <RegisterForm 
                onSuccess={handleRegistrationSuccess} 
                initialBusinessType={businessType}
              />
            </div>

            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <Button
                onClick={handleBackClick}
                startIcon={<ArrowBackIcon />}
                variant="contained"
                sx={{
                  padding: '8px 22px',
                  borderRadius: '22px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(25, 118, 210, 0.9)',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: 'rgba(21, 101, 192, 0.9)',
                    transform: 'scale(1.03)'
                  },
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(5px)'
                }}
              >
                Regresar
              </Button>
            </div>

            <div style={{
              textAlign: 'center',
              marginTop: '15px',
              color: 'rgba(255, 255, 255, 0.9)',
              fontSize: '0.9rem',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
            }}>
              ¿Ya tienes una cuenta? <Link to="/login" style={{
                color: '#fff',
                textDecoration: 'underline',
                fontWeight: '500',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
              }}>Inicia sesión aquí</Link>
            </div>
          </div>
        </div>

        {/* Texto descriptivo */}
        <div style={{
          flex: '0 1 350px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '15px',
          height: '100%'
        }}>
          <p style={{
            color: '#fff',
            fontSize: '1.15rem',
            lineHeight: '1.6',
            textAlign: 'justify',
            margin: '0',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
            fontWeight: '500',
            padding: '20px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '12px',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            GRATIS, Y mediante un REGISTRO AMIGABLE y SIN ingresar los datos de tu TARJETA DE CREDITO, vas a poder calcular aspectos básicos de una nómina como son: deducciones del IMSS e ISR de periodos semanal, quincenal y/o mensual ; así como bonificaciones de primas dominicales, dias festivos trabajados y registro de faltas para efectuar el descuento correspondiente al empleado, etc. Este simulador de nómina básica puede en cualquier momento confeccionarse justo a tu medida y convertirse en un verdadero procesador de tus nóminas y el cual contará con multiples beneficios como un servicio de chat con un contador laboral las 24 horas del día y los 365 días del año.
            
          </p>
        </div>
      </div>

      <style>{`
        /* Reset completo de márgenes globales */
        body, html {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }

        /* Estilos para el formulario */
        .auth-form {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          gap: 14px !important;
          width: 100% !important;
        }
        
        .form-section-company, 
        .form-section-users {
          grid-column: auto !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
        }
        
        .user-section-title {
          display: none !important;
        }
        
        .form-group {
          margin-bottom: 10px !important;
        }
        
        .form-group label {
          font-size: 0.85rem !important;
          margin-bottom: 5px !important;
          color: #fff !important;
          font-weight: 500 !important;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
        }
        
        .form-control {
          padding: 11px 13px !important;
          font-size: 0.9rem !important;
          border-radius: 8px !important;
          border: 1.5px solid rgba(255, 255, 255, 0.3) !important;
          background: rgba(255, 255, 255, 0.12) !important;
          color: #fff !important;
          transition: all 0.2s ease !important;
        }
        
        .form-control::placeholder {
          color: rgba(255, 255, 255, 0.7) !important;
        }
        
        .form-control:focus {
          border-color: rgba(255, 255, 255, 0.6) !important;
          outline: none !important;
          background: rgba(255, 255, 255, 0.18) !important;
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.1) !important;
        }
        
        .user-section {
          padding: 18px !important;
          border-radius: 10px !important;
          background: rgba(255, 255, 255, 0.1) !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          backdrop-filter: blur(5px) !important;
        }
        
        .user-section h4 {
          font-size: 0.95rem !important;
          margin-bottom: 12px !important;
          padding-bottom: 7px !important;
          border-bottom: 2px solid rgba(255, 255, 255, 0.4) !important;
          color: #fff !important;
          text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.5) !important;
        }
        
        .btn {
          padding: 9px 15px !important;
          font-size: 0.85rem !important;
          border-radius: 6px !important;
          font-weight: 500 !important;
          border: 1px solid rgba(255, 255, 255, 0.3) !important;
          background: rgba(255, 255, 255, 0.15) !important;
          color: #fff !important;
          backdrop-filter: blur(5px) !important;
          transition: all 0.2s ease !important;
        }
        
        .btn:hover {
          background: rgba(255, 255, 255, 0.25) !important;
          transform: translateY(-1px) !important;
        }
        
        .btn-primary {
          grid-column: 1 / -1 !important;
          margin-top: 16px !important;
          padding: 13px !important;
          font-size: 0.95rem !important;
          background: linear-gradient(135deg, rgba(25, 118, 210, 0.9) 0%, rgba(21, 101, 192, 0.9) 100%) !important;
          border: none !important;
          font-weight: 600 !important;
        }
        
        .btn-primary:hover {
          background: linear-gradient(135deg, rgba(25, 118, 210, 1) 0%, rgba(21, 101, 192, 1) 100%) !important;
          transform: translateY(-2px) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3) !important;
        }
        
        .invalid-feedback {
          font-size: 0.78rem !important;
          margin-top: 3px !important;
          color: #ff6b6b !important;
          text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
        }

        /* RESPONSIVE */
        @media (max-width: 1024px) {
          .auth-form {
            grid-template-columns: 1fr !important;
          }
        }
        
        @media (max-width: 900px) {
          div[style*="flex-direction: row"] {
            flex-direction: column !important;
            gap: 15px !important;
            padding: 15px !important;
          }
          
          div[style*="flex: 0 1 700px"], 
          div[style*="flex: 0 1 350px"] {
            flex: 1 1 100% !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          
          p[style*="text-align: justify"] {
            text-align: center !important;
          }
        }
        
        @media (max-width: 768px) {
          body, html {
            overflow: auto;
          }
          
          div[style*="position: fixed"] {
            position: absolute !important;
          }
        }
        
        @media (max-width: 480px) {
          div[style*="padding: 25px 20px"] {
            padding: 18px 12px !important;
          }
          
          h1[style] {
            font-size: 1.4rem !important;
          }
          
          p[style] {
            font-size: 1rem !important;
            padding: 15px !important;
          }
        }
      `}</style>
    </div>
  );
}

export default RegisterPage;