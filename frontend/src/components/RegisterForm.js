import React, { useState, useEffect } from 'react';
import { register } from '../auth/authServices';

const RegisterForm = ({ onSuccess, initialBusinessType }) => {
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
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validar campos de empresa
    const requiredCompanyFields = ['nombre', 'giro', 'cantidad_empleados', 'ciudad', 'estado'];
    requiredCompanyFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'Este campo es requerido';
      }
    });
    
    if (formData.cantidad_empleados && isNaN(formData.cantidad_empleados)) {
      newErrors.cantidad_empleados = 'Debe ser un número válido';
    } else if (formData.cantidad_empleados && parseInt(formData.cantidad_empleados) < 1) {
      newErrors.cantidad_empleados = 'Debe ser al menos 1';
    }
    
    // Validar usuario principal
    if (!formData.usuario_principal.email) {
      newErrors['usuario_principal.email'] = 'Email requerido';
    } else if (!/\S+@\S+\.\S+/.test(formData.usuario_principal.email)) {
      newErrors['usuario_principal.email'] = 'Email no válido';
    }
    
    if (!formData.usuario_principal.password) {
      newErrors['usuario_principal.password'] = 'Contraseña requerida';
    } else if (formData.usuario_principal.password.length < 8) {
      newErrors['usuario_principal.password'] = 'Mínimo 8 caracteres';
    }
    
    if (formData.usuario_principal.password !== formData.usuario_principal.confirm_password) {
      newErrors['usuario_principal.confirm_password'] = 'Las contraseñas no coinciden';
    }
    
    // Validar usuario secundario si está visible y tiene datos
    if (showSecondUser) {
      const hasData = formData.usuario_secundario.email || 
                     formData.usuario_secundario.password || 
                     formData.usuario_secundario.confirm_password;
      
      if (hasData) {
        if (!formData.usuario_secundario.email) {
          newErrors['usuario_secundario.email'] = 'Email requerido';
        } else if (!/\S+@\S+\.\S+/.test(formData.usuario_secundario.email)) {
          newErrors['usuario_secundario.email'] = 'Email no válido';
        }
        
        if (!formData.usuario_secundario.password) {
          newErrors['usuario_secundario.password'] = 'Contraseña requerida';
        } else if (formData.usuario_secundario.password.length < 8) {
          newErrors['usuario_secundario.password'] = 'Mínimo 8 caracteres';
        }
        
        if (formData.usuario_secundario.password !== formData.usuario_secundario.confirm_password) {
          newErrors['usuario_secundario.confirm_password'] = 'Las contraseñas no coinciden';
        }
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');
    
    if (!validateForm()) return;
    
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
      setApiError('Error al conectar con el servidor');
      console.error('Error en RegisterForm:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      {apiError && <div className="alert alert-danger">{apiError}</div>}
      
      <div className="form-section-company">
        <div className="form-group">
          <label>Nombre de la Empresa/Compañía *</label>
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={`form-control ${errors.nombre ? 'is-invalid' : ''}`}
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
            className={`form-control ${errors.giro ? 'is-invalid' : ''}`}
            readOnly={!!initialBusinessType}
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
            min="1"
            className={`form-control ${errors.cantidad_empleados ? 'is-invalid' : ''}`}
          />
          {errors.cantidad_empleados && <div className="invalid-feedback">{errors.cantidad_empleados}</div>}
        </div>
        
        <div className="form-group">
          <label>Ciudad *</label>
          <input
            type="text"
            name="ciudad"
            value={formData.ciudad}
            onChange={handleChange}
            className={`form-control ${errors.ciudad ? 'is-invalid' : ''}`}
          />
          {errors.ciudad && <div className="invalid-feedback">{errors.ciudad}</div>}
        </div>
        
        <div className="form-group">
          <label>Estado *</label>
          <input
            type="text"
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            className={`form-control ${errors.estado ? 'is-invalid' : ''}`}
          />
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
              className={`form-control ${errors['usuario_principal.email'] ? 'is-invalid' : ''}`}
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
              className={`form-control ${errors['usuario_principal.password'] ? 'is-invalid' : ''}`}
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
              className={`form-control ${errors['usuario_principal.confirm_password'] ? 'is-invalid' : ''}`}
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
                className={`form-control ${errors['usuario_secundario.email'] ? 'is-invalid' : ''}`}
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
                className={`form-control ${errors['usuario_secundario.password'] ? 'is-invalid' : ''}`}
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
                className={`form-control ${errors['usuario_secundario.confirm_password'] ? 'is-invalid' : ''}`}
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
          {isSubmitting ? 'Registrando...' : 'Registrar Empresa y Usuario(s)'}
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;