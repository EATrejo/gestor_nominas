import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  IconButton
} from '@mui/material';
import { 
  PersonAdd, 
  People, 
  Payment, 
  EventBusy,
  ExitToApp,
  BugReport 
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

// Importar componentes
import EmployeeForm from '../components/EmployeeForm';
import EmployeeList from '../components/EmployeeList';
import PayrollProcessor from '../components/PayrollProcessor';
import AbsenceRegister from '../components/AbsenceRegister';

const Dashboard = () => {
  const [employees, setEmployees] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalEmployees: 0,
    totalPayrolls: 0
  });
  
  // Estados para controlar la apertura de los diálogos
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [employeeListOpen, setEmployeeListOpen] = useState(false);
  const [payrollProcessorOpen, setPayrollProcessorOpen] = useState(false);
  const [absenceRegisterOpen, setAbsenceRegisterOpen] = useState(false);
  
  const navigate = useNavigate();

  // Función para manejar logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    navigate('/login');
  }, [navigate]);

  // Función para obtener headers con autenticación
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Función para manejar refresco de token
  const handleTokenRefresh = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem('refresh_token');
      if (!refreshToken) {
        handleLogout();
        return false;
      }

      const response = await api.post('/auth/token/refresh/', {
        refresh: refreshToken
      });

      if (response.data.access) {
        localStorage.setItem('token', response.data.access);
        return true;
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
      handleLogout();
      return false;
    }
  }, [handleLogout]);

  const fetchEmployees = useCallback(async () => {
    try {
      const response = await api.get('/empleados/', {
        headers: getAuthHeaders()
      });
      
      if (response.status === 200) {
        setEmployees(response.data);
        setSummaryData(prev => ({
          ...prev,
          totalEmployees: response.data.length
        }));
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      // Si es error 401, intentar refrescar token
      if (error.response?.status === 401) {
        const refreshed = await handleTokenRefresh();
        if (refreshed) {
          // Reintentar después de refrescar
          await fetchEmployees();
        }
      }
    }
  }, [getAuthHeaders, handleTokenRefresh]);

  const fetchSummaryData = useCallback(async () => {
    try {
      // Implementar lógica para obtener datos de resumen de nóminas
      // Por ahora solo tenemos el conteo de empleados
      setSummaryData(prev => ({
        ...prev,
        totalPayrolls: 0 // Valor temporal
      }));
    } catch (error) {
      console.error('Error fetching summary data:', error);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    fetchSummaryData();
  }, [fetchEmployees, fetchSummaryData]);

  const handleSaveEmployee = async (employeeData) => {
    try {
      console.log('Datos a enviar al servidor:', JSON.stringify(employeeData, null, 2));
      
      const response = await api.post('/empleados/', employeeData, {
        headers: getAuthHeaders()
      });
      
      if (response.status === 201) {
        alert('Empleado creado exitosamente');
        setEmployeeFormOpen(false);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error completo:', error);
      console.error('Respuesta del servidor:', error.response?.data);
      
      // Manejar error de token expirado
      if (error.response?.status === 401) {
        const refreshed = await handleTokenRefresh();
        if (refreshed) {
          // Reintentar la solicitud después de refrescar el token
          await handleSaveEmployee(employeeData);
          return;
        }
      }
      
      // Mostrar mensajes de error específicos del servidor
      if (error.response?.data) {
        const errorMessages = Object.entries(error.response.data)
          .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
          .join('\n');
        alert(`Error al crear empleado:\n${errorMessages}`);
      } else {
        alert('Error al crear empleado: ' + error.message);
      }
    }
  };

  const handleEditEmployee = async (employeeId, employeeData) => {
    try {
      const response = await api.put(`/empleados/${employeeId}/`, employeeData, {
        headers: getAuthHeaders()
      });
      
      if (response.status === 200) {
        alert('Empleado actualizado exitosamente');
        setEmployeeListOpen(false);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error updating employee:', error);
      alert('Error al actualizar empleado: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este empleado?')) {
      try {
        const response = await api.delete(`/empleados/${employeeId}/`, {
          headers: getAuthHeaders()
        });
        
        if (response.status === 204) {
          alert('Empleado eliminado exitosamente');
          fetchEmployees();
        }
      } catch (error) {
        console.error('Error deleting employee:', error);
        alert('Error al eliminar empleado: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleProcessPayroll = async (payrollData) => {
    try {
      const response = await api.post('/nominas/procesar_nomina/', payrollData, {
        headers: getAuthHeaders()
      });
      
      if (response.status === 200 || response.status === 201) {
        alert('Nómina procesada exitosamente');
        setPayrollProcessorOpen(false);
        fetchSummaryData();
      }
    } catch (error) {
      console.error('Error processing payroll:', error);
      alert('Error al procesar nómina: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleRegisterAbsences = async (employeeId, absencesData) => {
    try {
      const response = await api.post(`/empleados/${employeeId}/faltas/registrar-faltas/`, absencesData, {
        headers: getAuthHeaders()
      });
      
      if (response.status === 200 || response.status === 201) {
        alert('Faltas registradas exitosamente');
        setAbsenceRegisterOpen(false);
      }
    } catch (error) {
      console.error('Error registering absences:', error);
      alert('Error al registrar faltas: ' + (error.response?.data?.message || error.message));
    }
  };

  // Función para probar la creación de empleados
  const testEmployeeCreation = async () => {
    try {
      const testData = {
        nombre: "Juan",
        apellido_paterno: "Pérez",
        apellido_materno: "López",
        fecha_ingreso: "2024-01-15",
        nss: "12345678901",
        rfc: "PELJ840101ABC",
        tipo_nomina: "MENSUAL",
        sueldo_mensual: "10000.00",
        dias_descanso: "2",
        zona_salarial: "General"
      };
      
      console.log('Enviando datos de prueba:', testData);
      
      const response = await api.post('/empleados/', testData, {
        headers: getAuthHeaders()
      });
      
      console.log('Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      });
      
      alert(`Respuesta: ${response.status} ${response.statusText}\n\n${JSON.stringify(response.data, null, 2)}`);
    } catch ( error) {
      console.error('Error en la prueba:', error);
      alert('Error en la prueba: ' + error.message);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Gestor de Nóminas
          </Typography>
          <IconButton color="inherit" onClick={handleLogout}>
            <ExitToApp />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold', color: '#2c3e50' }}>
          Panel de Control - Gestor de Nóminas
        </Typography>
        
        {/* Tarjetas de resumen */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          <Grid item xs={12} sm={6} md={6}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                color: 'white',
                borderRadius: 3
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <People sx={{ fontSize: 40, mb: 1 }} />
                <Typography gutterBottom variant="h5" component="h2">
                  Total de Empleados
                </Typography>
                <Typography variant="h3" component="p">
                  {summaryData.totalEmployees}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={6}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                background: 'linear-gradient(45deg, #66BB6A 30%, #81C784 90%)',
                color: 'white',
                borderRadius: 3
              }}
            >
              <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                <Payment sx={{ fontSize: 40, mb: 1 }} />
                <Typography gutterBottom variant="h5" component="h2">
                  Nóminas Procesadas
                </Typography>
                <Typography variant="h3" component="p">
                  {summaryData.totalPayrolls}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Botones de acción - CON NUEVO ORDEN */}
        <Grid container spacing={4} justifyContent="center">
          {/* Botón 1: Dar de alta empleados */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                borderRadius: 3,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: 6
                }
              }}
            >
              <PersonAdd color="primary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h6" align="center" gutterBottom>
                Dar de Alta Empleados
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setEmployeeFormOpen(true)}
                sx={{ mt: 2 }}
              >
                Acceder
              </Button>
            </Paper>
          </Grid>

          {/* Botón 2: Revisar empleados existentes */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                borderRadius: 3,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: 6
                }
              }}
            >
              <People color="secondary" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h6" align="center" gutterBottom>
                Revisar Empleados Existentes
              </Typography>
              <Button
                variant="contained"
                color="secondary"
                fullWidth
                onClick={() => setEmployeeListOpen(true)}
                sx={{ mt: 2 }}
              >
                Acceder
              </Button>
            </Paper>
          </Grid>

          {/* Botón 3: Registrar faltas (NUEVA POSICIÓN) */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                borderRadius: 3,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: 6
                }
              }}
            >
              <EventBusy color="error" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h6" align="center" gutterBottom>
                Registrar Faltas
              </Typography>
              <Button
                variant="contained"
                color="error"
                fullWidth
                onClick={() => setAbsenceRegisterOpen(true)}
                sx={{ mt: 2 }}
              >
                Acceder
              </Button>
            </Paper>
          </Grid>

          {/* Botón 4: Procesar nómina (NUEVA POSICIÓN) */}
          <Grid item xs={12} sm={6} md={3}>
            <Paper 
              elevation={3} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                borderRadius: 3,
                transition: 'transform 0.3s',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: 6
                }
              }}
            >
              <Payment color="success" sx={{ fontSize: 50, mb: 2 }} />
              <Typography variant="h6" align="center" gutterBottom>
                Procesar Nómina
              </Typography>
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={() => setPayrollProcessorOpen(true)}
                sx={{ mt: 2 }}
              >
                Acceder
              </Button>
            </Paper>
          </Grid>
        </Grid>

        {/* Botón de prueba (temporal) */}
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<BugReport />}
            onClick={testEmployeeCreation}
          >
            Ejecutar Prueba de Empleado
          </Button>
          <Typography variant="caption" display="block" sx={{ mt: 1 }}>
            Este botón es temporal para diagnosticar el error 400
          </Typography>
        </Box>
      </Container>
      
      {/* Diálogos modales */}
      <EmployeeForm 
        open={employeeFormOpen}
        onClose={() => setEmployeeFormOpen(false)}
        onSave={handleSaveEmployee}
      />
      
      <EmployeeList 
        open={employeeListOpen}
        onClose={() => setEmployeeListOpen(false)}
        employees={employees}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
      />
      
      <PayrollProcessor 
        open={payrollProcessorOpen}
        onClose={() => setPayrollProcessorOpen(false)}
        onProcess={handleProcessPayroll}
      />
      
      <AbsenceRegister 
        open={absenceRegisterOpen}
        onClose={() => setAbsenceRegisterOpen(false)}
        employees={employees}
        onRegister={handleRegisterAbsences}
      />
    </Box>
  );
};

export default Dashboard;