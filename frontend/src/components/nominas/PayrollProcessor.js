import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Box,
  Chip
} from '@mui/material';
import api from '../../services/api'; // RUTA CORREGIDA
import NominaResultsDialog from './NominaResultsDialog';

const PayrollProcessor = ({ open, onClose }) => {
  const [selectedType, setSelectedType] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [periods, setPeriods] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  const payrollTypes = [
    { id: 'SEMANAL', label: 'SEMANAL' },
    { id: 'QUINCENAL', label: 'QUINCENAL' },
    { id: 'MENSUAL', label: 'MENSUAL' }
  ];

  // Formatear fecha en español
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Formatear etiqueta del período según el tipo
  const formatPeriodLabel = (period, type) => {
    if (type === 'SEMANAL') {
      return (
        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="body2" fontWeight="medium">
            {period.etiqueta || `SEMANA/${period.numero || 'N/A'}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(period.fecha_inicio)} - {formatDate(period.fecha_fin)}
          </Typography>
        </Box>
      );
    }
    return period.etiqueta || `${period.mes || 'N/A'}/${period.quincena || ''}`;
  };

  const fetchPeriods = useCallback(async (type) => {
    if (!type) return;
    
    setLoading(true);
    setError('');
    setPeriods([]);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No autenticado');
        return;
      }

      const response = await api.get(`/nominas/list_periodos/?tipo=${type}`);
      
      if (response.data?.periodos) {
        setPeriods(response.data.periodos);
      } else {
        setError('No hay períodos disponibles');
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
      if (err.response?.status === 401) {
        setError('Sesión expirada. Por favor, inicie sesión nuevamente.');
      } else if (err.response?.status === 404) {
        setError('Endpoint no encontrado. Contacte al administrador.');
      } else if (err.response?.status === 500) {
        setError('Error del servidor. Intente más tarde.');
      } else {
        setError('Error al cargar los períodos. Verifique su conexión.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedType) {
      fetchPeriods(selectedType);
    } else {
      setSelectedPeriod('');
      setPeriods([]);
    }
  }, [selectedType, fetchPeriods]);

  const handleProcess = async () => {
    if (selectedType && selectedPeriod) {
      setProcessing(true);
      setError('');
      try {
        const empresaId = localStorage.getItem('empresa_id');
        
        if (!empresaId) {
          setError('No se encontró información de la empresa');
          setProcessing(false);
          return;
        }

        const payload = {
          tipo_periodo: selectedType,
          periodo_id: selectedPeriod,
          empresa_id: parseInt(empresaId)
        };

        console.log('Enviando payload para procesar nómina:', payload);
        const response = await api.post('/nominas/procesar_nomina/', payload);
        
        setResults(response.data);
        setResultsOpen(true);
        
      } catch (error) {
        console.error('Error processing payroll:', error);
        if (error.response?.data) {
          setError(error.response.data.message || 'Error al procesar la nómina');
        } else if (error.message) {
          setError(error.message);
        } else {
          setError('Error desconocido al procesar la nómina');
        }
      } finally {
        setProcessing(false);
      }
    }
  };

  const handleClose = () => {
    setSelectedType('');
    setSelectedPeriod('');
    setError('');
    setPeriods([]);
    setResults(null);
    setResultsOpen(false);
    onClose();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            PROCESAR NÓMINA
          </Typography>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="subtitle1" gutterBottom sx={{ textAlign: 'center' }}>
            Tipo de nómina:
          </Typography>
          
          <Grid container spacing={1} sx={{ mb: 3 }}>
            {payrollTypes.map((type) => (
              <Grid item xs={4} key={type.id}>
                <Paper
                  elevation={selectedType === type.id ? 3 : 1}
                  sx={{
                    p: 1.5,
                    textAlign: 'center',
                    cursor: 'pointer',
                    bgcolor: selectedType === type.id ? 'primary.main' : 'grey.100',
                    color: selectedType === type.id ? 'white' : 'text.primary',
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: selectedType === type.id ? 'primary.dark' : 'grey.200'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onClick={() => setSelectedType(type.id)}
                >
                  <Typography variant="body2" fontWeight="medium">
                    {type.label}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
          
          {selectedType && (
            <Box sx={{ mt: 2 }}>
              {loading ? (
                <Box display="flex" justifyContent="center" alignItems="center" py={2}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Cargando períodos...
                  </Typography>
                </Box>
              ) : error ? (
                <Typography color="error" variant="body2" align="center" sx={{ py: 2 }}>
                  {error}
                </Typography>
              ) : periods.length > 0 ? (
                <Box>
                  <Typography variant="body2" fontWeight="medium" gutterBottom>
                    Períodos disponibles:
                  </Typography>
                  
                  {/* Barras horizontales de períodos */}
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1,
                    maxHeight: 200,
                    overflowY: 'auto',
                    p: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    bgcolor: 'grey.50'
                  }}>
                    {periods.map((period) => (
                      <Chip
                        key={period.id}
                        label={formatPeriodLabel(period, selectedType)}
                        onClick={() => setSelectedPeriod(period.id)}
                        color={selectedPeriod === period.id ? 'primary' : 'default'}
                        variant={selectedPeriod === period.id ? 'filled' : 'outlined'}
                        sx={{
                          minWidth: selectedType === 'SEMANAL' ? 140 : 80,
                          height: selectedType === 'SEMANAL' ? 'auto' : '32px',
                          py: selectedType === 'SEMANAL' ? 1 : 0,
                          fontWeight: selectedPeriod === period.id ? 'bold' : 'normal',
                          '& .MuiChip-label': {
                            display: 'block',
                            whiteSpace: 'normal',
                            textAlign: 'center',
                            lineHeight: 1.2
                          },
                          '&:hover': {
                            bgcolor: selectedPeriod === period.id ? 'primary.main' : 'grey.100'
                          }
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ) : (
                <Typography variant="body2" color="textSecondary" align="center" sx={{ py: 2 }}>
                  No hay períodos disponibles para este tipo de nómina
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ px: 2, py: 1.5 }}>
          <Button 
            onClick={handleClose} 
            variant="outlined" 
            size="small"
            disabled={processing}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleProcess} 
            variant="contained" 
            disabled={!selectedType || !selectedPeriod || loading || processing}
            size="small"
            sx={{ minWidth: 100 }}
          >
            {processing ? <CircularProgress size={16} /> : 'Procesar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Diálogo de resultados */}
      <NominaResultsDialog
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        results={results}
        loading={processing}
      />
    </>
  );
};

export default PayrollProcessor;