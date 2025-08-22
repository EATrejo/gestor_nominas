import React from 'react';
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
import { Edit, Delete, Refresh } from '@mui/icons-material';

const EmployeeList = ({ open, onClose, employees, onEdit, onDelete, onRefresh }) => {
  return (
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
                  <TableCell><strong>Acciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell>
                      {employee.nombre} {employee.apellido_paterno} {employee.apellido_materno}
                    </TableCell>
                    <TableCell>{employee.rfc}</TableCell>
                    <TableCell>{employee.nss}</TableCell>
                    <TableCell>{employee.periodo_nominal}</TableCell>
                    <TableCell>
                      <IconButton 
                        onClick={() => onEdit(employee)}
                        color="primary"
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        onClick={() => onDelete(employee.id)}
                        color="error"
                        size="small"
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
  );
};

export default EmployeeList;