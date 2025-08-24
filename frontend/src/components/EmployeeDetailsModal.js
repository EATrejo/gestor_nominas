import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Person,
  AssignmentInd,
  DateRange,
  MonetizationOn,
  Event,
  Business,
  Warning,
  CheckCircle,
  ExpandMore,
  ExpandLess,
  CalendarToday
} from '@mui/icons-material';

const EmployeeDetailsModal = ({ open, onClose, employee }) => {
  const [expandedFaltas, setExpandedFaltas] = useState({
    injustificadas: false,
    justificadas: false
  });

  if (!employee) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    try {
      // Dividir la fecha YYYY-MM-DD en partes
      const [year, month, day] = dateString.split('-').map(Number);
      
      // Crear fecha en UTC para evitar problemas de zona horaria
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      
      return dateObj.toLocaleDateString('es-MX', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'No especificado';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getDiasDescansoLabels = (dias) => {
    const diasMap = {
      0: 'Lunes',
      1: 'Martes',
      2: 'Miércoles',
      3: 'Jueves',
      4: 'Viernes',
      5: 'Sábado',
      6: 'Domingo'
    };
    
    if (!dias || !Array.isArray(dias)) return 'No especificados';
    return dias.map(dia => diasMap[dia] || dia).join(', ');
  };

  const handleToggleFaltas = (tipo) => {
    setExpandedFaltas(prev => ({
      ...prev,
      [tipo]: !prev[tipo]
    }));
  };

  // Obtener fechas de faltas - método seguro
  const getFechasFaltas = (tipo) => {
    try {
      // Primero intentar con el formato nuevo
      const fechasNuevo = employee[`fechas_faltas_${tipo}`];
      if (Array.isArray(fechasNuevo)) {
        return fechasNuevo;
      }
      
      // Si no existe, intentar con el formato antiguo de compatibilidad
      const fechasAntiguo = employee.fechas_faltas;
      if (Array.isArray(fechasAntiguo)) {
        return fechasAntiguo;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  };

  // Obtener contadores de faltas - método seguro
  const getContadorFaltas = (tipo) => {
    try {
      // Primero intentar con el campo directo
      const contadorDirecto = employee[`faltas_${tipo}`];
      if (contadorDirecto !== undefined && contadorDirecto !== null) {
        return contadorDirecto;
      }
      
      // Si no existe, calcular desde las fechas
      const fechas = getFechasFaltas(tipo);
      return fechas.length;
    } catch (error) {
      return 0;
    }
  };

  const faltasInjustificadas = getFechasFaltas('injustificadas');
  const faltasJustificadas = getFechasFaltas('justificadas');
  const contadorInjustificadas = getContadorFaltas('injustificadas');
  const contadorJustificadas = getContadorFaltas('justificadas');

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Person color="primary" />
          <Typography variant="h6">
            Detalles del Empleado
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {/* Información Personal */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary">
              <AssignmentInd sx={{ mr: 1, fontSize: 20 }} />
              Información Personal
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Nombre completo
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.nombre} {employee.apellido_paterno} {employee.apellido_materno}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              RFC
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.rfc || 'No especificado'}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              NSS
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.nss || 'No especificado'}
            </Typography>
          </Grid>

          {/* Información Laboral */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              <Business sx={{ mr: 1, fontSize: 20 }} />
              Información Laboral
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              <DateRange sx={{ mr: 1, fontSize: 18 }} />
              Fecha de ingreso
            </Typography>
            <Typography variant="body1" gutterBottom>
              {formatDate(employee.fecha_ingreso)}
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              <Event sx={{ mr: 1, fontSize: 18 }} />
              Periodo nominal
            </Typography>
            <Chip 
              label={employee.periodo_nominal || 'No especificado'} 
              color="primary" 
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              <MonetizationOn sx={{ mr: 1, fontSize: 18 }} />
              {employee.periodo_nominal === 'MENSUAL' ? 'Sueldo mensual' : 'Salario diario'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.periodo_nominal === 'MENSUAL' 
                ? formatCurrency(employee.sueldo_mensual)
                : formatCurrency(employee.salario_diario)
              }
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Zona salarial
            </Typography>
            <Chip 
              label={employee.zona_salarial === 'frontera' ? 'Frontera' : 'General'} 
              color="secondary" 
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12}>
            <Typography variant="subtitle2" color="textSecondary">
              Días de descanso
            </Typography>
            <Typography variant="body1" gutterBottom>
              {getDiasDescansoLabels(employee.dias_descanso)}
            </Typography>
          </Grid>

          {/* SECCIÓN MEJORADA: REGISTRO DE FALTAS */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              <Warning sx={{ mr: 1, fontSize: 20 }} />
              Registro de Faltas
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          {/* Faltas Injustificadas */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                p: 2, 
                border: '1px solid', 
                borderColor: 'error.main',
                borderRadius: 1,
                backgroundColor: 'rgba(244, 67, 54, 0.08)'
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1}>
                  <Warning sx={{ fontSize: 24, color: 'error.main' }} />
                  <Typography variant="subtitle1" fontWeight="bold" color="error.main">
                    Faltas Injustificadas
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Chip 
                    label={`Total: ${contadorInjustificadas}`} 
                    color="error" 
                    variant="filled"
                  />
                  <IconButton 
                    size="small" 
                    onClick={() => handleToggleFaltas('injustificadas')}
                    sx={{ color: 'error.main' }}
                  >
                    {expandedFaltas.injustificadas ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>

              <Collapse in={expandedFaltas.injustificadas}>
                <Box sx={{ mt: 2 }}>
                  {faltasInjustificadas.length > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Fechas registradas:
                      </Typography>
                      <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                        {faltasInjustificadas.map((fecha, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <CalendarToday sx={{ color: 'error.main', fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={formatDate(fecha)}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay faltas injustificadas registradas
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
          </Grid>

          {/* Faltas Justificadas */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                p: 2, 
                border: '1px solid', 
                borderColor: 'success.main',
                borderRadius: 1,
                backgroundColor: 'rgba(76, 175, 80, 0.08)'
              }}
            >
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircle sx={{ fontSize: 24, color: 'success.main' }} />
                  <Typography variant="subtitle1" fontWeight="bold" color="success.main">
                    Faltas Justificadas
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={2}>
                  <Chip 
                    label={`Total: ${contadorJustificadas}`} 
                    color="success" 
                    variant="filled"
                  />
                  <IconButton 
                    size="small" 
                    onClick={() => handleToggleFaltas('justificadas')}
                    sx={{ color: 'success.main' }}
                  >
                    {expandedFaltas.justificadas ? <ExpandLess /> : <ExpandMore />}
                  </IconButton>
                </Box>
              </Box>

              <Collapse in={expandedFaltas.justificadas}>
                <Box sx={{ mt: 2 }}>
                  {faltasJustificadas.length > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Fechas registradas:
                      </Typography>
                      <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                        {faltasJustificadas.map((fecha, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              <CalendarToday sx={{ color: 'success.main', fontSize: 18 }} />
                            </ListItemIcon>
                            <ListItemText 
                              primary={formatDate(fecha)}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No hay faltas justificadas registradas
                    </Typography>
                  )}
                </Box>
              </Collapse>
            </Box>
          </Grid>

          {/* Información adicional */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom color="primary" sx={{ mt: 2 }}>
              Información Adicional
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              Estado
            </Typography>
            <Chip 
              label={employee.activo ? 'Activo' : 'Inactivo'} 
              color={employee.activo ? 'success' : 'error'} 
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="textSecondary">
              ID de empleado
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.id}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeDetailsModal;