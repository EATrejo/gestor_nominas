import { Link, useLocation, useNavigate } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import '../styles/AuthPages.css';
import { useEffect, useState } from 'react';

function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const registrationSuccess = location.state?.registrationSuccess;
  const [companyName, setCompanyName] = useState('');
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Cargar la imagen de fondo
    setBackgroundImage('login_cartoon3.png');

    // MOSTRAR SALUDO SOLO PARA REGISTRO EXITOSO, NO PARA LOGIN NORMAL
    if (registrationSuccess && location.state?.companyName) {
      // Caso: registro exitoso - mostrar bienvenida a la nueva empresa
      setCompanyName(location.state.companyName);
      setShowWelcome(true);
      localStorage.setItem('lastRegisteredCompany', location.state.companyName);
      
      // Limpiar el estado después de 5 segundos para que no persista en refrescos
      setTimeout(() => {
        if (location.state) {
          navigate('/login', { replace: true, state: {} });
        }
      }, 5000);
    } else {
      // Caso: login normal - NO mostrar saludo de bienvenida
      setShowWelcome(false);
      setCompanyName('');
    }
  }, [location.state, registrationSuccess, navigate]);

  const handleBack = () => {
    // Redirigir siempre a la página principal (CityMap)
    navigate('/', { replace: true });
  };

  // Manejar la flecha de retroceso del navegador
  useEffect(() => {
    const handlePopState = (event) => {
      // Prevenir el comportamiento por defecto
      event.preventDefault();
      // Redirigir a la página principal
      navigate('/', { replace: true });
    };

    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [navigate]);

  return (
    <div className={`auth-page ${backgroundImage ? 'with-background' : ''}`}>
      {backgroundImage && (
        <div className="background-image-container">
          <img 
            src={require(`../assets/${backgroundImage}`)} 
            alt="Fondo login"
            className="background-image"
            style={{ 
              transform: 'scale(0.7)',
              transformOrigin: 'center'
            }}
          />
          <div className="background-overlay"></div>
          
          {/* Bubble de diálogo SOLO para registro exitoso */}
          {showWelcome && companyName && (
            <div className="speech-bubble">
              <div className="bubble-content">
                <p>¿LISTOS CHICO(S) DE</p>
                <p className="company-name">{companyName.toUpperCase()}</p>
                <p>PARA PROCESAR SU NÓMINA?</p>
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className="form-wrapper">
        <div className="auth-container">
          <h1 className="auth-title">Iniciar sesión</h1>
          
          {registrationSuccess && (
            <div className="alert alert-success">
              ¡Registro exitoso! Por favor inicia sesión con tus credenciales.
            </div>
          )}
          
          <LoginForm />
          
          <div className="auth-footer">
            ¿No tienes una cuenta? <Link to="/register" className="auth-link">Regístrate aquí</Link>
          </div>

          {/* Botón Back */}
          <div className="back-button-container">
            <button 
              onClick={handleBack}
              className="back-button"
              type="button"
            >
              ← Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;