import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
  Chip,
  Alert
} from '@mui/material';
import api from '../services/api';

const AbsenceRegister = ({ open, onClose, employees, onRegister }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [absences, setAbsences] = useState([{ fecha: '', motivo: '' }]);
  const [absenceType, setAbsenceType] = useState('injustificada');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [successRegistered, setSuccessRegistered] = useState(false);

  // Efecto para cerrar automáticamente después de un registro exitoso
  useEffect(() => {
    if (successRegistered) {
      const timer = setTimeout(() => {
        // Función para manejar el cierre después de éxito
        const handleAutoClose = () => {
          setResult(null);
          setSuccessRegistered(false);
          setAbsences([{ fecha: '', motivo: '' }]);
          setSelectedEmployee('');
          setAbsenceType('injustificada');
          setError(null);
          onClose(); // Cerrar el diálogo principal
        };
        
        handleAutoClose();
      }, 2000); // Cerrar después de 2 segundos
      
      return () => clearTimeout(timer);
    }
  }, [successRegistered, onClose]); // Added onClose to dependencies

  const addAbsenceField = () => {
    if (absences.length < 5) {
      setAbsences([...absences, { fecha: '', motivo: '' }]);
    }
  };

  const removeAbsenceField = (index) => {
    if (absences.length > 1) {
      const newAbsences = [...absences];
      newAbsences.splice(index, 1);
      setAbsences(newAbsences);
    }
  };

  const handleAbsenceChange = (index, field, value) => {
    const newAbsences = [...absences];
    newAbsences[index][field] = value;
    setAbsences(newAbsences);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      setError('Debe seleccionar un empleado');
      return;
    }

    const fechasFaltas = absences
      .map(absence => absence.fecha)
      .filter(fecha => fecha !== '');

    if (fechasFaltas.length === 0) {
      setError('Debe ingresar al menos una fecha de falta');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSuccessRegistered(false);

    try {
      const token = localStorage.getItem('token');
      const response = await api.post(
        `/empleados/${selectedEmployee}/faltas/registrar-faltas/`,
        {
          fechas_faltas: fechasFaltas,
          tipo_falta: absenceType,
          motivos: absences.map(absence => absence.motivo).filter(motivo => motivo !== '')
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        setResult(response.data);
        setSuccessRegistered(true);
        
        // Limpiar formulario después de éxito
        setTimeout(() => {
          setAbsences([{ fecha: '', motivo: '' }]);
          setSelectedEmployee('');
        }, 2000);
        
        // Notificar al componente padre si es necesario
        if (onRegister) {
          onRegister(selectedEmployee, response.data);
        }
      }
    } catch (err) {
      console.error('Error registrando faltas:', err);
      setError(err.response?.data?.error || 'Error al registrar faltas');
    } finally {
      setLoading(false);
    }
  };

  // Función para manejar el cierre después de éxito (cuando se hace clic en OK)
  const handleSuccessClose = () => {
    setResult(null);
    setSuccessRegistered(false);
    setAbsences([{ fecha: '', motivo: '' }]);
    setSelectedEmployee('');
    setAbsenceType('injustificada');
    setError(null);
    onClose(); // Cerrar el diálogo principal
  };

  const handleClose = () => {
    setAbsences([{ fecha: '', motivo: '' }]);
    setSelectedEmployee('');
    setAbsenceType('injustificada');
    setError(null);
    setResult(null);
    setSuccessRegistered(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center">
          <Typography variant="h6" component="span">
            Registrar Faltas
          </Typography>
          <Chip 
            label={absenceType === 'injustificada' ? 
              'Faltas Injustificadas' : 
              'Faltas Justificadas - Día de asueto'} 
            color={absenceType === 'injustificada' ? 'error' : 'success'}
            size="small"
            sx={{ ml: 2 }}
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Selector de tipo de falta */}
          <Grid item xs={12}>
            <FormControl fullWidth>
              <InputLabel>Tipo de Falta</InputLabel>
              <Select
                value={absenceType}
                onChange={(e) => setAbsenceType(e.target.value)}
                label="Tipo de Falta"
              >
                <MenuItem value="injustificada">
                  <Box display="flex" alignItems="center">
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        backgroundColor: '#d32f2f', 
                        borderRadius: '50%',
                        mr: 1 
                      }} 
                    />
                    Falta Injustificada (con descuento)
                  </Box>
                </MenuItem>
                <MenuItem value="justificada">
                  <Box display="flex" alignItems="center">
                    <Box 
                      sx={{ 
                        width: 12, 
                        height: 12, 
                        backgroundColor: '#2e7d32', 
                        borderRadius: '50%',
                        mr: 1 
                      }} 
                    />
                    Falta Justificada (Día de asueto concedido por la empresa)
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Selector de empleado */}
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Seleccionar Empleado"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.nombre} {employee.apellido_paterno} - {employee.rfc}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Campos de faltas */}
          {absences.map((absence, index) => (
            <React.Fragment key={index}>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label={`Fecha de Falta ${index + 1}`}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={absence.fecha}
                  onChange={(e) => handleAbsenceChange(index, 'fecha', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={5}>
                <TextField
                  fullWidth
                  label={`Motivo ${index + 1}`}
                  value={absence.motivo}
                  onChange={(e) => handleAbsenceChange(index, 'motivo', e.target.value)}
                  placeholder="Opcional"
                />
              </Grid>
              <Grid item xs={12} sm={2}>
                <Button 
                  onClick={() => removeAbsenceField(index)}
                  disabled={absences.length <= 1}
                  color="error"
                >
                  Eliminar
                </Button>
              </Grid>
            </React.Fragment>
          ))}

          {/* Botón para agregar más faltas */}
          {absences.length < 5 && (
            <Grid item xs={12}>
              <Button onClick={addAbsenceField} variant="outlined" fullWidth>
                + Agregar otra falta
              </Button>
            </Grid>
          )}

          {/* Mensajes de error */}
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          {/* Resultado exitoso */}
          {result && (
            <Grid item xs={12}>
              <Alert 
                severity="success"
                action={
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={handleSuccessClose}
                  >
                    OK
                  </Button>
                }
              >
                <Typography variant="subtitle2" gutterBottom>
                  ✅ {result.message}
                </Typography>
                <Typography variant="body2">
                  Empleado: {result.nombre} {result.apellido_paterno}
                </Typography>
                <Typography variant="body2">
                  Faltas registradas: {result.faltas_registradas}
                </Typography>
                {result.descuento_total > 0 && (
                  <Typography variant="body2">
                    Descuento total: ${result.descuento_total.toFixed(2)}
                  </Typography>
                )}
              </Alert>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading || successRegistered}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit}
          variant="contained" 
          disabled={loading || !selectedEmployee || successRegistered}
        >
          {loading ? 'Registrando...' : 'Registrar Faltas'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AbsenceRegister;