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
  IconButton
} from '@mui/material';
import { Edit, Delete } from '@mui/icons-material';

const EmployeeList = ({ open, onClose, employees, onEdit, onDelete }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Lista de Empleados</DialogTitle>
      <DialogContent>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>RFC</TableCell>
                <TableCell>NSS</TableCell>
                <TableCell>Tipo Nómina</TableCell>
                <TableCell>Acciones</TableCell>
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
                  <TableCell>{employee.tipo_nomina}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => onEdit(employee)}>
                      <Edit />
                    </IconButton>
                    <IconButton onClick={() => onDelete(employee.id)}>
                      <Delete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmployeeList;