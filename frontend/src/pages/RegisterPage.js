import { Link, useNavigate } from 'react-router-dom';
import RegisterForm from '../components/RegisterForm';
import '../styles/AuthPages.css';

function RegisterPage() {
  const navigate = useNavigate();

  const handleRegistrationSuccess = () => {
    navigate('/login', { 
      state: { registrationSuccess: true } 
    });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Registro de Empresa</h1>
        
        <RegisterForm onSuccess={handleRegistrationSuccess} />
        
        <div className="auth-footer">
          ¿Ya tienes una cuenta? <Link to="/login" className="auth-link">Inicia sesión aquí</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;