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
  Typography
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

  const diasSemana = [
    { value: 0, label: 'Lunes' },
    { value: 1, label: 'Martes' },
    { value: 2, label: 'Miércoles' },
    { value: 3, label: 'Jueves' },
    { value: 4, label: 'Viernes' },
    { value: 5, label: 'Sábado' },
    { value: 6, label: 'Domingo' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    // Preparar datos según el tipo de nómina
    const datosParaEnviar = {
      nombre: formData.nombre,
      apellido_paterno: formData.apellido_paterno,
      apellido_materno: formData.apellido_materno,
      fecha_ingreso: formData.fecha_ingreso.replace(/\//g, '-'),
      nss: formData.nss,
      rfc: formData.rfc,
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
    }
  }, [open, empresaId]);

  return (
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
              required
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
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
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
  );
};

export default EmployeeForm;