import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  MenuItem,
  Typography
} from '@mui/material';

const AbsenceRegister = ({ open, onClose, employees }) => {
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [absences, setAbsences] = useState([{ fecha: '', motivo: '' }]);

  const addAbsenceField = () => {
    if (absences.length < 3) {
      setAbsences([...absences, { fecha: '', motivo: '' }]);
    }
  };

  const handleAbsenceChange = (index, field, value) => {
    const newAbsences = [...absences];
    newAbsences[index][field] = value;
    setAbsences(newAbsences);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Registrar Faltas</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
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
                  {employee.nombre} {employee.apellido_paterno}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {absences.map((absence, index) => (
            <React.Fragment key={index}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={`Fecha de Falta ${index + 1}`}
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={absence.fecha}
                  onChange={(e) => handleAbsenceChange(index, 'fecha', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={`Motivo de Falta ${index + 1}`}
                  value={absence.motivo}
                  onChange={(e) => handleAbsenceChange(index, 'motivo', e.target.value)}
                />
              </Grid>
            </React.Fragment>
          ))}

          {absences.length < 3 && (
            <Grid item xs={12}>
              <Button onClick={addAbsenceField} variant="outlined">
                Agregar otra falta
              </Button>
            </Grid>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={() => alert('Faltas registradas exitosamente')} 
          variant="contained" 
          disabled={!selectedEmployee}
        >
          Registrar Faltas
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AbsenceRegister;