from django.apps import AppConfig
import os
import pandas as pd

class GestionConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'gestion'
    
    def ready(self):
        # Precargar tablas ISR en memoria (opcional)
        global TABLAS_ISR
        TABLAS_ISR = {
            'mensual': self._cargar_tabla('tarifa_mensual_isr.csv'),
            'quincenal': self._cargar_tabla('tarifa_quincenal_isr.csv'),
            'semanal': self._cargar_tabla('tarifa_semanal_isr.csv')
        }
    
    def _cargar_tabla(self, nombre_archivo):
        ruta = os.path.join(os.path.dirname(__file__), 'data', nombre_archivo)
        return pd.read_csv(ruta).to_dict('records')