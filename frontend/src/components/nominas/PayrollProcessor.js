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
} from '@mui/material';
import api from '../../services/api';
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

  // Función de saneamiento:
  const sanitizePayrollResults = (data) => {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    
    // Sanear nominas individuales
    if (Array.isArray(sanitized.nominas)) {
      sanitized.nominas = sanitized.nominas.map(nomina => {
        if (nomina.calculos && typeof nomina.calculos === 'object') {
          return {
            ...nomina,
            calculos: JSON.parse(JSON.stringify(nomina.calculos)) // Convertir a objeto simple
          };
        }
        return nomina;
      });
    }
    
    return sanitized;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha no disponible';
    try {
      const [year, month, day] = dateString.split('-');
      return `${parseInt(day)}/${parseInt(month)}/${year}`;
    } catch (error) {
      console.error('Error formateando fecha:', error, dateString);
      return 'Fecha inválida';
    }
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

      console.log('🔍 Solicitando períodos para:', type);
      const response = await api.get(`/nominas/list_periodos/?tipo=${type}`);
      
      console.log('✅ RESPONSE DEL BACKEND - PERIODOS:', {
        url: response.config.url,
        status: response.status,
        data: response.data
      });
      
      if (response.data?.periodos) {
        console.log('📋 LISTA COMPLETA DE PERIODOS:');
        response.data.periodos.forEach((periodo, index) => {
          console.log(`   ${index + 1}. ${periodo.etiqueta}: ${periodo.fecha_inicio} a ${periodo.fecha_fin} (${periodo.total_dias} días)`);
        });
        
        const agosto01 = response.data.periodos.find(p => p.etiqueta === 'AGOSTO/01');
        if (agosto01) {
          console.log('✅ AGOSTO/01 ENCONTRADO EN RESPUESTA:', agosto01);
        }
      }
      
      if (response.data?.periodos) {
        setPeriods(response.data.periodos);
      } else {
        setError('No hay períodos disponibles');
      }
    } catch (err) {
      console.error('❌ Error fetching periods:', err);
      if (err.response?.status === 401) {
        setError('Sesión expirada. Por favor, inicie sesión nuevamente.');
      } else if (err.response?.status === 404) {
        setError('Endpoint no encontrado. Contacte al administrador.');
      } else if (err.response?.status === 500) {
        setError('Error del servidor. Intente más tarde.');
      } else {
        // ✅ ERROR YA NORMALIZADO POR EL INTERCEPTOR
        setError(err.message || 'Error al cargar los períodos. Verifique su conexión.');
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

        console.log('🚀 Enviando payload para procesar nómina:', payload);
        const response = await api.post('/nominas/procesar_nomina/', payload);
        
        console.log('✅ Respuesta de procesamiento:', {
          status: response.status,
          data: response.data
        });
        
        // Validar y sanear la respuesta
        const sanitizedResults = sanitizePayrollResults(response.data);
        setResults(sanitizedResults);
        setResultsOpen(true);
        
      } catch (error) {
        console.error('❌ Error processing payroll:', error);
        // ✅ ERROR YA NORMALIZADO POR EL INTERCEPTOR
        setError(error.message || 'Error al procesar la nómina');
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
                  
                  <Box sx={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: 1,
                    maxHeight: 300,
                    overflowY: 'auto',
                    p: 1,
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 1,
                    bgcolor: 'grey.50'
                  }}>
                    {periods.map((period) => (
                      <Paper
                        key={period.id}
                        elevation={selectedPeriod === period.id ? 3 : 1}
                        onClick={() => setSelectedPeriod(period.id)}
                        sx={{
                          p: 1.5,
                          textAlign: 'center',
                          cursor: 'pointer',
                          bgcolor: selectedPeriod === period.id ? 'primary.main' : 'grey.50',
                          color: selectedPeriod === period.id ? 'white' : 'text.primary',
                          borderRadius: 1,
                          minWidth: 140,
                          flex: '0 0 auto',
                          '&:hover': {
                            bgcolor: selectedPeriod === period.id ? 'primary.dark' : 'grey.200'
                          },
                          transition: 'all 0.2s ease-in-out'
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold">
                          {period.etiqueta}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
                          {formatDate(period.fecha_inicio)} - {formatDate(period.fecha_fin)}
                        </Typography>
                        <Typography variant="caption" sx={{ display: 'block', fontSize: '0.7rem', opacity: 0.8 }}>
                          {period.total_dias} días
                        </Typography>
                      </Paper>
                    ))}
                  </Box>

                  {selectedPeriod && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
                      <Typography variant="body2" fontWeight="bold" color="success.dark">
                        ✅ Período seleccionado:
                      </Typography>
                      <Typography variant="body2">
                        <strong>ID:</strong> {selectedPeriod}
                      </Typography>
                      {periods.find(p => p.id === selectedPeriod) && (
                        <>
                          <Typography variant="body2">
                            <strong>Fechas:</strong> {formatDate(periods.find(p => p.id === selectedPeriod).fecha_inicio)} - {formatDate(periods.find(p => p.id === selectedPeriod).fecha_fin)}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Días:</strong> {periods.find(p => p.id === selectedPeriod).total_dias}
                          </Typography>
                        </>
                      )}
                    </Box>
                  )}
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