import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Box,
  Typography,
  Alert
} from '@mui/material';

const EmployeeEditDialog = ({ open, onClose, employee, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_ingreso: '',
    nss: '',
    rfc: '',
    periodo_nominal: 'MENSUAL',
    sueldo_mensual: '',
    salario_diario: '',
    dias_descanso: [],
    zona_salarial: 'general'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (employee) {
      console.log('📋 Datos del empleado recibidos:', employee);
      
      // Asegurar que dias_descanso siempre sea un array
      let safeDiasDescanso = [];
      if (employee.dias_descanso) {
        if (Array.isArray(employee.dias_descanso)) {
          safeDiasDescanso = employee.dias_descanso.map(dia => parseInt(dia));
        } else if (typeof employee.dias_descanso === 'string' || typeof employee.dias_descanso === 'number') {
          safeDiasDescanso = [parseInt(employee.dias_descanso)];
        }
      }

      // Convertir números a string para los campos de formulario
      setFormData({
        nombre: employee.nombre || '',
        apellido_paterno: employee.apellido_paterno || '',
        apellido_materno: employee.apellido_materno || '',
        fecha_ingreso: employee.fecha_ingreso ? formatDateForInput(employee.fecha_ingreso) : '',
        nss: employee.nss || '',
        rfc: employee.rfc || '',
        periodo_nominal: employee.periodo_nominal || 'MENSUAL',
        sueldo_mensual: employee.sueldo_mensual ? employee.sueldo_mensual.toString() : '',
        salario_diario: employee.salario_diario ? employee.salario_diario.toString() : '',
        dias_descanso: safeDiasDescanso,
        zona_salarial: employee.zona_salarial || 'general'
      });
    }
  }, [employee]);

  const formatDateForInput = (dateString) => {
    // Convertir fecha de formato YYYY-MM-DD a formato input date
    if (dateString.includes('/')) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
    return dateString;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error cuando el usuario empiece a escribir
    if (error) {
      setError('');
    }
  };

  const handleDiasDescansoChange = (event) => {
    const { value } = event.target;
    // Asegurar que siempre sea un array de números
    const newValue = Array.isArray(value) ? value : [value];
    const numericValue = newValue.filter(dia => dia !== '').map(dia => parseInt(dia));
    
    setFormData(prev => ({
      ...prev,
      dias_descanso: numericValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validaciones
      if (!formData.nombre || !formData.apellido_paterno) {
        setError('Nombre y apellido paterno son requeridos');
        setLoading(false);
        return;
      }

      if (!formData.nss || formData.nss.length !== 11) {
        setError('El NSS debe tener 11 dígitos');
        setLoading(false);
        return;
      }

      if (!formData.rfc || formData.rfc.length < 12) {
        setError('El RFC debe tener al menos 12 caracteres');
        setLoading(false);
        return;
      }

      if (!formData.fecha_ingreso) {
        setError('La fecha de ingreso es requerida');
        setLoading(false);
        return;
      }

      // Validación de salarios según periodo
      if (formData.periodo_nominal === 'MENSUAL') {
        if (!formData.sueldo_mensual || parseFloat(formData.sueldo_mensual) <= 0) {
          setError('El sueldo mensual es requerido para periodo MENSUAL');
          setLoading(false);
          return;
        }
      } else {
        if (!formData.salario_diario || parseFloat(formData.salario_diario) <= 0) {
          setError('El salario diario es requerido para periodo SEMANAL/QUINCENAL');
          setLoading(false);
          return;
        }
      }

      // Preparar datos para enviar
      const dataToSend = {
        ...formData,
        sueldo_mensual: formData.periodo_nominal === 'MENSUAL' ? parseFloat(formData.sueldo_mensual) : null,
        salario_diario: formData.periodo_nominal !== 'MENSUAL' ? parseFloat(formData.salario_diario) : null,
        dias_descanso: formData.dias_descanso || []
      };

      console.log('📤 Enviando datos:', dataToSend);

      const success = await onSave(employee.id, dataToSend);
      if (success) {
        onClose();
      }
    } catch (err) {
      setError('Error al procesar el formulario: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const diasSemana = [
    { value: 0, label: 'Lunes' },
    { value: 1, label: 'Martes' },
    { value: 2, label: 'Miércoles' },
    { value: 3, label: 'Jueves' },
    { value: 4, label: 'Viernes' },
    { value: 5, label: 'Sábado' },
    { value: 6, label: 'Domingo' }
  ];

  const periodosNominales = [
    { value: 'MENSUAL', label: 'Mensual' },
    { value: 'QUINCENAL', label: 'Quincenal' },
    { value: 'SEMANAL', label: 'Semanal' }
  ];

  const zonasSalariales = [
    { value: 'general', label: 'General' },
    { value: 'frontera', label: 'Frontera' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          <Typography variant="h6" component="div">
            Editar Empleado
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {employee ? `${employee.nombre} ${employee.apellido_paterno}` : 'Nuevo empleado'}
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido Paterno"
                name="apellido_paterno"
                value={formData.apellido_paterno}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido Materno"
                name="apellido_materno"
                value={formData.apellido_materno}
                onChange={handleChange}
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Ingreso"
                name="fecha_ingreso"
                type="date"
                value={formData.fecha_ingreso}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                required
                disabled={loading}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="NSS"
                name="nss"
                value={formData.nss}
                onChange={handleChange}
                required
                inputProps={{ maxLength: 11 }}
                disabled={loading}
                helperText="11 dígitos numéricos"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RFC"
                name="rfc"
                value={formData.rfc}
                onChange={handleChange}
                required
                disabled={loading}
                helperText="Formato: ABCD123456XYZ"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Periodo Nominal</InputLabel>
                <Select
                  name="periodo_nominal"
                  value={formData.periodo_nominal}
                  onChange={handleChange}
                  label="Periodo Nominal"
                  disabled={loading}
                >
                  {periodosNominales.map((periodo) => (
                    <MenuItem key={periodo.value} value={periodo.value}>
                      {periodo.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Zona Salarial</InputLabel>
                <Select
                  name="zona_salarial"
                  value={formData.zona_salarial}
                  onChange={handleChange}
                  label="Zona Salarial"
                  disabled={loading}
                >
                  {zonasSalariales.map((zona) => (
                    <MenuItem key={zona.value} value={zona.value}>
                      {zona.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            {formData.periodo_nominal === 'MENSUAL' ? (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sueldo Mensual"
                  name="sueldo_mensual"
                  type="number"
                  value={formData.sueldo_mensual}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  inputProps={{ step: "0.01", min: "0" }}
                  helperText="Sueldo mensual neto"
                />
              </Grid>
            ) : (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Salario Diario"
                  name="salario_diario"
                  type="number"
                  value={formData.salario_diario}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  inputProps={{ step: "0.01", min: "0" }}
                  helperText="Salario diario integrado"
                />
              </Grid>
            )}
            
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Días de Descanso</InputLabel>
                <Select
                  multiple
                  name="dias_descanso"
                  value={formData.dias_descanso || []}
                  onChange={handleDiasDescansoChange}
                  label="Días de Descanso"
                  disabled={loading}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip 
                          key={value} 
                          label={diasSemana.find(dia => dia.value === value)?.label || value} 
                          size="small" 
                        />
                      ))}
                      {selected.length === 0 && 'Ningún día seleccionado'}
                    </Box>
                  )}
                >
                  {diasSemana.map((dia) => (
                    <MenuItem key={dia.value} value={dia.value}>
                      {dia.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EmployeeEditDialog;