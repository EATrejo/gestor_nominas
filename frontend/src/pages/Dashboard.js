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
  CircularProgress
} from '@mui/material';
import { 
  PersonAdd, 
  People, 
  Payment, 
  ExitToApp,
  BugReport 
} from '@mui/icons-material';
import api from '../services/api';
import { userService } from '../services/userService';

// Importar AuthContext
import { useAuth } from '../auth/AuthContext';

// Importar componentes
import EmployeeForm from '../components/EmployeeForm';
import EmployeeList from '../components/EmployeeList';
import PayrollProcessor from '../components/nominas/PayrollProcessor';
import AbsenceRegister from '../components/AbsenceRegister';
import EmployeeEditDialog from '../components/EmployeeEditDialog';

// Crear un componente de icono bicolor personalizado
const BicolorEventIcon = () => (
  <Box sx={{ position: 'relative', width: 50, height: 50 }}>
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '50%',
        backgroundColor: '#d32f2f', // Rojo para faltas injustificadas
        borderTopLeftRadius: '50%',
        borderTopRightRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>!</span>
    </Box>
    <Box
      sx={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '50%',
        backgroundColor: '#2e7d32', // Verde para faltas justificadas
        borderBottomLeftRadius: '50%',
        borderBottomRightRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
    </Box>
  </Box>
);

// DEBUG: Monitorear llamadas API
console.log('🔄 Dashboard montado - monitoreando llamadas API');

let verificationCounter = 0;
const originalApiGet = api.get;
api.get = function(...args) {
  if (args[0] && args[0].includes('/auth/')) {
    verificationCounter++;
    console.log(`🔍 Llamada auth #${verificationCounter}:`, args[0]);
    
    if (verificationCounter > 5) {
      console.warn('⚠️ Demasiadas llamadas auth - posible bucle');
      // No cancelar la llamada, solo loguear
    }
  }
  return originalApiGet.apply(this, args);
};

const Dashboard = () => {
  // Usar AuthContext
  const { user, logout } = useAuth();
  
  const [employees, setEmployees] = useState([]);
  const [summaryData, setSummaryData] = useState({
    totalEmployees: 0,
    totalPayrolls: 0
  });
  const [empresaId, setEmpresaId] = useState(null);
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  
  // Estados para controlar la apertura de los diálogos
  const [employeeFormOpen, setEmployeeFormOpen] = useState(false);
  const [employeeListOpen, setEmployeeListOpen] = useState(false);
  const [payrollProcessorOpen, setPayrollProcessorOpen] = useState(false);
  const [absenceRegisterOpen, setAbsenceRegisterOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Obtener nombre de la empresa desde el contexto de autenticación
  const empresaNombre = user?.empresa_nombre || `Empresa ${user?.empresa_id || ''}`;

  // Función para manejar logout usando AuthContext
  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  // Función para obtener headers con autenticación
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Función para obtener empleados (optimizada y simplificada)
  const fetchEmployees = useCallback(async () => {
    if (!empresaId) {
      console.log('⏳ Esperando ID de empresa...');
      return;
    }

    try {
      console.log('🔍 Obteniendo empleados para empresa:', empresaId);
      
      const response = await api.get('/empleados/', {
        params: { empresa: empresaId }
      });
      
      console.log('📊 Respuesta de empleados:', {
        status: response.status,
        count: response.data.length
      });
      
      if (response.status === 200) {
        // DEBUG: Verificar la estructura de los datos recibidos
        if (response.data.length > 0) {
          console.log('📋 Estructura del primer empleado:', {
            id: response.data[0]?.id,
            nombre: response.data[0]?.nombre,
            faltas_justificadas: response.data[0]?.faltas_justificadas,
            faltas_injustificadas: response.data[0]?.faltas_injustificadas,
            tiene_faltas_campo: 'faltas_justificadas' in response.data[0],
            todos_los_campos: Object.keys(response.data[0] || {})
          });
          
          // Verificar si algún empleado tiene datos de faltas
          const empleadosConFaltas = response.data.filter(emp => 
            emp.faltas_justificadas !== undefined || emp.faltas_injustificadas !== undefined
          );
          console.log('🔎 Empleados con datos de faltas:', empleadosConFaltas.length);
        } else {
          console.log('📭 No hay empleados en la respuesta');
        }
        
        setEmployees(response.data);
        setSummaryData(prev => ({
          ...prev,
          totalEmployees: response.data.length
        }));
      }
    } catch (error) {
      console.error('❌ Error fetching employees:', error);
      // EL INTERCEPTOR SE ENCARGARÁ AUTOMÁTICAMENTE DE LOS ERRORES 401
    }
  }, [empresaId]); // Solo depende de empresaId

  // Función para obtener datos de resumen
  const fetchSummaryData = useCallback(async () => {
    try {
      setSummaryData(prev => ({
        ...prev,
        totalPayrolls: 0
      }));
    } catch (error) {
      console.error('Error fetching summary data:', error);
    }
  }, []);

  // Cargar información de la empresa (OPTIMIZADO)
  useEffect(() => {
    const loadEmpresaData = async () => {
      try {
        setLoadingEmpresa(true);
        
        // Resetear contadores al cargar
        userService.resetVerificationCount();
        
        console.log('🔄 Iniciando carga de datos de empresa...');
        userService.debugToken();
        
        // Obtener empresa_id del usuario autenticado
        let id = user?.empresa_id;
        
        // Si no está en el usuario, intentar obtenerlo del userService
        if (!id) {
          id = await Promise.race([
            userService.getEmpresaId(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout obteniendo empresa ID')), 5000)
            )
          ]);
        }
        
        setEmpresaId(id);
        console.log('✅ ID de empresa establecido:', id);
        
      } catch (error) {
        console.error('Error loading empresa data:', error);
        // Usar valor por defecto para evitar bucles
        const defaultId = 34;
        setEmpresaId(defaultId);
        console.log('⚠️ Usando empresa ID por defecto:', defaultId);
      } finally {
        setLoadingEmpresa(false);
        setInitialLoadComplete(true);
      }
    };
    
    loadEmpresaData();
  }, [user]);

  // Efecto para cargar datos iniciales (OPTIMIZADO)
  useEffect(() => {
    if (empresaId && initialLoadComplete) {
      // Usar timeout para evitar llamadas inmediatas
      const timer = setTimeout(() => {
        console.log('📦 Cargando datos iniciales...');
        fetchEmployees();
        fetchSummaryData();
      }, 1000);
      
      return () => {
        console.log('🧹 Limpiando timer de carga inicial');
        clearTimeout(timer);
      };
    }
  }, [empresaId, initialLoadComplete, fetchEmployees, fetchSummaryData]);

  // Función para guardar nuevo empleado
  const handleSaveEmployee = async (employeeData) => {
    if (!empresaId) {
      alert('Error: No se pudo identificar la empresa');
      return;
    }

    try {
      const datosParaEnviar = {
        ...employeeData,
        empresa: empresaId
      };
      
      console.log('📤 Datos a enviar:', datosParaEnviar);
      
      const response = await api.post('/empleados/', datosParaEnviar, {
        headers: getAuthHeaders()
      });
      
      console.log('✅ Empleado creado:', response.data);
      
      if (response.status === 201) {
        alert('Empleado creado exitosamente');
        setEmployeeFormOpen(false);
        await fetchEmployees();
      }
    } catch (error) {
      console.error('❌ Error creating employee:', error);
      
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

  // Función para editar empleado (optimizada) - CORREGIDA
  const handleEditEmployee = async (employeeId, employeeData) => {
    try {
      console.log('📤 Actualizando empleado ID:', employeeId);
      
      // Procesar datos para el backend
      const processedData = {
        ...employeeData,
        dias_descanso: Array.isArray(employeeData.dias_descanso) 
          ? employeeData.dias_descanso.map(dia => parseInt(dia))
          : [],
        empresa: empresaId // ← AÑADIR ESTA LÍNEA
      };
      
      // Convertir campos numéricos
      if (processedData.sueldo_mensual) {
        processedData.sueldo_mensual = parseFloat(processedData.sueldo_mensual);
      }
      if (processedData.salario_diario) {
        processedData.salario_diario = parseFloat(processedData.salario_diario);
      }
      
      // Limpiar campos según el periodo nominal
      if (processedData.periodo_nominal === 'MENSUAL') {
        processedData.salario_diario = null;
      } else {
        processedData.sueldo_mensual = null;
      }
      
      // Remover campos que no deberían enviarse (pero mantener empresa)
      const fieldsToRemove = [
        'id', 'empresa_nombre', 'activo', 
        'fecha_baja', 'motivo_baja', 'created_at', 
        'updated_at', 'nombre_completo'
      ];
      
      fieldsToRemove.forEach(field => {
        if (field in processedData) {
          delete processedData[field];
        }
      });
      
      console.log('🔧 Datos procesados para enviar:', processedData);
      
      const response = await api.put(`/empleados/${employeeId}/`, processedData, {
        headers: getAuthHeaders()
      });
      
      console.log('✅ Respuesta del servidor:', response.data);
      
      if (response.status === 200) {
        alert('Empleado actualizado exitosamente');
        setEditDialogOpen(false);
        setEditingEmployee(null);
        await fetchEmployees();
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error updating employee:', error);
      
      let errorMessage = 'Error al actualizar empleado';
      
      if (error.response?.data) {
        if (error.response.data.detalles) {
          const errors = Object.entries(error.response.data.detalles)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          errorMessage = `Errores de validación:\n${errors}`;
        } else if (typeof error.response.data === 'object') {
          const errors = Object.entries(error.response.data)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('\n');
          errorMessage = `Error del servidor:\n${errors}`;
        } else {
          errorMessage = String(error.response.data);
        }
      } else {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      return false;
    }
  };

  // Función para eliminar empleado
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

  // Función para procesar nómina
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
      return false;
    }
    return true;
  };

  // ... (código anterior se mantiene igual)

  // Función para registrar faltas (ACTUALIZADA para soportar múltiples empleados)
  const handleRegisterAbsences = async (selectedEmployees, resultData) => {
    try {
      // Si el registro fue exitoso (según el resultado del componente AbsenceRegister)
      if (resultData && resultData.success) {
        // Mostrar mensaje de éxito con los detalles
        alert(`✅ ${resultData.message}\n\n` +
              `Motivo: ${resultData.detalle?.motivo || 'N/A'}\n` +
              `Fechas: ${resultData.detalle?.fechas || 'N/A'}\n` +
              `Empleados afectados: ${resultData.detalle?.empleados_afectados || resultData.empleados_afectados || 'N/A'}\n` +
              `Tipo: ${resultData.detalle?.tipo || resultData.tipo || 'N/A'}`);
        
        // Actualizar lista de empleados
        await fetchEmployees();
        return true;
      } else if (resultData && !resultData.success) {
        // Mostrar error si el registro falló
        alert(`❌ Error: ${resultData.message || 'No se pudieron registrar las faltas'}`);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error handling absences registration:', error);
      
      // Mostrar error genérico
      alert('Error al procesar el registro de faltas');
      return false;
    }
  };

// ... (el resto del código se mantiene igual)

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
        periodo_nominal: "MENSUAL",
        sueldo_mensual: 10000.00,
        dias_descanso: [0, 6],
        zona_salarial: "general",
        empresa: empresaId
      };
      
      console.log('Enviando datos de prueba:', testData);
      
      const response = await api.post('/empleados/', testData, {
        headers: getAuthHeaders()
      });
      
      console.log('Respuesta del servidor:', response.data);
      alert('Empleado creado exitosamente');
    } catch (error) {
      console.error('Error en la prueba:', error);
      alert('Error en la prueba: ' + (error.response?.data?.message || error.message));
    }
  };

  // Función para testear la API de empleados
  const testEmployeeAPI = async () => {
    try {
      console.log('🧪 Probando endpoints de empleados...');
      
      const response = await api.get('/empleados/', {
        headers: getAuthHeaders(),
        params: { empresa: empresaId }
      });
      console.log('✅ GET /empleados/:', response.data);
      
    } catch (error) {
      console.error('❌ Error testing API:', error);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            {empresaNombre ? `Gestor de Nóminas de ${empresaNombre}` : 'Gestor de Nóminas'}
            {user && ` - Usuario: ${user.username || user.email}`}
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            startIcon={<ExitToApp />}
            sx={{ textTransform: 'none' }}
          >
            Cerrar Sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        {loadingEmpresa ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Cargando información de la empresa...</Typography>
          </Box>
        ) : (
          <>
            {/* Títulos centrados según lo solicitado */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: '#2c3e50' }}>
                {empresaNombre ? `Gestor de Nóminas de ${empresaNombre}` : 'Gestor de Nóminas'}
              </Typography>
              <Typography variant="h5" component="h2" sx={{ color: '#7f8c8d', fontWeight: 'normal' }}>
                Panel de Control
              </Typography>
            </Box>
            
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

            <Grid container spacing={4} justifyContent="center">
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
                      transform: 'scale(1.05)'
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

              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 3, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    borderRadius: 3
                  }}
                >
                  <People color="secondary" sx={{ fontSize: 50, mb: 2 }} />
                  <Typography variant="h6" align="center" gutterBottom>
                    Revisar Empleados
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

              {/* Grid item de Registrar Faltas con icono bicolor personalizado */}
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
                      transform: 'scale(1.05)'
                    }
                  }}
                >
                  <BicolorEventIcon />
                  <Typography variant="h6" align="center" gutterBottom sx={{ mt: 2 }}>
                    Registrar Faltas
                  </Typography>
                  <Button
                    variant="contained"
                    sx={{ 
                      mt: 2,
                      background: 'linear-gradient(45deg, #d32f2f 30%, #2e7d32 90%)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #b71c1c 30%, #1b5e20 90%)'
                      }
                    }}
                    fullWidth
                    onClick={() => setAbsenceRegisterOpen(true)}
                  >
                    Acceder
                  </Button>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Paper 
                  elevation={3} 
                  sx={{ 
                    p: 3, 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    borderRadius: 3
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

            <Box sx={{ mt: 4, textAlign: 'center' }}>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<BugReport />}
                onClick={testEmployeeCreation}
                sx={{ mr: 1, mb: 1 }}
              >
                Prueba Empleado
              </Button>
              
              <Button
                variant="outlined"
                color="info"
                onClick={() => userService.debugToken()}
                sx={{ mr: 1, mb: 1 }}
              >
                Debug Token
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={testEmployeeAPI}
                sx={{ mr: 1, mb: 1 }}
              >
                Test API
              </Button>

              <Button
                variant="outlined"
                color="secondary"
                onClick={() => {
                  userService.setEmpresaIdForTesting(34);
                  setEmpresaId(34);
                  fetchEmployees();
                }}
                sx={{ mr: 1, mb: 1 }}
              >
                Usar Empresa 34
              </Button>

              <Button
                variant="outlined"
                color="error"
                onClick={handleLogout}
                sx={{ mb: 1 }}
              >
                Cerrar Sesión
              </Button>
              
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Botones de utilidad - Empresa actual: {empresaId}
              </Typography>
            </Box>
          </>
        )}
      </Container>
      
      <EmployeeForm 
        open={employeeFormOpen}
        onClose={() => setEmployeeFormOpen(false)}
        onSave={handleSaveEmployee}
        empresaId={empresaId}
      />
      
      <EmployeeList 
        open={employeeListOpen}
        onClose={() => setEmployeeListOpen(false)}
        employees={employees}
        onEdit={handleEditEmployee}
        onDelete={handleDeleteEmployee}
        onRefresh={fetchEmployees}
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

      <EmployeeEditDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingEmployee(null);
        }}
        employee={editingEmployee}
        onSave={handleEditEmployee}
      />
    </Box>
  );
};

export default Dashboard;