import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Typography,
  Box
} from '@mui/material';
import { Edit, Delete, Refresh, Visibility } from '@mui/icons-material';
import EmployeeEditDialog from './EmployeeEditDialog';
import EmployeeDetailsModal from './EmployeeDetailsModal';

const EmployeeList = ({ open, onClose, employees, onEdit, onDelete, onRefresh }) => {
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const handleEditClick = (employee) => {
    setEditingEmployee(employee);
    setEditDialogOpen(true);
  };

  const handleViewClick = (employee) => {
    setViewingEmployee(employee);
    setDetailsDialogOpen(true);
  };

  const handleEditSave = async (employeeId, employeeData) => {
    const success = await onEdit(employeeId, employeeData);
    if (success) {
      setEditDialogOpen(false);
      setEditingEmployee(null);
    }
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingEmployee(null);
  };

  const handleDetailsClose = () => {
    setDetailsDialogOpen(false);
    setViewingEmployee(null);
  };

  // Función para determinar el color de fondo según las faltas (colores más tenues)
  const getFaltasBackgroundColor = (faltas) => {
    const faltasCount = faltas !== undefined && faltas !== null ? faltas : 0;
    
    if (faltasCount <= 1) {
      return '#e8f5e9'; // Verde muy pálido
    } else if (faltasCount === 2) {
      return '#fff9c4'; // Amarillo pálido
    } else {
      return '#ffebee'; // Rojo muy pálido
    }
  };

  // Función para determinar el color del texto según las faltas
  const getFaltasTextColor = (faltas) => {
    const faltasCount = faltas !== undefined && faltas !== null ? faltas : 0;
    
    if (faltasCount <= 1) {
      return '#2e7d32'; // Verde oscuro para contraste
    } else if (faltasCount === 2) {
      return '#f57f17'; // Ámbar oscuro para contraste
    } else {
      return '#c62828'; // Rojo oscuro para contraste
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <span>Lista de Empleados</span>
            <Button 
              variant="outlined" 
              startIcon={<Refresh />} 
              onClick={onRefresh}
              size="small"
            >
              Actualizar
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {employees.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h6" color="textSecondary" gutterBottom>
                No hay empleados registrados
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Los empleados que crees aparecerán aquí
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell><strong>Nombre</strong></TableCell>
                    <TableCell><strong>RFC</strong></TableCell>
                    <TableCell><strong>NSS</strong></TableCell>
                    <TableCell><strong>Periodo Nominal</strong></TableCell>
                    <TableCell><strong>Faltas Injustificadas</strong></TableCell>
                    <TableCell><strong>Acciones</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.id} hover>
                      <TableCell>
                        <Typography
                          variant="body1"
                          onClick={() => handleViewClick(employee)}
                          sx={{
                            cursor: 'pointer',
                            color: 'primary.main',
                            fontWeight: 'medium',
                            '&:hover': {
                              textDecoration: 'underline',
                              color: 'primary.dark'
                            }
                          }}
                        >
                          {employee.nombre} {employee.apellido_paterno} {employee.apellido_materno}
                        </Typography>
                      </TableCell>
                      <TableCell>{employee.rfc}</TableCell>
                      <TableCell>{employee.nss}</TableCell>
                      <TableCell>{employee.periodo_nominal}</TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minWidth: '20px',
                            height: '28px',
                            padding: '2px 4px',
                            borderRadius: '14px',
                            backgroundColor: getFaltasBackgroundColor(employee.faltas_injustificadas),
                            color: getFaltasTextColor(employee.faltas_injustificadas),
                            fontWeight: 'bold',
                            fontSize: '0.75rem'
                          }}
                        >
                          {employee.faltas_injustificadas !== undefined && employee.faltas_injustificadas !== null
                            ? employee.faltas_injustificadas
                            : '0'}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton 
                          onClick={() => handleViewClick(employee)}
                          color="info"
                          size="small"
                          title="Ver detalles"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton 
                          onClick={() => handleEditClick(employee)}
                          color="primary"
                          size="small"
                          title="Editar"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton 
                          onClick={() => onDelete(employee.id)}
                          color="error"
                          size="small"
                          title="Eliminar"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cerrar</Button>
          <Button 
            onClick={onRefresh} 
            variant="contained" 
            startIcon={<Refresh />}
          >
            Actualizar Lista
          </Button>
        </DialogActions>
      </Dialog>

      <EmployeeEditDialog
        open={editDialogOpen}
        onClose={handleEditClose}
        employee={editingEmployee}
        onSave={handleEditSave}
      />

      <EmployeeDetailsModal
        open={detailsDialogOpen}
        onClose={handleDetailsClose}
        employee={viewingEmployee}
      />
    </>
  );
};

export default EmployeeList;