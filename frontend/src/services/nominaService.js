// frontend/src/services/nominaService.js
import api from './api';

export const nominaService = {
  async procesarNomina(tipoPeriodo, periodoId, empresaId) {
    try {
      const response = await api.post('/nominas/procesar_nomina/', {
        tipo_periodo: tipoPeriodo,
        periodo_id: periodoId,
        empresa_id: empresaId
      });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al procesar nómina');
    }
  },

  async obtenerResultadosNomina(nominaId) {
    try {
      const response = await api.get(`/nominas/resultados/${nominaId}/`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Error al obtener resultados');
    }
  }
};