import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  Typography
} from '@mui/material';

const PayrollProcessor = ({ open, onClose }) => {
  const [selectedType, setSelectedType] = useState('');

  const payrollTypes = [
    { id: 'semanal', label: 'SEMANAL', color: 'primary' },
    { id: 'quincenal', label: 'QUINCENAL', color: 'secondary' },
    { id: 'mensual', label: 'MENSUAL', color: 'success' }
  ];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Procesar Nómina</DialogTitle>
      <DialogContent>
        <Typography variant="h6" gutterBottom>
          Seleccione el tipo de nómina a procesar:
        </Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {payrollTypes.map((type) => (
            <Grid item xs={12} sm={4} key={type.id}>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: selectedType === type.id ? '#e3f2fd' : 'white',
                  '&:hover': {
                    backgroundColor: '#f5f5f5'
                  }
                }}
                onClick={() => setSelectedType(type.id)}
              >
                <Typography variant="h6">{type.label}</Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
        
        {selectedType && (
          <Typography variant="body1" sx={{ mt: 3 }}>
            Aquí se mostrarían los períodos para {selectedType}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button 
          onClick={() => alert('Procesando nómina...')} 
          variant="contained" 
          disabled={!selectedType}
        >
          Procesar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PayrollProcessor;