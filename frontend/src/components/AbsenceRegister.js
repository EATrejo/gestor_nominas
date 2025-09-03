import React, { useState, useEffect, useCallback } from 'react';
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
  Box,
  Typography,
  Chip,
  Alert,
  Checkbox,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  CircularProgress,
  RadioGroup,
  Radio,
  FormLabel
} from '@mui/material';
import api from './../services/api';

const AbsenceRegister = ({ open, onClose, employees, onRegister }) => {
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [absences, setAbsences] = useState([{ fecha: '', motivo: '' }]);
  const [absenceType, setAbsenceType] = useState('injustificada');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [successRegistered, setSuccessRegistered] = useState(false);
  const [employeeList, setEmployeeList] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const handleAutoClose = useCallback(() => {
    setResult(null);
    setSuccessRegistered(false);
    setAbsences([{ fecha: '', motivo: '' }]);
    setSelectedEmployees([]);
    setSelectAll(false);
    setAbsenceType('injustificada');
    setError(null);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (open && (!employees || employees.length === 0)) {
      fetchEmployees();
    } else if (employees && employees.length > 0) {
      setEmployeeList(employees);
    }
  }, [open, employees]);

  useEffect(() => {
    if (successRegistered) {
      const timer = setTimeout(() => {
        handleAutoClose();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [successRegistered, handleAutoClose]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/empleados/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setEmployeeList(response.data);
    } catch (err) {
      console.error('Error cargando empleados:', err);
      setError('Error al cargar la lista de empleados');
    } finally {
      setLoadingEmployees(false);
    }
  };

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

  const handleSelectAll = (event) => {
    const isSelected = event.target.checked;
    setSelectAll(isSelected);
    
    if (isSelected) {
      setSelectedEmployees(employeeList.map(emp => emp.id));
    } else {
      setSelectedEmployees([]);
    }
  };

  const handleSelectEmployee = (employeeId) => {
    const selectedIndex = selectedEmployees.indexOf(employeeId);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = [...selectedEmployees, employeeId];
    } else {
      newSelected = selectedEmployees.filter(id => id !== employeeId);
    }

    setSelectedEmployees(newSelected);
    setSelectAll(newSelected.length === employeeList.length);
  };

  const getMotivoDinamico = () => {
    const motivos = absences
      .map(absence => absence.motivo)
      .filter(motivo => motivo && motivo.trim() !== '');
    
    if (motivos.length === 0) {
      return absenceType === 'justificada' ? 'Asueto concedido por la empresa' : 'Falta registrada';
    }
    
    if (new Set(motivos).size > 1) {
      return motivos.map((motivo, index) => `Motivo ${index + 1}: ${motivo}`).join('; ');
    }
    
    return motivos[0];
  };

  const handleSubmit = async () => {
    if (selectedEmployees.length === 0) {
      setError('Debe seleccionar al menos un empleado');
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
      const motivoDinamico = getMotivoDinamico();
      
      if (absenceType === 'justificada') {
        try {
          await api.post(
            `/faltas/registrar-multiples/`,
            {
              empleados: selectedEmployees,
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

          const fechasFormateadas = fechasFaltas.map(fecha => {
            const [year, month, day] = fecha.split('-');
            return `${day}/${month}/${year}`;
          }).join(', ');
          
          const resultData = {
            success: true,
            message: `✅ Faltas justificadas registradas exitosamente a todos los empleados`,
            detalle: {
              motivo: motivoDinamico,
              fechas: fechasFormateadas,
              empleados_afectados: selectedEmployees.length,
              tipo: 'JUSTIFICADA - Día de asueto'
            }
          };
          
          setResult(resultData);
          setSuccessRegistered(true);
          
          if (onRegister) {
            onRegister(selectedEmployees, resultData);
          }

        } catch (err) {
          console.error('Error en endpoint múltiple:', err);
          
          // ✅ ERROR YA NORMALIZADO POR EL INTERCEPTOR
          setError(err.message);
          
          if (onRegister) {
            onRegister(selectedEmployees, {
              success: false,
              message: err.message
            });
          }
        }
      } else {
        await registrarFaltasIndividuales(fechasFaltas, absenceType, motivoDinamico);
      }

    } catch (err) {
      console.error('Error registrando faltas:', err);
      
      // ✅ ERROR YA NORMALIZADO POR EL INTERCEPTOR
      setError(err.message);
      
      if (onRegister) {
        onRegister(selectedEmployees, {
          success: false,
          message: err.message
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const registrarFaltasIndividuales = async (fechasFaltas, tipoFalta, motivoDinamico) => {
    const token = localStorage.getItem('token');
    const resultados = [];
    let empleadosExitosos = 0;
    let totalFaltasRegistradas = 0;
    let erroresEspecificos = [];

    for (const empleadoId of selectedEmployees) {
      try {
        const response = await api.post(
          `/empleados/${empleadoId}/faltas/registrar-faltas/`,
          {
            fechas_faltas: fechasFaltas,
            tipo_falta: tipoFalta,
            motivos: absences.map(absence => absence.motivo).filter(motivo => motivo !== '')
          },
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.data && response.data.success) {
          empleadosExitosos++;
          totalFaltasRegistradas += response.data.faltas_registradas || 0;
          resultados.push({
            empleadoId,
            success: true,
            data: response.data
          });
        }
      } catch (err) {
        console.error(`Error registrando faltas para empleado ${empleadoId}:`, err);
        
        // ✅ ERROR YA NORMALIZADO POR EL INTERCEPTOR
        erroresEspecificos.push(`Empleado ID ${empleadoId}: ${err.message}`);
        
        resultados.push({
          empleadoId,
          success: false,
          error: err.message
        });
      }
    }

    if (erroresEspecificos.length > 0) {
      const errorMessage = erroresEspecificos.join('\n\n');
      setError(errorMessage);
      
      if (onRegister) {
        onRegister(selectedEmployees, {
          success: false,
          message: errorMessage
        });
      }
      return;
    }

    const resultData = {
      success: empleadosExitosos > 0,
      message: empleadosExitosos === selectedEmployees.length 
        ? `Faltas ${tipoFalta === 'justificada' ? 'justificadas' : 'injustificadas'} registradas correctamente para ${empleadosExitosos} empleados` 
        : `Faltas registradas para ${empleadosExitosos} de ${selectedEmployees.length} empleados`,
      empleados_afectados: empleadosExitosos,
      faltas_registradas: totalFaltasRegistradas,
      resultados_individuales: resultados,
      total_empleados: selectedEmployees.length,
      tipo: tipoFalta === 'justificada' ? 'JUSTIFICADA - Día de asueto' : 'INJUSTIFICADA - Con descuento',
      detalle: {
        motivo: motivoDinamico,
        fechas: fechasFaltas.map(fecha => {
          const [year, month, day] = fecha.split('-');
          return `${day}/${month}/${year}`;
        }).join(', ')
      }
    };

    setResult(resultData);
    setSuccessRegistered(empleadosExitosos > 0);
    
    if (onRegister && empleadosExitosos > 0) {
      onRegister(selectedEmployees, resultData);
    }
  };

  const handleSuccessClose = () => {
    handleAutoClose();
  };

  const handleClose = () => {
    setAbsences([{ fecha: '', motivo: '' }]);
    setSelectedEmployees([]);
    setSelectAll(false);
    setAbsenceType('injustificada');
    setError(null);
    setResult(null);
    setSuccessRegistered(false);
    onClose();
  };

  const renderEmployeeSelection = () => {
    if (absenceType === 'justificada') {
      return (
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Seleccionar Empleados para Faltas Justificadas
            </Typography>
            
            {loadingEmployees ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectAll}
                      onChange={handleSelectAll}
                      indeterminate={selectedEmployees.length > 0 && selectedEmployees.length < employeeList.length}
                    />
                  }
                  label="Seleccionar todos los empleados"
                />
                
                <Divider sx={{ my: 1 }} />
                
                <List sx={{ maxHeight: 200, overflow: 'auto' }}>
                  {employeeList.map((employee) => (
                    <ListItem key={employee.id} dense>
                      <ListItemIcon>
                        <Checkbox
                          edge="start"
                          checked={selectedEmployees.indexOf(employee.id) !== -1}
                          onChange={() => handleSelectEmployee(employee.id)}
                          tabIndex={-1}
                          disableRipple
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={`${employee.nombre} ${employee.apellido_paterno || ''}`} 
                        secondary={`ID: ${employee.id} - ${employee.rfc || 'Sin RFC'}`}
                      />
                    </ListItem>
                  ))}
                </List>
                
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Empleados seleccionados: {selectedEmployees.length} de {employeeList.length}
                </Typography>
              </>
            )}
          </Paper>
        </Grid>
      );
    } else {
      return (
        <Grid item xs={12}>
          <TextField
            select
            fullWidth
            label="Seleccionar Empleado"
            value={selectedEmployees[0] || ''}
            onChange={(e) => setSelectedEmployees([e.target.value])}
          >
            {employeeList.map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.nombre} {employee.apellido_paterno} - {employee.rfc}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      );
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6" component="span">
            Registrar Faltas
          </Typography>
          <Chip 
            label={absenceType === 'injustificada' ? 
              'Faltas Injustificadas' : 
              'Faltas Justificadas - Día de asueto'} 
            color={absenceType === 'injustificada' ? 'error' : 'success'}
            size="small"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend">Tipo de Falta</FormLabel>
              <RadioGroup
                row
                value={absenceType}
                onChange={(e) => {
                  setAbsenceType(e.target.value);
                  setSelectedEmployees([]);
                  setSelectAll(false);
                }}
              >
                <FormControlLabel 
                  value="injustificada" 
                  control={<Radio />} 
                  label={
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
                  } 
                />
                <FormControlLabel 
                  value="justificada" 
                  control={<Radio />} 
                  label={
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
                  } 
                />
              </RadioGroup>
            </FormControl>
          </Grid>

          {renderEmployeeSelection()}

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
                  placeholder={absenceType === 'justificada' ? 'Asueto concedido por la empresa' : 'Opcional'}
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

          {absences.length < 5 && (
            <Grid item xs={12}>
              <Button onClick={addAbsenceField} variant="outlined" fullWidth>
                + Agregar otra falta
              </Button>
            </Grid>
          )}

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">
                <Typography variant="subtitle2" gutterBottom>
                  Error al registrar faltas:
                </Typography>
                <Typography variant="body2" style={{ whiteSpace: 'pre-line' }}>
                  {error}
                </Typography>
              </Alert>
            </Grid>
          )}

          {result && result.success && (
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
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  {result.message}
                </Typography>
                
                {result.detalle && (
                  <>
                    <Typography variant="body2">
                      <strong>Motivo:</strong> {result.detalle.motivo}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Fechas:</strong> {result.detalle.fechas}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Empleados afectados:</strong> {result.detalle.empleados_afectados}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Tipo:</strong> {result.detalle.tipo}
                    </Typography>
                  </>
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
          disabled={loading || selectedEmployees.length === 0 || successRegistered}
        >
          {loading ? 'Registrando...' : 'Registrar Faltas'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AbsenceRegister;