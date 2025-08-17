import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(
          result.error || 
          'Credenciales incorrectas. Por favor verifica tus datos.'
        );
      }
    } catch (error) {
      console.error('Error en LoginForm:', error);
      setError('Error al conectar con el servidor. Intenta nuevamente.');
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
          autoFocus
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
        <div className="error-message" role="alert">
          <p>{error}</p>
        </div>
      )}

      <button 
        type="submit" 
        disabled={isLoading}
        aria-busy={isLoading}
        className="primary-button"
      >
        {isLoading ? (
          <span className="loading-indicator">Iniciando sesión...</span>
        ) : (
          'Iniciar sesión'
        )}
      </button>
    </form>
  );
}

export default LoginForm;