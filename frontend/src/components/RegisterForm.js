import React, { useState, useEffect } from 'react';
import { register } from '../auth/authServices';

const RegisterForm = ({ onSuccess, initialBusinessType }) => {
  // Lista de estados de México
  const estadosMexico = [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
    'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
    'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
    'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas'
  ];

  const [formData, setFormData] = useState({
    nombre: '',
    giro: initialBusinessType || '',
    cantidad_empleados: '',
    ciudad: '',
    estado: '',
    usuario_principal: {
      email: '',
      password: '',
      confirm_password: ''
    },
    usuario_secundario: {
      email: '',
      password: '',
      confirm_password: ''
    }
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showSecondUser, setShowSecondUser] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialBusinessType) {
      setFormData(prev => ({
        ...prev,
        giro: initialBusinessType
      }));
    }
  }, [initialBusinessType]);

  const handleChange = (e, userType = null) => {
    const { name, value } = e.target;
    
    // Limpiar errores del campo al escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: false
      }));
    }
    
    if (userType) {
      setFormData(prev => ({
        ...prev,
        [userType]: {
          ...prev[userType],
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const validateField = (name, value, userType = null) => {
    switch (name) {
      case 'nombre':
        if (!value.trim()) return 'Nombre de empresa requerido';
        if (value.trim().length < 2) return 'Nombre demasiado corto';
        return '';
      
      case 'giro':
        if (!value.trim()) return 'Giro de empresa requerido';
        return '';
      
      case 'cantidad_empleados':
        if (!value) return 'Cantidad de empleados requerida';
        if (isNaN(value) || parseInt(value) < 1) return 'Debe ser un número válido (mínimo 1)';
        return '';
      
      case 'ciudad':
        if (!value.trim()) return 'Ciudad, alcaldía o municipio requerido';
        return '';
      
      case 'estado':
        if (!value) return 'Estado requerido';
        return '';
      
      case 'email':
        if (!value) return 'Email requerido';
        if (!/\S+@\S+\.\S+/.test(value)) return 'Email no válido';
        return '';
      
      case 'password':
        if (!value) return 'Contraseña requerida';
        if (value.length < 8) return 'Mínimo 8 caracteres';
        return '';
      
      case 'confirm_password':
        let passwordToCompare;
        if (userType === 'usuario_principal') {
          passwordToCompare = formData.usuario_principal.password;
        } else if (userType === 'usuario_secundario') {
          passwordToCompare = formData.usuario_secundario.password;
        } else {
          passwordToCompare = '';
        }
        
        if (value !== passwordToCompare) return 'Las contraseñas no coinciden';
        return '';
      
      default:
        return '';
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const newFieldErrors = {};
    
    // Validar campos de empresa
    const companyFields = [
      { name: 'nombre', value: formData.nombre },
      { name: 'giro', value: formData.giro },
      { name: 'cantidad_empleados', value: formData.cantidad_empleados },
      { name: 'ciudad', value: formData.ciudad },
      { name: 'estado', value: formData.estado }
    ];
    
    companyFields.forEach(({ name, value }) => {
      const error = validateField(name, value);
      if (error) {
        newErrors[name] = error;
        newFieldErrors[name] = true;
      }
    });
    
    // Validar usuario principal
    const mainUserFields = [
      { name: 'email', value: formData.usuario_principal.email, userType: 'usuario_principal' },
      { name: 'password', value: formData.usuario_principal.password, userType: 'usuario_principal' },
      { name: 'confirm_password', value: formData.usuario_principal.confirm_password, userType: 'usuario_principal' }
    ];
    
    mainUserFields.forEach(({ name, value, userType }) => {
      const error = validateField(name, value, userType);
      if (error) {
        newErrors[`usuario_principal.${name}`] = error;
        newFieldErrors[`usuario_principal.${name}`] = true;
      }
    });
    
    // Validar usuario secundario si está visible y tiene datos
    if (showSecondUser) {
      const hasData = formData.usuario_secundario.email || 
                     formData.usuario_secundario.password || 
                     formData.usuario_secundario.confirm_password;
      
      if (hasData) {
        const secondaryUserFields = [
          { name: 'email', value: formData.usuario_secundario.email, userType: 'usuario_secundario' },
          { name: 'password', value: formData.usuario_secundario.password, userType: 'usuario_secundario' },
          { name: 'confirm_password', value: formData.usuario_secundario.confirm_password, userType: 'usuario_secundario' }
        ];
        
        secondaryUserFields.forEach(({ name, value, userType }) => {
          const error = validateField(name, value, userType);
          if (error) {
            newErrors[`usuario_secundario.${name}`] = error;
            newFieldErrors[`usuario_secundario.${name}`] = true;
          }
        });
      }
    }
    
    setErrors(newErrors);
    setFieldErrors(newFieldErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validateForm()) {
      // Scroll to first error
      const firstErrorField = document.querySelector('.is-invalid');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const dataToSend = {
        nombre: formData.nombre,
        giro: formData.giro,
        cantidad_empleados: parseInt(formData.cantidad_empleados),
        ciudad: formData.ciudad,
        estado: formData.estado,
        usuario_principal: {
          email: formData.usuario_principal.email,
          password: formData.usuario_principal.password,
          confirm_password: formData.usuario_principal.confirm_password
        },
        usuario_secundario: showSecondUser && formData.usuario_secundario.email ? {
          email: formData.usuario_secundario.email,
          password: formData.usuario_secundario.password,
          confirm_password: formData.usuario_secundario.confirm_password
        } : null
      };
      
      const result = await register(dataToSend);
      
      if (result.success) {
        localStorage.setItem('lastRegisteredCompany', formData.nombre);
        onSuccess(formData.nombre);
      } else {
        if (result.details) {
          const backendErrors = {};
          Object.entries(result.details).forEach(([field, messages]) => {
            backendErrors[field] = Array.isArray(messages) ? messages.join(' ') : messages;
          });
          setErrors(backendErrors);
        }
        setApiError(result.error || 'Error en el registro');
      }
    } catch (error) {
      setApiError('Error al conectar con el servidor. Por favor, intente nuevamente.');
      console.error('Error en RegisterForm:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlur = (e, userType = null) => {
    const { name, value } = e.target;
    
    let error;
    if (userType) {
      error = validateField(name, value, userType);
      const fieldName = `${userType}.${name}`;
      
      if (error) {
        setErrors(prev => ({ ...prev, [fieldName]: error }));
        setFieldErrors(prev => ({ ...prev, [fieldName]: true }));
      } else {
        setErrors(prev => ({ ...prev, [fieldName]: '' }));
        setFieldErrors(prev => ({ ...prev, [fieldName]: false }));
      }
    } else {
      error = validateField(name, value);
      
      if (error) {
        setErrors(prev => ({ ...prev, [name]: error }));
        setFieldErrors(prev => ({ ...prev, [name]: true }));
      } else {
        setErrors(prev => ({ ...prev, [name]: '' }));
        setFieldErrors(prev => ({ ...prev, [name]: false }));
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {apiError && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {apiError}
        </div>
      )}
      
      <div className="form-section-company">
        <div className="form-group">
          <label>Nombre de la Empresa/Compañía *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            onBlur={(e) => handleBlur(e)}
            className={`form-control ${fieldErrors.nombre ? 'is-invalid' : ''}`}
            placeholder="Ingrese el nombre completo de la empresa"
          />
          {errors.nombre && <div className="invalid-feedback">{errors.nombre}</div>}
        </div>
        
        <div className="form-group">
          <label>Giro de la Compañía/Empresa *</label>
          <input
            type="text"
            name="giro"
            value={formData.giro}
            onChange={handleChange}
            onBlur={(e) => handleBlur(e)}
            className={`form-control ${fieldErrors.giro ? 'is-invalid' : ''}`}
            readOnly={!!initialBusinessType}
            placeholder="Ej: Restaurante, Consultoría, Retail"
          />
          {errors.giro && <div className="invalid-feedback">{errors.giro}</div>}
        </div>
        
        <div className="form-group">
          <label>Cantidad de Empleados (aproximadamente) *</label>
          <input
            type="number"
            name="cantidad_empleados"
            value={formData.cantidad_empleados}
            onChange={handleChange}
            onBlur={(e) => handleBlur(e)}
            min="1"
            className={`form-control ${fieldErrors.cantidad_empleados ? 'is-invalid' : ''}`}
            placeholder="Ej: 15"
          />
          {errors.cantidad_empleados && <div className="invalid-feedback">{errors.cantidad_empleados}</div>}
        </div>
        
        <div className="form-group">
          <label>Ciudad, Alcaldía o Municipio *</label>
          <input
            type="text"
            name="ciudad"
            value={formData.ciudad}
            onChange={handleChange}
            onBlur={(e) => handleBlur(e)}
            className={`form-control ${fieldErrors.ciudad ? 'is-invalid' : ''}`}
            placeholder="Ej: Guadalajara, Iztapalapa, San Pedro Garza García"
          />
          {errors.ciudad && <div className="invalid-feedback">{errors.ciudad}</div>}
        </div>
        
        <div className="form-group">
          <label>Estado *</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            onBlur={(e) => handleBlur(e)}
            className={`form-control ${fieldErrors.estado ? 'is-invalid' : ''}`}
          >
            <option value="">Seleccione un estado</option>
            {estadosMexico.map(estado => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
          {errors.estado && <div className="invalid-feedback">{errors.estado}</div>}
        </div>
      </div>
      
      <div className="form-section-users">
        <h3 className="user-section-title">REGISTRE UNO O DOS USUARIOS QUE PODRÁN TENER ACCESO AL GESTOR DE NÓMINAS</h3>
        
        <div className="user-section">
          <h4>USUARIO PRINCIPAL *</h4>
          
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.usuario_principal.email}
              onChange={(e) => handleChange(e, 'usuario_principal')}
              onBlur={(e) => handleBlur(e, 'usuario_principal')}
              className={`form-control ${fieldErrors['usuario_principal.email'] ? 'is-invalid' : ''}`}
              placeholder="ejemplo@empresa.com"
            />
            {errors['usuario_principal.email'] && <div className="invalid-feedback">{errors['usuario_principal.email']}</div>}
          </div>
          
          <div className="form-group">
            <label>Contraseña *</label>
            <input
              type="password"
              name="password"
              value={formData.usuario_principal.password}
              onChange={(e) => handleChange(e, 'usuario_principal')}
              onBlur={(e) => handleBlur(e, 'usuario_principal')}
              className={`form-control ${fieldErrors['usuario_principal.password'] ? 'is-invalid' : ''}`}
              placeholder="Mínimo 8 caracteres"
            />
            {errors['usuario_principal.password'] && <div className="invalid-feedback">{errors['usuario_principal.password']}</div>}
          </div>
          
          <div className="form-group">
            <label>Confirmar Contraseña *</label>
            <input
              type="password"
              name="confirm_password"
              value={formData.usuario_principal.confirm_password}
              onChange={(e) => handleChange(e, 'usuario_principal')}
              onBlur={(e) => handleBlur(e, 'usuario_principal')}
              className={`form-control ${fieldErrors['usuario_principal.confirm_password'] ? 'is-invalid' : ''}`}
              placeholder="Repita la contraseña"
            />
            {errors['usuario_principal.confirm_password'] && <div className="invalid-feedback">{errors['usuario_principal.confirm_password']}</div>}
          </div>
        </div>
        
        {!showSecondUser ? (
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => setShowSecondUser(true)}
          >
            + Agregar Usuario Secundario (Opcional)
          </button>
        ) : (
          <div className="user-section">
            <h4>USUARIO SECUNDARIO (Opcional)</h4>
            
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.usuario_secundario.email}
                onChange={(e) => handleChange(e, 'usuario_secundario')}
                onBlur={(e) => handleBlur(e, 'usuario_secundario')}
                className={`form-control ${fieldErrors['usuario_secundario.email'] ? 'is-invalid' : ''}`}
                placeholder="ejemplo@empresa.com (opcional)"
              />
              {errors['usuario_secundario.email'] && <div className="invalid-feedback">{errors['usuario_secundario.email']}</div>}
            </div>
            
            <div className="form-group">
              <label>Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.usuario_secundario.password}
                onChange={(e) => handleChange(e, 'usuario_secundario')}
                onBlur={(e) => handleBlur(e, 'usuario_secundario')}
                className={`form-control ${fieldErrors['usuario_secundario.password'] ? 'is-invalid' : ''}`}
                placeholder="Mínimo 8 caracteres (opcional)"
              />
              {errors['usuario_secundario.password'] && <div className="invalid-feedback">{errors['usuario_secundario.password']}</div>}
            </div>
            
            <div className="form-group">
              <label>Confirmar Contraseña</label>
              <input
                type="password"
                name="confirm_password"
                value={formData.usuario_secundario.confirm_password}
                onChange={(e) => handleChange(e, 'usuario_secundario')}
                onBlur={(e) => handleBlur(e, 'usuario_secundario')}
                className={`form-control ${fieldErrors['usuario_secundario.confirm_password'] ? 'is-invalid' : ''}`}
                placeholder="Repita la contraseña (opcional)"
              />
              {errors['usuario_secundario.confirm_password'] && <div className="invalid-feedback">{errors['usuario_secundario.confirm_password']}</div>}
            </div>
            
            <button 
              type="button" 
              className="btn btn-outline-danger"
              onClick={() => {
                setShowSecondUser(false);
                setFormData(prev => ({
                  ...prev,
                  usuario_secundario: {
                    email: '',
                    password: '',
                    confirm_password: ''
                  }
                }));
                // Limpiar errores del usuario secundario
                setErrors(prev => {
                  const newErrors = { ...prev };
                  Object.keys(newErrors).forEach(key => {
                    if (key.startsWith('usuario_secundario')) {
                      delete newErrors[key];
                    }
                  });
                  return newErrors;
                });
              }}
            >
              Eliminar Usuario Secundario
            </button>
          </div>
        )}
        
        <button 
          type="submit" 
          className="btn btn-primary btn-block mt-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <span className="loading-indicator">⏳</span> Registrando...
            </>
          ) : (
            'Registrar Empresa y Usuario(s)'
          )}
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;