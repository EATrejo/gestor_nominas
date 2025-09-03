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
  useMediaQuery,
  useTheme,
  Divider
} from '@mui/material';
import { 
  Print, 
  Close,
  ArrowBack
} from '@mui/icons-material';

const NominaResultsDialog = ({ open, onClose, results, loading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [selectedNomina, setSelectedNomina] = useState(null);

  if (!results) return null;

  // Función para formatear montos de dinero
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
    
    if (typeof amount === 'object') {
      return '$0.00';
    }
    
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(num);
  };

  // Función para formatear fechas
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    
    if (typeof dateString === 'string' && dateString.includes('/')) {
      return dateString;
    }
    
    try {
      if (typeof dateString === 'string' && dateString.includes('-')) {
        const [year, month, day] = dateString.split('-');
        return `${parseInt(day)}/${parseInt(month)}/${year}`;
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const { 
    periodo = {}, 
    empresa = {}, 
    nominas = [], 
    errores = []
  } = results;

  // Función para renderizar el recibo de nómina individual completo
  const renderNominaReciboCompleto = (nomina) => {
    const calculos = nomina.calculos || {};
    const resumen = calculos.resumen || {};
    const sbc = calculos.sbc || {};
    
    return (
      <Box sx={{ 
        p: isMobile ? 1 : 3, 
        backgroundColor: 'white',
        minHeight: '100%'
      }}>
        {/* Encabezado de la empresa */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {empresa.nombre || 'EMPRESA'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Recibo de Nómina - {periodo.tipo || 'QUINCENAL'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {periodo.etiqueta || 'Período'} | {formatDate(periodo.fecha_inicio)} - {formatDate(periodo.fecha_fin)}
          </Typography>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Información del empleado */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
            {nomina.empleado_nombre || 'Empleado'}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>ID Empleado:</strong> {nomina.id_empleado || 'N/A'}</Typography>
              <Typography variant="body2"><strong>Fecha ingreso:</strong> {formatDate(nomina.empleado_fecha_ingreso)}</Typography>
              <Typography variant="body2"><strong>Salario diario:</strong> {formatCurrency(calculos.empleado?.salario_diario)}</Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="body2"><strong>Días descanso:</strong> {calculos.empleado?.dias_descanso || 'N/A'}</Typography>
              <Typography variant="body2"><strong>Régimen:</strong> Sueldos y Salarios</Typography>
              <Typography variant="body2"><strong>Departamento:</strong> ADMINISTRACIÓN</Typography>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Detalles del período */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Detalles del Período
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="h6" color="primary">
                  {nomina.dias_laborados || 0}
                </Typography>
                <Typography variant="body2">Días trabajados</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="h6" color={nomina.faltas_en_periodo > 0 ? 'error' : 'success'}>
                  {nomina.faltas_en_periodo || 0}
                </Typography>
                <Typography variant="body2">Faltas</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="h6">
                  {calculos.periodo?.total_dias || 'N/A'}
                </Typography>
                <Typography variant="body2">Total días</Typography>
              </Box>
            </Grid>
            <Grid item xs={6} md={3}>
              <Box sx={{ textAlign: 'center', p: 1, border: '1px solid #ddd', borderRadius: 1 }}>
                <Typography variant="h6">
                  {calculos.empleado?.dias_faltados_real || 0}
                </Typography>
                <Typography variant="body2">Días faltados</Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Salario Base de Cotización */}
        {sbc && sbc.diario && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Salario Base de Cotización (SBC)
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2"><strong>SBC Diario:</strong> {formatCurrency(sbc.diario)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2"><strong>SBC Período:</strong> {formatCurrency(sbc.periodo)}</Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2"><strong>Factor Integración:</strong> {sbc.factor_integracion || '1.0493'}</Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        <Divider sx={{ mb: 2 }} />

        {/* SECCIÓN RESUMEN */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: 'primary.main' }}>
            RESUMEN DE NÓMINA
          </Typography>
          
          {/* Salario Bruto */}
          {resumen.salario_bruto !== undefined && (
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={8}>
                <Typography variant="body2"><strong>Salario bruto:</strong></Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2">{formatCurrency(resumen.salario_bruto)}</Typography>
              </Grid>
            </Grid>
          )}

          {/* Ajustes */}
          {resumen.ajustes && (
            <Box sx={{ mb: 2, pl: 2, borderLeft: '2px solid #eee' }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Ajustes:
              </Typography>
              
              {resumen.ajustes.dias_no_trabajados_por_ingreso && (
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      Días no trabajados por ingreso ({resumen.ajustes.dias_no_trabajados_por_ingreso.dias || 0} días):
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2">
                      {formatCurrency(resumen.ajustes.dias_no_trabajados_por_ingreso.monto || 0)}
                    </Typography>
                  </Grid>
                  {resumen.ajustes.dias_no_trabajados_por_ingreso.nota && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        {resumen.ajustes.dias_no_trabajados_por_ingreso.nota}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
              
              {resumen.ajustes.faltas_justificadas && (
                <Grid container spacing={1} sx={{ mb: 1 }}>
                  <Grid item xs={8}>
                    <Typography variant="body2">
                      Faltas justificadas ({resumen.ajustes.faltas_justificadas.dias || 0} días):
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2">
                      {formatCurrency(resumen.ajustes.faltas_justificadas.monto || 0)}
                    </Typography>
                  </Grid>
                  {resumen.ajustes.faltas_justificadas.nota && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="text.secondary">
                        {resumen.ajustes.faltas_justificadas.nota}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              )}
              
              {resumen.ajustes.total_ajustes !== undefined && (
                <Grid container spacing={1}>
                  <Grid item xs={8}>
                    <Typography variant="body2" fontWeight="bold">
                      Total ajustes:
                    </Typography>
                  </Grid>
                  <Grid item xs={4} sx={{ textAlign: 'right' }}>
                    <Typography variant="body2" fontWeight="bold">
                      {formatCurrency(resumen.ajustes.total_ajustes)}
                    </Typography>
                  </Grid>
                </Grid>
              )}
            </Box>
          )}

          {/* Salario Bruto Ajustado */}
          {resumen.salario_bruto_ajustado !== undefined && (
            <Grid container spacing={1} sx={{ mb: 2 }}>
              <Grid item xs={8}>
                <Typography variant="body2"><strong>Salario bruto ajustado:</strong></Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body2">{formatCurrency(resumen.salario_bruto_ajustado)}</Typography>
              </Grid>
            </Grid>
          )}

          {/* Percepciones */}
          {resumen.total_percepciones && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Percepciones:
              </Typography>
              <Grid container spacing={1}>
                {resumen.total_percepciones.Sueldo !== undefined && (
                  <>
                    <Grid item xs={8}>
                      <Typography variant="body2">Sueldo:</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(resumen.total_percepciones.Sueldo)}</Typography>
                    </Grid>
                  </>
                )}
                
                {resumen.total_percepciones['Prima dominical'] > 0 && (
                  <>
                    <Grid item xs={8}>
                      <Typography variant="body2">Prima dominical:</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(resumen.total_percepciones['Prima dominical'])}</Typography>
                    </Grid>
                  </>
                )}
                
                {resumen.total_percepciones['Pago festivos'] > 0 && (
                  <>
                    <Grid item xs={8}>
                      <Typography variant="body2">Pago festivos:</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(resumen.total_percepciones['Pago festivos'])}</Typography>
                    </Grid>
                  </>
                )}
                
                {resumen.total_percepciones.Total !== undefined && (
                  <>
                    <Grid item xs={8}>
                      <Typography variant="body2" fontWeight="bold">Total percepciones:</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight="bold">{formatCurrency(resumen.total_percepciones.Total)}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}

          {/* Deducciones */}
          {resumen.deducciones && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" fontWeight="bold" gutterBottom>
                Deducciones:
              </Typography>
              <Grid container spacing={1}>
                {resumen.deducciones.IMSS !== undefined && (
                  <>
                    <Grid item xs={8}>
                      <Typography variant="body2">IMSS:</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(resumen.deducciones.IMSS)}</Typography>
                    </Grid>
                  </>
                )}
                
                {resumen.deducciones.ISR !== undefined && (
                  <>
                    <Grid item xs={8}>
                      <Typography variant="body2">ISR:</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(resumen.deducciones.ISR)}</Typography>
                    </Grid>
                  </>
                )}
                
                {resumen.deducciones.FALTAS_INJUSTIFICADAS > 0 && (
                  <>
                    <Grid item xs={8}>
                      <Typography variant="body2">Faltas injustificadas:</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2">{formatCurrency(resumen.deducciones.FALTAS_INJUSTIFICADAS)}</Typography>
                    </Grid>
                  </>
                )}
                
                {resumen.deducciones.total_deducciones !== undefined && (
                  <>
                    <Grid item xs={8}>
                      <Typography variant="body2" fontWeight="bold">Total deducciones:</Typography>
                    </Grid>
                    <Grid item xs={4} sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight="bold">{formatCurrency(resumen.deducciones.total_deducciones)}</Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}

          {/* Neto a pagar */}
          {resumen.neto_a_pagar !== undefined && (
            <Grid container spacing={1} sx={{ mb: 1 }}>
              <Grid item xs={8}>
                <Typography variant="body1" fontWeight="bold">
                  Neto a pagar:
                </Typography>
              </Grid>
              <Grid item xs={4} sx={{ textAlign: 'right' }}>
                <Typography variant="body1" fontWeight="bold">
                  {formatCurrency(resumen.neto_a_pagar)}
                </Typography>
              </Grid>
            </Grid>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Total a pagar destacado */}
        {resumen.neto_a_pagar !== undefined && (
          <Box sx={{ 
            p: 2, 
            backgroundColor: 'primary.main', 
            color: 'white', 
            borderRadius: 2,
            textAlign: 'center',
            mb: 2
          }}>
            <Typography variant="h5" fontWeight="bold">
              NETO A PAGAR: {formatCurrency(resumen.neto_a_pagar)}
            </Typography>
          </Box>
        )}

        {/* Información adicional */}
        <Box sx={{ 
          p: 2, 
          backgroundColor: 'grey.100', 
          borderRadius: 1,
          mb: 2
        }}>
          <Typography variant="body2" gutterBottom>
            <strong>Forma de pago:</strong> Transferencia electrónica
          </Typography>
          <Typography variant="body2" gutterBottom>
            <strong>Fecha de pago:</strong> {formatDate(periodo.fecha_fin)}
          </Typography>
          <Typography variant="body2">
            <strong>Estado:</strong> 
            <Chip 
              label={nomina.estado || 'PENDIENTE'} 
              size="small" 
              color={nomina.estado === 'PENDIENTE' ? 'warning' : 'success'}
              sx={{ ml: 1 }}
            />
          </Typography>
        </Box>

        {/* Firma */}
        <Box sx={{ 
          mt: 3, 
          p: 2, 
          borderTop: '1px dashed #ccc',
          textAlign: 'center'
        }}>
          <Typography variant="body2" color="text.secondary">
            __________________________
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Firma del empleado
          </Typography>
        </Box>
      </Box>
    );
  };

  // Función para renderizar la lista de nóminas
  const renderNominasList = () => {
    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
          Nóminas Procesadas ({nominas.length})
        </Typography>
        
        <Grid container spacing={2}>
          {nominas.map((nomina, index) => (
            <Grid item xs={12} key={nomina.id_nomina || index}>
              <Paper 
                sx={{ 
                  p: 2, 
                  cursor: 'pointer',
                  border: selectedNomina === index ? 2 : 1,
                  borderColor: selectedNomina === index ? 'primary.main' : 'grey.300',
                  '&:hover': { 
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                  }
                }}
                onClick={() => setSelectedNomina(index)}
              >
                <Grid container alignItems="center" spacing={2}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {nomina.empleado_nombre || 'Empleado sin nombre'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ID: {nomina.id_empleado || 'N/A'} | Fecha ingreso: {formatDate(nomina.empleado_fecha_ingreso)}
                    </Typography>
                    <Typography variant="body2">
                      Días trabajados: {nomina.dias_laborados} | Faltas: {nomina.faltas_en_periodo}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                    <Chip 
                      label={nomina.estado || 'PENDIENTE'} 
                      color={nomina.estado === 'PENDIENTE' ? 'warning' : 'success'}
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="h6" color="primary">
                      {formatCurrency(nomina.salario_neto)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          ))}
        </Grid>

        {/* Errores si los hay */}
        {errores.length > 0 && (
          <Paper sx={{ p: 2, mt: 3, bgcolor: 'error.light' }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Errores en el Procesamiento ({errores.length})
            </Typography>
            {errores.map((error, index) => (
              <Box key={index} sx={{ mb: 2, p: 1, backgroundColor: 'white', borderRadius: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {error.empleado} (ID: {error.id_empleado})
                </Typography>
                <Typography variant="body2" color="error">
                  {error.error}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Período: {error.periodo} | Tipo: {error.tipo_error}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}
      </Box>
    );
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth 
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ 
        bgcolor: 'primary.main', 
        color: 'white', 
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {selectedNomina !== null && (
            <Button
              sx={{ color: 'white', mr: 2, minWidth: 'auto' }}
              onClick={() => setSelectedNomina(null)}
            >
              <ArrowBack />
            </Button>
          )}
          <Typography variant="h6" fontWeight="bold">
            {selectedNomina !== null ? 'RECIBO DE NÓMINA' : `NÓMINAS - ${periodo.etiqueta || 'PERÍODO'}`}
          </Typography>
        </Box>
        <Button
          sx={{ color: 'white', minWidth: 'auto' }}
          onClick={onClose}
        >
          <Close />
        </Button>
      </DialogTitle>
      
      <DialogContent sx={{ p: 0, backgroundColor: isMobile ? 'white' : 'grey.50' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress size={40} />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Procesando nómina...
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: isMobile ? 1 : 3 }}>
            {selectedNomina !== null ? (
              // Vista individual de recibo
              renderNominaReciboCompleto(nominas[selectedNomina])
            ) : (
              // Vista de lista de nóminas
              <>
                {/* Información general */}
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Información del Período
                      </Typography>
                      <Typography variant="body2">
                        <strong>Período:</strong> {periodo.etiqueta || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Fechas:</strong> {formatDate(periodo.fecha_inicio)} - {formatDate(periodo.fecha_fin)}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Total días:</strong> {periodo.total_dias || 'N/A'}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        Información de la Empresa
                      </Typography>
                      <Typography variant="body2">
                        <strong>Nombre:</strong> {empresa.nombre || 'N/A'}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Total empleados procesados:</strong> {nominas.length}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Lista de nóminas */}
                {renderNominasList()}
              </>
            )}
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ p: 2, bgcolor: 'grey.100' }}>
        {selectedNomina !== null ? (
          // Botones para vista individual
          <>
            <Button 
              onClick={() => setSelectedNomina(null)} 
              variant="outlined"
              startIcon={<ArrowBack />}
            >
              Volver a la lista
            </Button>
            <Button 
              variant="contained" 
              onClick={() => window.print()}
              startIcon={<Print />}
            >
              Imprimir Recibo
            </Button>
          </>
        ) : (
          // Botones para vista de lista
          <>
            <Button onClick={onClose} variant="outlined">
              Cerrar
            </Button>
            <Button 
              variant="contained" 
              onClick={() => window.print()}
              startIcon={<Print />}
            >
              Imprimir Reporte
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default NominaResultsDialog;