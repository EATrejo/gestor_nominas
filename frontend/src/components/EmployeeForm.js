import React, { useState } from 'react';
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
  Select
} from '@mui/material';

const EmployeeForm = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_ingreso: '',
    nss: '',
    rfc: '',
    tipo_nomina: '',
    salario_diario: '',
    sueldo_mensual: '',
    dias_descanso: '',
    dias_descanso_asignados: [],
    zona_salarial: 'General'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = () => {
    // Formatear fecha al formato YYYY-MM-DD esperado por el backend
    const formattedData = {
      ...formData,
      fecha_ingreso: formData.fecha_ingreso.replace(/\//g, '-')
    };
    onSave(formattedData);
    onClose();
  };

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
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Apellido Paterno"
              name="apellido_paterno"
              value={formData.apellido_paterno}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Apellido Materno"
              name="apellido_materno"
              value={formData.apellido_materno}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Fecha de Ingreso (YYYY/MM/DD)"
              name="fecha_ingreso"
              value={formData.fecha_ingreso}
              onChange={handleChange}
              placeholder="2024/01/15"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="NSS"
              name="nss"
              value={formData.nss}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="RFC"
              name="rfc"
              value={formData.rfc}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Nómina</InputLabel>
              <Select
                name="tipo_nomina"
                value={formData.tipo_nomina}
                label="Tipo de Nómina"
                onChange={handleChange}
              >
                <MenuItem value="SEMANAL">Semanal</MenuItem>
                <MenuItem value="QUINCENAL">Quincenal</MenuItem>
                <MenuItem value="MENSUAL">Mensual</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          {/* Agregar más campos según sea necesario */}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSubmit} variant="contained">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeForm;