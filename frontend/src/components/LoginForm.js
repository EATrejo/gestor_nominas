import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
  // Estados del formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Hooks de autenticación y navegación
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * Maneja el envío del formulario de login
   * @param {React.FormEvent} e - Evento del formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Limpia errores anteriores
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/dashboard'); // Redirección post-login
      } else {
        // Manejo mejorado de errores
        setError(
          result.details?.non_field_errors?.[0] || 
          result.error || 
          'Credenciales incorrectas'
        );
      }
    } catch (error) {
      console.error('Error inesperado en LoginForm:', error);
      setError('Ocurrió un error inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div className="form-group">
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@email.com"
          required
          autoComplete="username"
          disabled={isLoading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          disabled={isLoading}
        />
      </div>

      {error && (
        <div className="error-message">
          <span role="alert">{error}</span>
        </div>
      )}

      <button 
        type="submit" 
        disabled={isLoading}
        aria-busy={isLoading}
      >
        {isLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
      </button>
    </form>
  );
}

export default LoginForm;