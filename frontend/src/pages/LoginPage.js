import { Link, useLocation } from 'react-router-dom';
import LoginForm from '../components/LoginForm';
import '../styles/AuthPages.css';

function LoginPage() {
  const location = useLocation();
  const registrationSuccess = location.state?.registrationSuccess;

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Iniciar sesión</h1>
        
        {registrationSuccess && (
          <div className="alert alert-success">
            ¡Registro exitoso! Por favor inicia sesión con tus credenciales.
          </div>
        )}
        
        <LoginForm />
        
        <div className="auth-footer">
          ¿No tienes una cuenta? <Link to="/register" className="auth-link">Regístrate aquí</Link>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;