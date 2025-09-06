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
  'Fábrica': 'factory_cartoon.png',
  'Hotel': 'hotel_cartoon.png'
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
    <div className="register-page" style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      {/* Fondo de pantalla */}
      {backgroundImage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1
        }}>
          <img 
            src={require(`../assets/${backgroundImage}`)} 
            alt={isFromMapClick ? "Fondo de playa" : `Fondo ${businessType}`}
            style={{ 
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center'
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
        gap: '30px',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        marginTop: '20px'
      }}>
        {/* Formulario de registro */}
        <div style={{
          flex: '0 1 700px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '30px 25px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxSizing: 'border-box',
            position: 'relative'
          }}>
            <h1 style={{
              textAlign: 'center',
              marginBottom: '25px',
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

            {/* Botón de regreso centrado debajo del formulario */}
            <div style={{
              textAlign: 'center',
              marginTop: '25px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <Button
                onClick={handleBackClick}
                startIcon={<ArrowBackIcon />}
                variant="contained"
                sx={{
                  padding: '10px 30px',
                  borderRadius: '25px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  backgroundColor: 'rgba(25, 118, 210, 0.9)',
                  color: '#fff',
                  '&:hover': {
                    backgroundColor: 'rgba(21, 101, 192, 0.9)',
                    transform: 'scale(1.05)'
                  },
                  transition: 'all 0.3s ease',
                  backdropFilter: 'blur(5px)',
                  minWidth: '160px'
                }}
              >
                Regresar
              </Button>
            </div>

            <div style={{
              textAlign: 'center',
              marginTop: '20px',
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
          alignItems: 'center'
        }}>
          <p style={{
            color: '#fff',
            fontSize: '1.15rem',
            lineHeight: '1.6',
            textAlign: 'justify',
            margin: '0',
            textShadow: '2px 2px 4px rgba(0, 0, 0, 0.7)',
            fontWeight: '500',
            padding: '25px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderRadius: '12px',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            GRATIS, Y mediante un REGISTRO AMIGABLE y SIN ingresar los datos de tu TARJETA DE CREDITO, vas a poder calcular aspectos básicos de una nómina como son: deducciones del IMSS e ISR de periodos semanal, quincenal y/o mensual ; así como bonificaciones de primas dominicales, dias festivos trabajados y registro de faltas para efectuar el descuento correspondiente al empleado, etc. Este simulador de nómina básica puede en cualquier momento confeccionarse justo a tu medida y convertirse en un verdadero procesador de tus nóminas y el cual contará con multiples beneficios como un servicio de chat con un contador laboral las 24 horas del día y los 365 días del año.
          </p>
        </div>
      </div>

      <style jsx>{`
        /* Reset de márgenes y estilos base */
        body, html {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
        }

        /* Estilos responsivos */
        @media (max-width: 1024px) {
          div[style*="gap: '30px'"] {
            gap: 20px !important;
          }
          
          div[style*="flex: 0 1 350px"] {
            flex: 0 1 300px !important;
          }
          
          p[style*="font-size: 1.15rem"] {
            font-size: 1.05rem !important;
            padding: 20px !important;
          }
        }

        @media (max-width: 900px) {
          div[style*="flex-direction: row"] {
            flex-direction: column !important;
            gap: 25px !important;
            margin-top: 40px !important;
          }
          
          div[style*="flex: 0 1 700px"],
          div[style*="flex: 0 1 350px"] {
            flex: 1 1 100% !important;
            width: 100% !important;
            max-width: 600px !important;
          }
          
          p[style*="text-align: justify"] {
            text-align: center !important;
            font-size: 1.1rem !important;
          }
        }

        @media (max-width: 768px) {
          .register-page {
            padding: 15px !important;
            min-height: 100vh;
            height: auto;
            overflow: auto;
          }
          
          div[style*="margin-top: 20px"] {
            margin-top: 30px !important;
          }
          
          div[style*="padding: 30px 25px"] {
            padding: 25px 20px !important;
          }
          
          h1[style] {
            font-size: 1.6rem !important;
            margin-bottom: 20px !important;
          }
          
          p[style] {
            font-size: 1rem !important;
            padding: 20px !important;
            line-height: 1.5 !important;
          }
          
          Button[sx] {
            padding: 9px 25px !important;
            font-size: 0.95rem !important;
            min-width: 140px !important;
          }
        }

        @media (max-width: 480px) {
          .register-page {
            padding: 10px !important;
          }
          
          div[style*="margin-top: 20px"] {
            margin-top: 20px !important;
          }
          
          div[style*="padding: 30px 25px"] {
            padding: 20px 15px !important;
          }
          
          h1[style] {
            font-size: 1.4rem !important;
          }
          
          p[style] {
            font-size: 0.95rem !important;
            padding: 15px !important;
          }
          
          Button[sx] {
            padding: 8px 20px !important;
            font-size: 0.9rem !important;
            min-width: 120px !important;
          }
        }

        @media (max-width: 360px) {
          div[style*="padding: 30px 25px"] {
            padding: 18px 12px !important;
          }
          
          h1[style] {
            font-size: 1.3rem !important;
          }
          
          p[style] {
            font-size: 0.9rem !important;
            padding: 12px !important;
          }
          
          Button[sx] {
            padding: 7px 18px !important;
            font-size: 0.85rem !important;
            min-width: 110px !important;
          }
        }

        /* Permitir scroll en dispositivos móviles */
        @media (max-height: 700px) and (max-width: 900px) {
          .register-page {
            overflow: auto;
            height: auto;
          }
        }

        /* Estilos para el formulario interno */
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
          backdropFilter: blur(5px) !important;
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
          backdropFilter: blur(5px) !important;
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

        /* Responsive para el formulario */
        @media (max-width: 1024px) {
          .auth-form {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

export default RegisterPage;