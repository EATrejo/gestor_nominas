import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Grid,
  FormControl,
  InputLabel,
  Select,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Typography,
  Alert,
  Snackbar
} from '@mui/material';

const EmployeeForm = ({ open, onClose, onSave, empresaId }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_ingreso: '',
    nss: '',
    rfc: '',
    periodo_nominal: '',
    salario_diario: '',
    sueldo_mensual: '',
    dias_descanso: [],
    zona_salarial: 'general',
    empresa: empresaId
  });

  const [errors, setErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'error' });

  const diasSemana = [
    { value: 0, label: 'Lunes' },
    { value: 1, label: 'Martes' },
    { value: 2, label: 'Miércoles' },
    { value: 3, label: 'Jueves' },
    { value: 4, label: 'Viernes' },
    { value: 5, label: 'Sábado' },
    { value: 6, label: 'Domingo' }
  ];

  const showError = (message) => {
    setSnackbar({ open: true, message, severity: 'error' });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const validateForm = () => {
    const newErrors = {};

    // Validación de campos requeridos (EXCLUYENDO RFC)
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.apellido_paterno.trim()) newErrors.apellido_paterno = 'El apellido paterno es requerido';
    if (!formData.apellido_materno.trim()) newErrors.apellido_materno = 'El apellido materno es requerido';
    if (!formData.fecha_ingreso.trim()) newErrors.fecha_ingreso = 'La fecha de ingreso es requerida';
    if (!formData.nss.trim()) newErrors.nss = 'El NSS es requerido';
    if (!formData.periodo_nominal) newErrors.periodo_nominal = 'El periodo nominal es requerido';

    // Validación de formato de fecha
    if (formData.fecha_ingreso && !/^\d{4}-\d{2}-\d{2}$/.test(formData.fecha_ingreso)) {
      newErrors.fecha_ingreso = 'Formato de fecha inválido (YYYY-MM-DD)';
    }

    // Validación de NSS (11 dígitos)
    if (formData.nss && !/^\d{11}$/.test(formData.nss.replace(/\s/g, ''))) {
      newErrors.nss = 'El NSS debe tener 11 dígitos';
    }

    // VALIDACIÓN DE RFC ELIMINADA - el backend se encargará

    // Validación de salarios
    if (formData.periodo_nominal === 'MENSUAL') {
      if (!formData.sueldo_mensual || parseFloat(formData.sueldo_mensual) <= 0) {
        newErrors.sueldo_mensual = 'El sueldo mensual debe ser mayor a 0';
      }
    } else if (formData.periodo_nominal) {
      if (!formData.salario_diario || parseFloat(formData.salario_diario) <= 0) {
        newErrors.salario_diario = 'El salario diario debe ser mayor a 0';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    if (name === 'nss') {
      // Para NSS, solo permitir números y limitar a 11 caracteres
      processedValue = value.replace(/\D/g, '').slice(0, 11);
    }
    // RFC: sin validación ni procesamiento especial
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    // Limpiar error del campo cuando se modifica
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleDiasDescansoChange = (diaValue) => {
    setFormData(prev => {
      const nuevosDias = prev.dias_descanso.includes(diaValue)
        ? prev.dias_descanso.filter(dia => dia !== diaValue)
        : [...prev.dias_descanso, diaValue];
      
      return {
        ...prev,
        dias_descanso: nuevosDias
      };
    });
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      showError('Por favor corrige los errores en el formulario');
      return;
    }

    try {
      // Preparar datos según el tipo de nómina
      const datosParaEnviar = {
        nombre: formData.nombre.trim(),
        apellido_paterno: formData.apellido_paterno.trim(),
        apellido_materno: formData.apellido_materno.trim(),
        fecha_ingreso: formData.fecha_ingreso.replace(/\//g, '-'),
        nss: formData.nss.replace(/\s/g, ''),
        rfc: formData.rfc, // Sin procesamiento especial
        periodo_nominal: formData.periodo_nominal,
        empresa: formData.empresa,
        dias_descanso: formData.dias_descanso,
        zona_salarial: formData.zona_salarial
      };

      // Agregar campos específicos según el tipo de nómina
      if (formData.periodo_nominal === 'MENSUAL') {
        datosParaEnviar.sueldo_mensual = parseFloat(formData.sueldo_mensual);
      } else {
        datosParaEnviar.salario_diario = parseFloat(formData.salario_diario);
      }

      onSave(datosParaEnviar);
    } catch (error) {
      showError('Error al procesar los datos del formulario');
    }
  };

  // Resetear form cuando se cierra
  useEffect(() => {
    if (!open) {
      setFormData({
        nombre: '',
        apellido_paterno: '',
        apellido_materno: '',
        fecha_ingreso: '',
        nss: '',
        rfc: '',
        periodo_nominal: '',
        salario_diario: '',
        sueldo_mensual: '',
        dias_descanso: [],
        zona_salarial: 'general',
        empresa: empresaId
      });
      setErrors({});
    }
  }, [open, empresaId]);

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Dar de Alta Empleado</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nombre"
                name="nombre"
                value={formData.nombre}
                onChange={handleChange}
                error={!!errors.nombre}
                helperText={errors.nombre}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido Paterno"
                name="apellido_paterno"
                value={formData.apellido_paterno}
                onChange={handleChange}
                error={!!errors.apellido_paterno}
                helperText={errors.apellido_paterno}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Apellido Materno"
                name="apellido_materno"
                value={formData.apellido_materno}
                onChange={handleChange}
                error={!!errors.apellido_materno}
                helperText={errors.apellido_materno}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Fecha de Ingreso (YYYY-MM-DD)"
                name="fecha_ingreso"
                value={formData.fecha_ingreso}
                onChange={handleChange}
                placeholder="2024-01-15"
                error={!!errors.fecha_ingreso}
                helperText={errors.fecha_ingreso}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="NSS (11 dígitos)"
                name="nss"
                value={formData.nss}
                onChange={handleChange}
                error={!!errors.nss}
                helperText={errors.nss}
                required
                inputProps={{ maxLength: 11 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="RFC"
                name="rfc"
                value={formData.rfc}
                onChange={handleChange}
                helperText="El backend validará el formato del RFC"
                // Sin validación requerida en frontend
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required error={!!errors.periodo_nominal}>
                <InputLabel>Periodo Nominal</InputLabel>
                <Select
                  name="periodo_nominal"
                  value={formData.periodo_nominal}
                  label="Periodo Nominal"
                  onChange={handleChange}
                >
                  <MenuItem value="SEMANAL">Semanal</MenuItem>
                  <MenuItem value="QUINCENAL">Quincenal</MenuItem>
                  <MenuItem value="MENSUAL">Mensual</MenuItem>
                </Select>
                {errors.periodo_nominal && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                    {errors.periodo_nominal}
                  </Typography>
                )}
              </FormControl>
            </Grid>
            
            {/* Campo de salario según el tipo de nómina */}
            {formData.periodo_nominal === 'MENSUAL' ? (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Sueldo Mensual"
                  name="sueldo_mensual"
                  type="number"
                  value={formData.sueldo_mensual}
                  onChange={handleChange}
                  error={!!errors.sueldo_mensual}
                  helperText={errors.sueldo_mensual}
                  required
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
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
                  error={!!errors.salario_diario}
                  helperText={errors.salario_diario}
                  required={formData.periodo_nominal !== ''}
                  disabled={formData.periodo_nominal === ''}
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                />
              </Grid>
            )}

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Zona Salarial</InputLabel>
                <Select
                  name="zona_salarial"
                  value={formData.zona_salarial}
                  label="Zona Salarial"
                  onChange={handleChange}
                >
                  <MenuItem value="general">General</MenuItem>
                  <MenuItem value="frontera">Frontera</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Días de Descanso
              </Typography>
              <FormGroup row>
                {diasSemana.map(dia => (
                  <FormControlLabel
                    key={dia.value}
                    control={
                      <Checkbox
                        checked={formData.dias_descanso.includes(dia.value)}
                        onChange={() => handleDiasDescansoChange(dia.value)}
                      />
                    }
                    label={dia.label}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            variant="contained"
            disabled={!formData.periodo_nominal}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EmployeeForm;