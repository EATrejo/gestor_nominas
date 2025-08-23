import React from 'react';
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
  Divider
} from '@mui/material';
import {
  Person,
  AssignmentInd,
  DateRange,
  MonetizationOn,
  Event,
  Business
} from '@mui/icons-material';

const EmployeeDetailsModal = ({ open, onClose, employee }) => {
  if (!employee) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'No especificada';
    return new Date(dateString).toLocaleDateString('es-MX');
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