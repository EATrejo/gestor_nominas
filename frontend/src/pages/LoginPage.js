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

  useEffect(() => {
    // Obtener el nombre de la empresa del localStorage o del estado de navegación
    const savedCompany = localStorage.getItem('lastRegisteredCompany');
    const fromState = location.state?.companyName;
    
    if (fromState) {
      setCompanyName(fromState);
      localStorage.setItem('lastRegisteredCompany', fromState);
    } else if (savedCompany) {
      setCompanyName(savedCompany);
    }

    // Cargar la imagen de fondo
    setBackgroundImage('login_cartoon3.png');
  }, [location.state]);

  const handleBack = () => {
    navigate(-1); // Regresa a la página anterior
  };

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
          
          {/* Bubble de diálogo personalizado */}
          {companyName && (
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

          {/* Botón Back centrado */}
          <div className="back-button-container">
            <button 
              onClick={handleBack}
              className="back-button"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;