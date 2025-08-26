import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Error, 
  ExpandMore, 
  Print, 
  Download,
  PictureAsPdf,
  Visibility,
  VisibilityOff
} from '@mui/icons-material';
import api from '../../services/api';

const NominaResultsDialog = ({ open, onClose, results, loading }) => {
  const [expandedNominas, setExpandedNominas] = useState({});
  const [showCalculos, setShowCalculos] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!results) return null;

  // Añadir comprobaciones de seguridad para evitar errores
  const { 
    periodo = {}, 
    empresa = {}, 
    procesamiento = {}, 
    nominas = [], 
    errores = [], 
    resumen_financiero = {} 
  } = results;

  // Función para formatear montos de dinero
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(num);
  };

  // Función para formatear fechas - CORREGIDA DEFINITIVAMENTE
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    // Si ya viene en formato día/mes/año, devolver directamente
    if (typeof dateString === 'string' && dateString.includes('/')) {
      return dateString;
    }
    
    try {
      // ✅ SOLUCIÓN: Parsear manualmente el formato YYYY-MM-DD
      if (typeof dateString === 'string' && dateString.includes('-')) {
        const [year, month, day] = dateString.split('-');
        return `${parseInt(day)}/${parseInt(month)}/${year}`;
      }
      
      // Si es otro formato, intentar con Date pero con cuidado
      const date = new Date(dateString);
      const day = date.getUTCDate().toString().padStart(2, '0');
      const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
      const year = date.getUTCFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Función para toggle de expansión de nómina individual
  const toggleNominaExpansion = (nominaId) => {
    setExpandedNominas(prev => ({
      ...prev,
      [nominaId]: !prev[nominaId]
    }));
  };

  // Función para guardar PDF
  const handleSavePDF = async () => {
    try {
      setPdfLoading(true);
      const response = await api.post('/nominas/generar_pdf/', {
        periodo_id: periodo.id,
        empresa_id: empresa.id,
        tipo_periodo: periodo.tipo,
        datos_nomina: results
      });

      // Crear blob para HTML
      const blob = new Blob([response.data], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `nomina_${periodo.etiqueta || 'reporte'}_${empresa.nombre || 'empresa'}.html`
        .replace(/\//g, '_')
        .replace(/\s+/g, '_');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      // Abrir en nueva pestaña para imprimir
      const printWindow = window.open('', '_blank');
      printWindow.document.write(response.data);
      printWindow.document.close();
      
      // Opcional: auto-imprimir
      setTimeout(() => {
        printWindow.print();
      }, 1000);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el reporte. Intente nuevamente.');
    } finally {
      setPdfLoading(false);
    }
  };
  // Función para renderizar detalles específicos según el tipo de nómina
  const renderNominaDetails = (nomina) => {
    const calculos = nomina.calculos || {};
    const percepciones = calculos.percepciones || {};
    const deducciones = calculos.deducciones || {};
    
    return (
      <Box sx={{ mt: 2 }}>
        {/* Información básica */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Información del Empleado
            </Typography>
            <Typography variant="body2">
              <strong>Salario diario:</strong> {formatCurrency(calculos.empleado?.salario_diario)}
            </Typography>
            {calculos.empleado?.sueldo_mensual && (
              <Typography variant="body2">
                <strong>Sueldo mensual:</strong> {formatCurrency(calculos.empleado.sueldo_mensual)}
              </Typography>
            )}
            <Typography variant="body2">
              <strong>Días descanso:</strong> {Array.isArray(calculos.empleado?.dias_descanso) ? 
                calculos.empleado.dias_descanso.join(', ') : 
                calculos.empleado?.dias_descanso || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Detalles del Período
            </Typography>
            <Typography variant="body2">
              <strong>Días trabajados:</strong> {nomina.dias_laborados || 0}
            </Typography>
            <Typography variant="body2">
              <strong>Faltas:</strong> {nomina.faltas_en_periodo || 0}
            </Typography>
            {calculos.periodo?.total_dias && (
              <Typography variant="body2">
                <strong>Total días período:</strong> {calculos.periodo.total_dias}
              </Typography>
            )}
          </Grid>
        </Grid>

        {/* Percepciones y Deducciones */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'success.light' }}>
              <Typography variant="subtitle2" gutterBottom>
                Percepciones
              </Typography>
              {percepciones && (
                <>
                  <Typography variant="body2">
                    <strong>Sueldo:</strong> {formatCurrency(percepciones.sueldo)}
                  </Typography>
                  {percepciones.pago_extra > 0 && (
                    <Typography variant="body2">
                      <strong>Pago extra:</strong> {formatCurrency(percepciones.pago_extra)}
                    </Typography>
                  )}
                  <Typography variant="body2" fontWeight="bold">
                    <strong>Total:</strong> {formatCurrency(percepciones.total)}
                  </Typography>
                </>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, bgcolor: 'error.light' }}>
              <Typography variant="subtitle2" gutterBottom>
                Deducciones
              </Typography>
              {deducciones && (
                <>
                  <Typography variant="body2">
                    <strong>ISR:</strong> {formatCurrency(deducciones.isr)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>IMSS:</strong> {formatCurrency(deducciones.imss)}
                  </Typography>
                  {deducciones.faltas > 0 && (
                    <Typography variant="body2">
                      <strong>Faltas:</strong> {formatCurrency(deducciones.faltas)}
                    </Typography>
                  )}
                  <Typography variant="body2" fontWeight="bold">
                    <strong>Total:</strong> {formatCurrency(deducciones.total)}
                  </Typography>
                </>
              )}
            </Paper>
          </Grid>
        </Grid>

        {/* Botón para mostrar/ocultar cálculos detallados */}
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setShowCalculos(!showCalculos)}
            startIcon={showCalculos ? <VisibilityOff /> : <Visibility />}
          >
            {showCalculos ? 'Ocultar' : 'Mostrar'} Cálculos Detallados
          </Button>
        </Box>

        {/* Cálculos detallados (condicional) */}
        {showCalculos && calculos && (
          <Accordion sx={{ mt: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="subtitle2">Cálculos Detallados</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(calculos, null, 2)}
                </pre>
              </Box>
            </AccordionDetails>
          </Accordion>
        )}
      </Box>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth scroll="paper">
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        textAlign: 'center',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Typography variant="h5" fontWeight="bold">
          RESULTADOS DE PROCESAMIENTO DE NÓMINA
        </Typography>
        <Box>
          <Tooltip title="Descargar reporte">
            <IconButton sx={{ color: 'white' }} onClick={() => window.print()}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ p: 3 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress size={40} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Procesando nómina...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Información del período y empresa */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Información del Período
                  </Typography>
                  <Typography variant="body2">
                    <strong>Tipo:</strong> {periodo.tipo || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Período:</strong> {periodo.etiqueta || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Fechas:</strong> {formatDate(periodo.fecha_inicio)} - {formatDate(periodo.fecha_fin)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Días:</strong> {periodo.total_dias || 'N/A'}
                  </Typography>
                  {periodo.mes && (
                    <Typography variant="body2">
                      <strong>Mes:</strong> {periodo.mes} {periodo.año || ''}
                    </Typography>
                  )}
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="h6" gutterBottom color="primary">
                    Información de la Empresa
                  </Typography>
                  <Typography variant="body2">
                    <strong>Nombre:</strong> {empresa.nombre || 'N/A'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Total empleados:</strong> {empresa.total_empleados || '0'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>ID:</strong> {empresa.id || 'N/A'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* Resumen de procesamiento */}
            <Paper sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: (procesamiento.total_errores || 0) > 0 ? 'warning.light' : 'success.light',
              border: (procesamiento.total_errores || 0) > 0 ? 2 : 0,
              borderColor: (procesamiento.total_errores || 0) > 0 ? 'warning.main' : 'transparent'
            }}>
              <Typography variant="h6" gutterBottom>
                Resumen del Procesamiento
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">
                    <strong>Empleados procesados:</strong> {procesamiento.total_empleados_procesados || '0'}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2" color={(procesamiento.total_errores || 0) > 0 ? 'error' : 'success'}>
                    <strong>Errores:</strong> {procesamiento.total_errores || '0'}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">
                    <strong>Fecha:</strong> {procesamiento.fecha_procesamiento || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Typography variant="body2">
                    <strong>Usuario:</strong> {procesamiento.usuario || 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Resumen financiero */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'info.light' }}>
              <Typography variant="h6" gutterBottom>
                Resumen Financiero
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h6">{formatCurrency(resumen_financiero.total_nomina)}</Typography>
                    <Typography variant="body2">Total Nómina</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'secondary.main', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h6">{formatCurrency(resumen_financiero.promedio_nomina)}</Typography>
                    <Typography variant="body2">Promedio por Empleado</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'success.main', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h6">{formatCurrency(resumen_financiero.total_percepciones)}</Typography>
                    <Typography variant="body2">Total Percepciones</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'error.main', color: 'white', borderRadius: 1 }}>
                    <Typography variant="h6">{formatCurrency(resumen_financiero.total_deducciones)}</Typography>
                    <Typography variant="body2">Total Deducciones</Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Lista de nóminas individuales */}
            <Typography variant="h6" gutterBottom>
              Nóminas Individuales ({nominas.length})
            </Typography>
            
            {nominas.map((nomina, index) => {
              const nominaId = nomina.id_nomina || `nomina-${index}`;
              return (
                <Accordion 
                  key={nominaId}
                  expanded={expandedNominas[nominaId] || false}
                  onChange={() => toggleNominaExpansion(nominaId)}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Grid container alignItems="center">
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {nomina.empleado_nombre || 'Empleado sin nombre'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {nomina.id_empleado || 'N/A'} | Fecha ingreso: {formatDate(nomina.empleado_fecha_ingreso)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
                        <Chip 
                          label={nomina.estado || 'DESCONOCIDO'} 
                          size="small" 
                          color={nomina.estado === 'PENDIENTE' ? 'warning' : 'success'}
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="h6" color="primary" display="inline">
                          {formatCurrency(nomina.salario_neto)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </AccordionSummary>
                  
                  <AccordionDetails>
                    {renderNominaDetails(nomina)}
                  </AccordionDetails>
                </Accordion>
              );
            })}

            {/* Errores si los hay */}
            {errores.length > 0 && (
              <Paper sx={{ p: 2, mt: 3, bgcolor: 'error.light' }}>
                <Typography variant="h6" gutterBottom color="error">
                  <Error sx={{ verticalAlign: 'middle', mr: 1 }} />
                  Errores Encontrados
                </Typography>
                {errores.map((error, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    • {error}
                  </Typography>
                ))}
              </Paper>
            )}
          </>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, bgcolor: 'grey.100' }}>
        <Button onClick={onClose} variant="outlined" size="large">
          Cerrar
        </Button>
        <Button 
          variant="contained" 
          size="large"
          onClick={() => window.print()}
          startIcon={<Print />}
        >
          Imprimir Reporte
        </Button>
        <Button 
          variant="contained" 
          color="secondary" 
          size="large"
          onClick={handleSavePDF}
          disabled={pdfLoading}
          startIcon={pdfLoading ? <CircularProgress size={20} /> : <PictureAsPdf />}
        >
          {pdfLoading ? 'Generando PDF...' : 'Guardar reporte en PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NominaResultsDialog;