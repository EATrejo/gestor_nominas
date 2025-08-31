import csv
import os
import pandas as pd
from decimal import Decimal, getcontext, InvalidOperation
from datetime import date, datetime, timedelta
import json

# =============================================
# CONSTANTES Y CONFIGURACIONES
# =============================================

# Salarios mínimos 2025
SALARIO_MINIMO_GENERAL_2025 = Decimal('278.80')
SALARIO_MINIMO_FRONTERA_2025 = Decimal('419.88')

# Configuración para decimales
getcontext().prec = 10

# Días festivos oficiales de México para 2025
DIAS_FESTIVOS_2025 = [
    date(2025, 1, 1),    # Año Nuevo
    date(2025, 2, 3),    # Primer lunes de febrero
    date(2025, 3, 17),   # Natalicio Benito Juárez
    date(2025, 5, 1),    # Día del Trabajo
    date(2025, 9, 16),   # Día de la Independencia
    date(2025, 11, 17),  # Día de la Revolución
    date(2025, 12, 25)   # Navidad
]

# Constantes ISR
UMA_DIARIA_2025 = Decimal('113.14')
MAX_AGUINALDO_EXENTO = 30 * UMA_DIARIA_2025  # 30 días de UMA
MAX_PRIMA_VACACIONAL_EXENTA = 15 * UMA_DIARIA_2025  # 15 días de UMA
MAX_PRIMA_DOMINICAL_EXENTA = UMA_DIARIA_2025  # 1 UMA por domingo trabajado

# =============================================
# CLASES AUXILIARES
# =============================================

class DecimalEncoder(json.JSONEncoder):
    """Encoder personalizado para manejar objetos Decimal en serialización JSON"""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

class CalculadoraIMSS:
    """Clase para cálculos IMSS con factor de integración 1.0493"""
    
    # Constantes 2025
    UMA_2025 = Decimal('113.14')
    FACTOR_INTEGRACION = Decimal('1.0493')
    
    # Porcentajes de cuotas (decimal)
    CUOTAS_IMSS = {
        'prestaciones_dinero': Decimal('0.0025'),     # 0.25%
        'prestaciones_especies': Decimal('0.00375'),  # 0.375%
        'invalidez_vida': Decimal('0.00625'),        # 0.625%
        'cesantia_vejez': Decimal('0.01125'),        # 1.125%
        'excedente_especies': Decimal('0.0040')      # 0.40% (nuevo)
    }

    def __init__(self, salario_diario):
        try:
            self.salario_diario = Decimal(str(float(salario_diario)))
        except (ValueError, InvalidOperation, TypeError):
            raise ValueError("El salario diario debe ser un valor numérico válido")

    def calcular_sbc(self):
        """Calcula Salario Base de Cotización"""
        return (self.salario_diario * self.FACTOR_INTEGRACION).quantize(Decimal('0.01'))

    def calcular_cuotas(self, dias):
        """Calcula las cuotas IMSS incluyendo el excedente del 0.40%"""
        try:
            dias_int = int(dias)
            if dias_int <= 0:
                raise ValueError("Días trabajados debe ser mayor a 0")
            dias_decimal = Decimal(str(dias_int))
        except (ValueError, TypeError):
            raise ValueError("Días trabajados debe ser un número entero válido")

        sbc = self.calcular_sbc()
        sbc_periodo = sbc * dias_decimal
        
        # Calcular excedente sobre 3 UMA
        tres_uma = Decimal('3') * self.UMA_2025
        excedente = max(Decimal('0'), sbc - tres_uma)
        cuota_excedente = excedente * self.CUOTAS_IMSS['excedente_especies'] * dias_decimal

        return {
            'prestaciones_dinero': (sbc_periodo * self.CUOTAS_IMSS['prestaciones_dinero']).quantize(Decimal('0.01')),
            'prestaciones_especies': (sbc_periodo * self.CUOTAS_IMSS['prestaciones_especies']).quantize(Decimal('0.01')),
            'invalidez_vida': (sbc_periodo * self.CUOTAS_IMSS['invalidez_vida']).quantize(Decimal('0.01')),
            'cesantia_vejez': (sbc_periodo * self.CUOTAS_IMSS['cesantia_vejez']).quantize(Decimal('0.01')),
            'excedente_especies': cuota_excedente.quantize(Decimal('0.01')),
            'base_excedente': excedente.quantize(Decimal('0.01')),
            'tres_uma': tres_uma.quantize(Decimal('0.01'))
        }

# =============================================
# FUNCIONES AUXILIARES
# =============================================

def serialize_decimal(obj):
    """Función auxiliar para convertir recursivamente Decimal a float"""
    if isinstance(obj, Decimal):
        return float(obj)
    elif isinstance(obj, dict):
        return {k: serialize_decimal(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [serialize_decimal(item) for item in obj]
    return obj

def es_dia_festivo(fecha):
    """Determina si una fecha es día festivo oficial"""
    return fecha in DIAS_FESTIVOS_2025

def calcular_dias_festivos(fecha_inicio, fecha_fin):
    """Calcula cuántos días festivos hay en un rango de fechas"""
    return sum(1 for dia in DIAS_FESTIVOS_2025 if fecha_inicio <= dia <= fecha_fin)

def cargar_tabla_subsidio_semanal():
    """Carga la tabla exacta de subsidio semanal desde el CSV"""
    try:
        ruta = os.path.join(os.path.dirname(__file__), 'data', 'tabla_subsidio_semanal.csv')
        with open(ruta, mode='r') as file:
            reader = csv.DictReader(file)
            tabla = []
            for row in reader:
                limite_superior = row['Hasta ingresos de'].strip()
                if limite_superior == 'En adelante':
                    limite_superior = '999999.99'
                
                tabla.append({
                    'limite_inferior': Decimal(row['Ingresos de'].strip()),
                    'limite_superior': Decimal(limite_superior.replace(',', '')),
                    'subsidio': Decimal(row['Subsidio semanal'].strip())
                })
            return tabla
    except Exception as e:
        raise ValueError(f"Error al cargar tabla de subsidio semanal: {str(e)}")

def obtener_subsidio_semanal(salario_semanal):
    """Obtiene el subsidio correspondiente al salario semanal según la tabla"""
    try:
        salario = Decimal(str(salario_semanal))
        tabla_subsidio = cargar_tabla_subsidio_semanal()
        
        for rango in tabla_subsidio:
            if rango['limite_inferior'] <= salario <= rango['limite_superior']:
                return rango['subsidio'].quantize(Decimal('0.01'))
        
        return Decimal('0.00')
    except Exception as e:
        raise ValueError(f"Error al calcular subsidio semanal: {str(e)}")

def obtener_subsidio_mensual(salario_mensual):
    """
    Calcula el subsidio para el empleado según tabla vigente desde febrero 2025
    Args:
        salario_mensual: Decimal con el salario mensual gravado
    
    Returns:
        Decimal: subsidio correspondiente
    
    Raises:
        ValueError: Si hay error en el cálculo
    """
    try:
        salario = Decimal(str(salario_mensual)).quantize(Decimal('0.01'))
        
        # Tabla de subsidio mensual vigente desde febrero 2025
        tabla_subsidio = [
            {'limite_inferior': Decimal('0.01'), 'limite_superior': Decimal('1947.54'), 'subsidio': Decimal('407.02')},
            {'limite_inferior': Decimal('1947.55'), 'limite_superior': Decimal('2460.96'), 'subsidio': Decimal('406.83')},
            {'limite_inferior': Decimal('2460.97'), 'limite_superior': Decimal('2619.48'), 'subsidio': Decimal('406.62')},
            {'limite_inferior': Decimal('2619.49'), 'limite_superior': Decimal('2953.86'), 'subsidio': Decimal('392.77')},
            {'limite_inferior': Decimal('2953.87'), 'limite_superior': Decimal('3460.27'), 'subsidio': Decimal('382.46')},
            {'limite_inferior': Decimal('3460.28'), 'limite_superior': Decimal('3957.70'), 'subsidio': Decimal('354.23')},
            {'limite_inferior': Decimal('3957.71'), 'limite_superior': Decimal('4688.51'), 'subsidio': Decimal('324.87')},
            {'limite_inferior': Decimal('4688.52'), 'limite_superior': Decimal('5234.94'), 'subsidio': Decimal('294.63')},
            {'limite_inferior': Decimal('5234.95'), 'limite_superior': Decimal('6054.43'), 'subsidio': Decimal('253.54')},
            {'limite_inferior': Decimal('6054.44'), 'limite_superior': Decimal('6617.27'), 'subsidio': Decimal('217.61')},
            {'limite_inferior': Decimal('6617.28'), 'limite_superior': Decimal('7382.33'), 'subsidio': Decimal('191.57')},
            {'limite_inferior': Decimal('7382.34'), 'limite_superior': Decimal('7756.53'), 'subsidio': Decimal('149.29')},
            {'limite_inferior': Decimal('7756.54'), 'limite_superior': Decimal('8332.05'), 'subsidio': Decimal('114.24')},
            {'limite_inferior': Decimal('8332.06'), 'limite_superior': Decimal('9245.44'), 'subsidio': Decimal('69.66')},
            {'limite_inferior': Decimal('9245.45'), 'limite_superior': Decimal('999999.99'), 'subsidio': Decimal('0.00')},
        ]
        
        for rango in tabla_subsidio:
            if rango['limite_inferior'] <= salario <= rango['limite_superior']:
                return rango['subsidio'].quantize(Decimal('0.01'))
        
        return Decimal('0.00')
    
    except InvalidOperation as e:
        raise ValueError(f"Valor de salario no válido: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error al calcular subsidio mensual: {str(e)}")

def calcular_prima_dominical(empleado, fecha_inicio, fecha_fin):
    """
    Calcula la prima dominical para un empleado en un periodo, considerando:
    - Fecha de ingreso del empleado (no se pagan domingos anteriores al ingreso)
    - Días de descanso configurados
    - Faltas registradas
    - Exención de 1 UMA diaria por domingo trabajado

    Versión mejorada con:
    - Manejo robusto de conversiones decimales
    - Validación de atributos
    - Metadatos mejorados
    - Retrocompatibilidad garantizada

    Args:
        empleado: Objeto con:
            - dias_descanso: Lista de días de descanso (0=lunes, 6=domingo)
            - fecha_ingreso: datetime.date con fecha de contratación
            - salario_diario: Decimal/float con salario diario
            - fechas_faltas: Lista de strings con fechas de faltas ('YYYY-MM-DD')
        fecha_inicio: datetime.date - Inicio del periodo
        fecha_fin: datetime.date - Fin del periodo

    Returns:
        dict: {
            'prima_dominical': float,    # Total prima dominical
            'uma_diaria': float,         # Valor UMA vigente
            'excedente_uma': float,      # Excedente gravable para ISR
            'domingos_trabajados': int,  # Domingos efectivamente pagados
            'domingos_faltados': int,    # Domingos con falta registrada
            'prima_por_domingo': float,  # Prima por cada domingo
            'excedente_por_domingo': float,  # Excedente promedio por domingo
            'domingos_no_pagados': list, # Domingos no pagados con motivo
            'metadatos': dict            # Información detallada sobre cálculos
        }

    Raises:
        ValueError: Si hay errores en los parámetros de entrada con mensajes descriptivos
    """
    # Validación inicial de parámetros con mensajes más descriptivos
    if not isinstance(fecha_inicio, date) or not isinstance(fecha_fin, date):
        raise ValueError("Las fechas deben ser objetos date")
        
    if fecha_inicio > fecha_fin:
        raise ValueError(f"La fecha de inicio ({fecha_inicio}) no puede ser posterior a la fecha final ({fecha_fin})")

    # Validación de atributos del empleado con hasattr()
    atributos_requeridos = ['fecha_ingreso', 'dias_descanso']
    for attr in atributos_requeridos:
        if not hasattr(empleado, attr):
            raise AttributeError(f"El objeto empleado debe tener atributo '{attr}'")

    try:
        # CONSTANTES CON VALIDACIÓN
        UMA_DIARIA = Decimal('113.14')  # Valor UMA 2025
        
        # CONVERSIÓN SEGURA DEL SALARIO (compatible con todos los tipos de nómina)
        try:
            if hasattr(empleado, 'salario_diario') and empleado.salario_diario is not None:
                salario_diario = Decimal(str(empleado.salario_diario)).quantize(Decimal('0.01'))
            elif hasattr(empleado, 'sueldo_mensual') and empleado.sueldo_mensual is not None:
                salario_diario = (Decimal(str(empleado.sueldo_mensual)) / Decimal('30')).quantize(Decimal('0.01'))
            else:
                raise ValueError("No se pudo determinar el salario diario (falta salario_diario o sueldo_mensual)")
                
            if salario_diario <= Decimal('0'):
                raise ValueError("El salario diario debe ser mayor a 0")
        except (InvalidOperation, TypeError, ValueError) as e:
            raise ValueError(f"Error en el salario del empleado {getattr(empleado, 'nombre_completo', '')}: {str(e)}")

        # CÁLCULO DE PRIMA POR DOMINGO CON VALIDACIÓN
        prima_por_domingo = (salario_diario * Decimal('0.25')).quantize(Decimal('0.01'))
        if prima_por_domingo < Decimal('0'):
            raise ValueError("La prima por domingo no puede ser negativa")

        # ESTRUCTURA DE RESULTADOS MEJORADA (todos los valores como Decimal inicialmente)
        resultado = {
            'prima_dominical': Decimal('0'),
            'uma_diaria': UMA_DIARIA,
            'excedente_uma': Decimal('0'),
            'domingos_trabajados': 0,
            'domingos_faltados': 0,
            'prima_por_domingo': prima_por_domingo,
            'excedente_por_domingo': Decimal('0'),
            'domingos_no_pagados': [],
            'metadatos': {
                'fecha_ingreso': empleado.fecha_ingreso.strftime('%Y-%m-%d'),
                'salario_diario_considerado': float(salario_diario),
                'prima_porcentaje': '25%',
                'uma_diaria': float(UMA_DIARIA),
                'version_calculo': '2.3',
                'validaciones': {
                    'tiene_fechas_faltas': hasattr(empleado, 'fechas_faltas'),
                    'dias_descanso_configurados': len(getattr(empleado, 'dias_descanso', []))
                }
            }
        }

        # CASOS ESPECIALES (sin cambios en la lógica)
        # 1. Domingo es día de descanso
        if 6 in empleado.dias_descanso:
            resultado['metadatos']['motivo'] = 'domingo_es_dia_descanso'
            return _convertir_decimales_a_float(resultado)

        # 2. Empleado ingresó después del periodo
        if empleado.fecha_ingreso > fecha_fin:
            resultado['metadatos']['motivo'] = 'ingreso_posterior_al_periodo'
            return _convertir_decimales_a_float(resultado)

        # CÁLCULO PRINCIPAL (periodo donde el empleado ya estaba contratado)
        fecha_inicio_calc = max(fecha_inicio, empleado.fecha_ingreso)
        delta_dias = (fecha_fin - fecha_inicio_calc).days

        for i in range(delta_dias + 1):
            dia_actual = fecha_inicio_calc + timedelta(days=i)
            
            if dia_actual.weekday() == 6:  # Es domingo
                fecha_str = dia_actual.strftime('%Y-%m-%d')
                
                # Verificar faltas (con manejo seguro si no existe el atributo)
                if hasattr(empleado, 'fechas_faltas') and fecha_str in empleado.fechas_faltas:
                    resultado['domingos_faltados'] += 1
                    resultado['domingos_no_pagados'].append({
                        'fecha': fecha_str,
                        'motivo': 'falta_registrada',
                        'dia_semana': 'Domingo'
                    })
                    continue
                
                # Domingo trabajado válido
                resultado['domingos_trabajados'] += 1
                excedente_dia = max(prima_por_domingo - UMA_DIARIA, Decimal('0'))
                resultado['excedente_uma'] += excedente_dia

        # CÁLCULO DE TOTALES (con validación de división por cero)
        if resultado['domingos_trabajados'] > 0:
            resultado['prima_dominical'] = (prima_por_domingo * resultado['domingos_trabajados']).quantize(Decimal('0.01'))
            resultado['excedente_por_domingo'] = (
                resultado['excedente_uma'] / Decimal(resultado['domingos_trabajados'])
            ).quantize(Decimal('0.01'))
        else:
            resultado['metadatos']['motivo'] = 'no_hay_domingos_trabajados'

        # Conversión final a float (solo para campos numéricos)
        return _convertir_decimales_a_float(resultado)

    except Exception as error:
        error_msg = f"Error calculando prima dominical para {getattr(empleado, 'nombre_completo', 'empleado')}: {str(error)}"
        if hasattr(error, 'args') and error.args:
            error_msg += f" - Detalle: {error.args[0]}"
        raise ValueError(error_msg) from error


def _convertir_decimales_a_float(resultado):
    """Función auxiliar para convertir campos Decimal a float"""
    decimal_fields = ['prima_dominical', 'uma_diaria', 'excedente_uma', 
                     'prima_por_domingo', 'excedente_por_domingo']
    
    return {
        k: float(v.quantize(Decimal('0.01'))) if isinstance(v, Decimal) else v
        for k, v in resultado.items()
    }

def calcular_descuento_faltas(empleado, fecha_inicio, fecha_fin):
    """
    Calcula el descuento por faltas según la LFT, considerando:
    - Días normales: no se paga el salario del día
    - Días festivos asignados: no se paga el salario normal ni el doble adicional
    
    Args:
        empleado: Objeto Empleado con sus faltas registradas
        fecha_inicio: Fecha de inicio del periodo
        fecha_fin: Fecha de fin del periodo
    
    Returns:
        tuple: (descuento_total, dias_faltados_normales, dias_festivos_asignados_faltados, faltas_detalle)
    """
    from decimal import Decimal, getcontext
    
    getcontext().prec = 10
    salario_diario = Decimal(str(empleado.salario_diario))
    descuento_total = Decimal('0')
    dias_faltados_normales = 0
    dias_festivos_asignados_faltados = 0
    faltas_detalle = []
    
    # Días festivos en el periodo
    festivos_en_periodo = [
        dia for dia in DIAS_FESTIVOS_2025 
        if fecha_inicio <= dia <= fecha_fin
    ]
    
    for fecha_str in empleado.fechas_faltas:
        try:
            fecha_falta = datetime.strptime(fecha_str, '%Y-%m-%d').date()
            
            # Verificar que la falta esté dentro del periodo
            if not (fecha_inicio <= fecha_falta <= fecha_fin):
                continue
                
            tipo_falta = None
            descuento = Decimal('0')
                
            # Verificar que no sea día de descanso regular
            if fecha_falta.weekday() in empleado.dias_descanso:
                tipo_falta = 'descanso'
                descuento = Decimal('0')
            else:
                # Calcular descuento según tipo de día
                if fecha_falta in festivos_en_periodo:
                    # Verificar si estaba asignado a trabajar ese festivo
                    if fecha_falta.weekday() not in empleado.dias_descanso:
                        # Día festivo asignado: se descuenta el salario normal + doble adicional
                        descuento = salario_diario * Decimal('3')
                        dias_festivos_asignados_faltados += 1
                        tipo_falta = 'festivo_asignado'
                    else:
                        # Día festivo no asignado (es su día de descanso)
                        descuento = Decimal('0')
                        tipo_falta = 'festivo_no_asignado'
                else:
                    # Día normal: se descuenta el salario del día
                    descuento = salario_diario
                    dias_faltados_normales += 1
                    tipo_falta = 'normal'
                    
                descuento_total += descuento
                
            # Registrar detalle de la falta
            faltas_detalle.append({
                'fecha': fecha_str,
                'tipo': tipo_falta,
                'dia_semana': fecha_falta.strftime('%A'),
                'descuento': float(descuento.quantize(Decimal('0.01')))
            })
                
        except (ValueError, TypeError):
            continue
    
    return (
        descuento_total.quantize(Decimal('0.01')),
        dias_faltados_normales,
        dias_festivos_asignados_faltados,
        faltas_detalle
    )

def calcular_pago_extra(empleado, fecha_inicio, fecha_fin):
    """
    Calcula pagos extras con precisión en:
    - Prima dominical: 25% del salario diario por cada domingo trabajado (exenta hasta 1 UMA diaria)
    - Días festivos: Pago doble del salario diario (NO se paga nada por faltas justificadas en festivos)
    
    Args:
        empleado: Objeto empleado con sus atributos
        fecha_inicio (date): Fecha de inicio del período
        fecha_fin (date): Fecha de fin del período
    
    Returns:
        dict: Estructura con los cálculos y metadatos
    
    Raises:
        ValueError: Si hay problemas en los datos de entrada o cálculos
    """
    from decimal import Decimal, getcontext, InvalidOperation
    from datetime import date, timedelta
    import locale

    # Días festivos oficiales 2025 en México
    DIAS_FESTIVOS_2025 = [
        date(2025, 1, 1),   # Año Nuevo
        date(2025, 2, 3),   # Día de la Constitución
        date(2025, 3, 17),  # Natalicio de Benito Juárez
        date(2025, 5, 1),   # Día del Trabajo
        date(2025, 9, 16),  # Día de la Independencia
        date(2025, 11, 17), # Día de la Revolución
        date(2025, 12, 25)  # Navidad
    ]

    # Configurar el contexto decimal para precisión adecuada
    getcontext().prec = 10
    getcontext().rounding = 'ROUND_HALF_UP'

    # Validación inicial robusta
    if not hasattr(empleado, 'fecha_ingreso'):
        raise ValueError("El empleado no tiene fecha de ingreso registrada")
    
    if not isinstance(fecha_inicio, date) or not isinstance(fecha_fin, date):
        raise ValueError("Fechas deben ser objetos date válidos")
    
    if fecha_inicio > fecha_fin:
        raise ValueError("Fecha de inicio no puede ser mayor que fecha fin")

    # Constantes exactas para 2025 con validación
    try:
        UMA_DIARIA = Decimal('113.14')
        PORCENTAJE_PRIMA = Decimal('0.25')  # 25%
    except InvalidOperation as e:
        raise ValueError(f"Error inicializando constantes: {str(e)}")

    # Configuración inicial segura con tipos consistentes
    resultado = {
        'prima_dominical': Decimal('0.00'),
        'pago_festivos': Decimal('0.00'),
        'uma_diaria': UMA_DIARIA,
        'excedente_uma': Decimal('0.00'),
        'domingos_trabajados': 0,
        'dias_festivos': 0,
        'total': Decimal('0.00'),
        'metadatos': {
            'salario_diario_calculado': Decimal('0.00'),
            'prima_por_domingo': Decimal('0.00'),
            'festivos_no_pagados': [],
            'festivos_con_falta_justificada': []
        }
    }

    def convertir_a_decimal(valor) -> Decimal:
        """
        Convierte cualquier valor numérico a Decimal con manejo robusto de formatos.
        
        Args:
            valor: Valor a convertir (str, float, int, Decimal)
            
        Returns:
            Decimal: Valor convertido and quantizado
            
        Raises:
            ValueError: Si la conversión falla
        """
        if isinstance(valor, Decimal):
            return valor.quantize(Decimal('0.01'))
        
        if valor is None:
            raise ValueError("Valor no puede ser None")

        # Guardar configuración regional actual
        original_locale = locale.getlocale(locale.LC_NUMERIC)
        
        try:
            # Intentar con formato estándar
            try:
                return Decimal(str(valor).strip()).quantize(Decimal('0.01'))
            except InvalidOperation:
                # Limpieza de formatos especiales
                cleaned = str(valor).strip().upper()
                
                # Remover símbolos de moneda y separadores de miles
                for char in ['$', '€', '£', ',', "'", '"']:
                    cleaned = cleaned.replace(char, '')
                
                # Reemplazar formatos europeos (1.234,56 -> 1234.56)
                if '.' in cleaned and ',' in cleaned:
                    if cleaned.find(',') > cleaned.find('.'):
                        cleaned = cleaned.replace('.', '').replace(',', '.')
                    else:
                        cleaned = cleaned.replace(',', '')
                elif ',' in cleaned:
                    cleaned = cleaned.replace(',', '.')
                
                # Configurar locale para interpretación correcta
                locale.setlocale(locale.LC_NUMERIC, 'en_US.UTF-8')
                
                # Intentar interpretar como número según locale
                try:
                    return Decimal(str(locale.atof(cleaned))).quantize(Decimal('0.01'))
                except:
                    return Decimal(cleaned).quantize(Decimal('0.01'))
        except Exception as e:
            raise ValueError(f"No se pudo convertir valor a Decimal: '{valor}' (error: {str(e)})")
        finally:
            # Restaurar configuración regional original
            locale.setlocale(locale.LC_NUMERIC, original_locale)

    try:
        # 1. Determinar salario diario con múltiples estrategias de conversión
        salario_diario = None
        
        # Estrategia 1: Usar salario_diario si existe
        if hasattr(empleado, 'salario_diario') and empleado.salario_diario is not None:
            try:
                salario_diario = convertir_a_decimal(empleado.salario_diario)
            except ValueError as e:
                raise ValueError(f"Salario diario inválido: {str(e)}")
        
        # Estrategia 2: Calcular desde sueldo mensual si no hay salario diario
        if salario_diario is None and hasattr(empleado, 'sueldo_mensual') and empleado.sueldo_mensual is not None:
            try:
                salario_mensual = convertir_a_decimal(empleado.sueldo_mensual)
                salario_diario = (salario_mensual / Decimal('30')).quantize(Decimal('0.01'))
            except ValueError as e:
                raise ValueError(f"Sueldo mensual inválido: {str(e)}")
        
        # Validar que se obtuvo un salario válido
        if salario_diario is None:
            raise ValueError("No se encontró información salarial válida (ni salario_diario ni sueldo_mensual)")
        
        if salario_diario <= Decimal('0'):
            raise ValueError("El salario diario debe ser mayor a cero")

        resultado['metadatos']['salario_diario_calculado'] = salario_diario
        prima_por_domingo = (salario_diario * PORCENTAJE_PRIMA).quantize(Decimal('0.01'))
        resultado['metadatos']['prima_por_domingo'] = prima_por_domingo

        # 2. Calcular domingos trabajados (exentos hasta 1 UMA)
        fecha_actual = max(fecha_inicio, empleado.fecha_ingreso)
        while fecha_actual <= fecha_fin:
            if fecha_actual.weekday() == 6:  # Domingo
                fecha_str = fecha_actual.strftime('%Y-%m-%d')
                if (6 not in getattr(empleado, 'dias_descanso', []) and 
                    fecha_str not in getattr(empleado, 'fechas_faltas', [])):
                    
                    resultado['domingos_trabajados'] += 1
                    resultado['prima_dominical'] += prima_por_domingo
                    # Calcular excedente gravable (parte que supera 1 UMA)
                    excedente = max(Decimal('0'), prima_por_domingo - UMA_DIARIA)
                    resultado['excedente_uma'] += excedente
            
            fecha_actual += timedelta(days=1)

        # 3. Calcular días festivos trabajados (pago doble) - CORRECCIÓN APLICADA
        festivos_pagados = []
        for festivo in DIAS_FESTIVOS_2025:
            try:
                if (fecha_inicio <= festivo <= fecha_fin and
                    festivo >= empleado.fecha_ingreso and
                    festivo.weekday() not in getattr(empleado, 'dias_descanso', []) and
                    festivo.strftime('%Y-%m-%d') not in getattr(empleado, 'fechas_faltas', [])):
                    
                    # VERIFICAR SI HAY FALTA JUSTIFICADA EN ESTE FESTIVO
                    festivo_str = festivo.strftime('%Y-%m-%d')
                    tiene_falta_justificada = (
                        hasattr(empleado, 'fechas_faltas_justificadas') and 
                        festivo_str in empleado.fechas_faltas_justificadas
                    )
                    
                    if not tiene_falta_justificada:
                        festivos_pagados.append(festivo_str)
                        resultado['pago_festivos'] += salario_diario * Decimal('2')
                    else:
                        # CORRECCIÓN: NO SE PAGA NADA POR FALTA JUSTIFICADA EN FESTIVO
                        # Solo se registra en metadatos para tracking
                        resultado['metadatos']['festivos_con_falta_justificada'].append(festivo_str)
                        
            except Exception as e:
                raise ValueError(f"Error procesando día festivo {festivo}: {str(e)}")

        resultado['dias_festivos'] = len(festivos_pagados)
        resultado['metadatos']['festivos_no_pagados'] = [
            f.strftime('%Y-%m-%d') for f in DIAS_FESTIVOS_2025 
            if f.strftime('%Y-%m-%d') not in festivos_pagados
            and fecha_inicio <= f <= fecha_fin
        ]

        # 4. Total exacto (sin redondeos intermedios)
        resultado['total'] = (resultado['prima_dominical'] + resultado['pago_festivos']).quantize(Decimal('0.01'))

        # Convertir Decimal a float para compatibilidad con JSON (solo al final)
        return {
            'prima_dominical': float(resultado['prima_dominical']),
            'pago_festivos': float(resultado['pago_festivos']),
            'uma_diaria': float(resultado['uma_diaria']),
            'excedente_uma': float(resultado['excedente_uma']),
            'domingos_trabajados': resultado['domingos_trabajados'],
            'dias_festivos': resultado['dias_festivos'],
            'total': float(resultado['total']),
            'metadatos': {
                'salario_diario_calculado': float(resultado['metadatos']['salario_diario_calculado']),
                'prima_por_domingo': float(resultado['metadatos']['prima_por_domingo']),
                'festivos_no_pagados': resultado['metadatos']['festivos_no_pagados'],
                'festivos_con_falta_justificada': resultado['metadatos']['festivos_con_falta_justificada']
            }
        }

    except ValueError as ve:
        raise ValueError(f"Error en cálculo de pagos extras: {str(ve)}")
    except Exception as e:
        raise ValueError(f"Error inesperado en cálculo de pagos extras: {str(e)}")


def calcular_pago_extra_semanal(empleado, fecha_inicio, fecha_fin, dias_trabajados):
    """Calcula pagos extras proporcionales a días trabajados en semana con desglose detallado"""
    try:
        # Convertir días de descanso a conjunto para búsqueda rápida
        dias_descanso = set(empleado.dias_descanso)
        fecha_ingreso = empleado.fecha_ingreso
        
        # Filtrar días festivos que:
        # 1. Están en el periodo
        # 2. No son días de descanso del empleado
        # 3. El empleado ya estaba contratado (fecha_ingreso <= festivo)
        # 4. No tiene falta registrada
        festivos_trabajados = [
            dia for dia in DIAS_FESTIVOS_2025 
            if (fecha_inicio <= dia <= fecha_fin) and 
               (dia.weekday() not in dias_descanso) and
               (fecha_ingreso <= dia) and  # Solo si ya estaba contratado
               (dia.strftime('%Y-%m-%d') not in empleado.fechas_faltas)  # No contar festivos faltados
        ]
        
        pago_festivos = empleado.salario_diario * Decimal('2') * len(festivos_trabajados)
        
        # Calcular prima dominical (25% del salario por cada domingo trabajado)
        # Solo considerar domingos después de la fecha de ingreso
        prima_data = calcular_prima_dominical(empleado, max(fecha_inicio, fecha_ingreso), fecha_fin)
        prima_dominical = prima_data['prima_dominical']
        
        # Total pago extra
        total_pago_extra = Decimal(str(pago_festivos)) + Decimal(str(prima_dominical))
        
        return {
            'total_pago_extra': float(total_pago_extra.quantize(Decimal('0.01'))),
            'detalle_pago_extra': {
                'dias_festivos': len(festivos_trabajados),
                'pago_festivos': float(pago_festivos),
                'prima_dominical': float(prima_dominical),
                'uma_diaria': float(prima_data['uma_diaria']),
                'excedente_uma': float(prima_data['excedente_uma']),
                'domingos_trabajados': prima_data['domingos_trabajados'],
                'domingos_faltados': prima_data.get('domingos_faltados', 0),
                'proporcion_dias_trabajados': float((Decimal(dias_trabajados) / Decimal('7')).quantize(Decimal('0.0001'))),
                'festivos_no_trabajados': len([d for d in DIAS_FESTIVOS_2025 if fecha_inicio <= d <= fecha_fin]) - len(festivos_trabajados),
                'festivos_no_pagados': [d.strftime('%Y-%m-%d') for d in DIAS_FESTIVOS_2025 
                                       if fecha_inicio <= d <= fecha_fin and d not in festivos_trabajados],
                'motivo_festivos_no_pagados': {
                    'antes_de_ingreso': [d.strftime('%Y-%m-%d') for d in DIAS_FESTIVOS_2025 
                                        if fecha_inicio <= d <= fecha_fin and d < fecha_ingreso],
                    'falta': [d.strftime('%Y-%m-%d') for d in DIAS_FESTIVOS_2025 
                             if fecha_inicio <= d <= fecha_fin and 
                             d >= fecha_ingreso and 
                             d.strftime('%Y-%m-%d') in empleado.fechas_faltas],
                    'descanso': [d.strftime('%Y-%m-%d') for d in DIAS_FESTIVOS_2025 
                                if fecha_inicio <= d <= fecha_fin and 
                                d >= fecha_ingreso and 
                                d.weekday() in dias_descanso]
                }
            }
        }
    except Exception as e:
        raise ValueError(f"Error al calcular pago extra semanal: {str(e)}")

def calcular_exencion_isr_festivos(pago_extra, dias_trabajados):
    """
    Calcula la parte exenta del pago por días festivos según LISR Art. 93
    - 50% de exención
    - Límite: 5 UMA por semana de servicios
    """
    try:
        semanas_en_periodo = Decimal(str(dias_trabajados)) / Decimal('7')
        limite_exencion = semanas_en_periodo * Decimal('5') * CalculadoraIMSS.UMA_2025
        
        # Calculamos el pago adicional (doble salario por día festivo)
        pago_adicional = Decimal(str(pago_extra['pago_festivos']))
        
        # Aplicamos exención del 50% con tope de 5 UMA por semana
        exento = min(pago_adicional * Decimal('0.5'), limite_exencion)
        gravable = pago_adicional - exento
        
        return {
            'pago_adicional_festivos': float(pago_adicional),
            'exento_festivos': float(exento.quantize(Decimal('0.01'))),
            'gravable_festivos': float(gravable.quantize(Decimal('0.01'))),
            'limite_exencion': float(limite_exencion.quantize(Decimal('0.01')))
        }
    except Exception as e:
        raise ValueError(f"Error al calcular exención ISR: {str(e)}")

def calcular_semana_laboral(fecha_referencia=None):
    """Calcula el periodo de lunes a domingo para la semana laboral"""
    fecha = fecha_referencia if fecha_referencia else datetime.now()
    # Encontrar el lunes de la semana
    lunes = fecha - timedelta(days=fecha.weekday())
    domingo = lunes + timedelta(days=6)
    return lunes, domingo

def find_subsidio_range(salario):
    """Función auxiliar para encontrar el rango de subsidio aplicado"""
    try:
        salario_dec = Decimal(str(salario))
        tabla_subsidio = cargar_tabla_subsidio_semanal()
        for rango in tabla_subsidio:
            if rango['limite_inferior'] <= salario_dec <= rango['limite_superior']:
                return f"{float(rango['limite_inferior'])} a {float(rango['limite_superior'])}"
        return "No aplica"
    except Exception as e:
        raise ValueError(f"Error al encontrar rango de subsidio: {str(e)}")

# =============================================
# FUNCIONES PRINCIPALES DE CÁLCULO
# =============================================

def aplicar_exenciones_salario_minimo(empleado, salario_bruto, periodo):
    """Aplica exenciones de ISR e IMSS cuando el salario DIARIO CONTRACTUAL es igual o menor al mínimo"""
    try:
        # Manejar caso cuando salario_diario es None o vacío
        if not empleado.salario_diario and not empleado.sueldo_mensual:
            return False, False
            
        # Para periodo mensual, calcular salario diario a partir del sueldo mensual
        if empleado.periodo_nominal == 'MENSUAL' and empleado.sueldo_mensual:
            salario_diario = (Decimal(str(empleado.sueldo_mensual)) / Decimal('30')).quantize(Decimal('0.01'))
        else:
            # Convertir a Decimal de forma segura
            try:
                salario_diario = Decimal(str(empleado.salario_diario)).quantize(Decimal('0.01'))
            except (InvalidOperation, TypeError):
                # Si hay error en la conversión, asumir que no aplica exención
                return False, False
        
        if getattr(empleado, 'zona_salarial', 'general').lower() == 'frontera':
            salario_minimo = SALARIO_MINIMO_FRONTERA_2025
        else:
            salario_minimo = SALARIO_MINIMO_GENERAL_2025
        
        aplica_exencion_isr = (salario_diario <= salario_minimo)
        aplica_exencion_imss = (salario_diario <= salario_minimo)
        
        return aplica_exencion_isr, aplica_exencion_imss
    except Exception as e:
        raise ValueError(f"Error al verificar exenciones: {str(e)}")

def cargar_tabla_isr(periodo='quincenal'):
    """Carga tabla ISR desde CSV con manejo robusto de errores"""
    archivos = {
        'mensual': 'tarifa_mensual_isr.csv',
        'quincenal': 'tarifa_quincenal_isr.csv',
        'semanal': 'tarifa_semanal_isr.csv'
    }
    
    ruta = os.path.join(os.path.dirname(__file__), 'data', archivos[periodo])
    
    try:
        with open(ruta, 'r', encoding='utf-8') as f:
            lines = [line.split('#')[0].strip() for line in f if line.strip()]
        
        from io import StringIO
        df = pd.read_csv(StringIO('\n'.join(lines)))
        
        columnas_requeridas = ['Limite Inferior', 'Limite Superior', 'Cuota fija', 'Por ciento para Limite Inferior']
        if not all(col in df.columns for col in columnas_requeridas):
            raise ValueError(f"El archivo {archivos[periodo]} no tiene las columnas requeridas")
            
        return df
    except Exception as e:
        raise ValueError(f"Error al cargar tabla ISR: {str(e)}")

def calcular_isr(salario, periodo='quincenal'):
    """Calcula ISR según tabla 2025 con subsidio al empleo"""
    try:
        salario_decimal = Decimal(str(float(salario)))
        tabla = cargar_tabla_isr(periodo)
        
        isr_determinado = Decimal('0.00')
        for _, rango in tabla.iterrows():
            if rango['Limite Inferior'] <= float(salario_decimal) <= rango['Limite Superior']:
                excedente = salario_decimal - Decimal(str(rango['Limite Inferior']))
                porcentaje = Decimal(str(rango['Por ciento para Limite Inferior'])) / Decimal('100')
                isr_determinado = Decimal(str(rango['Cuota fija'])) + (excedente * porcentaje)
                break

        if periodo == 'semanal':
            subsidio = obtener_subsidio_semanal(float(salario_decimal))
            isr_final = max(Decimal('0'), isr_determinado - subsidio)
        elif periodo == 'mensual':
            subsidio = obtener_subsidio_mensual(float(salario_decimal))
            isr_final = max(Decimal('0'), isr_determinado - subsidio)
        else:  # quincenal
            dias = Decimal('15')
            salario_mensual = (salario_decimal / dias) * Decimal('30.4')
            
            if salario_mensual <= Decimal('10171.00'):
                subsidio = Decimal('113.14') * Decimal('0.138') * dias
                isr_final = max(Decimal('0'), isr_determinado - subsidio)
            else:
                isr_final = isr_determinado

        return float(isr_final.quantize(Decimal('0.01')))
    except Exception as e:
        raise ValueError(f"Error al calcular ISR: {str(e)}")

def calcular_imss(salario_diario, dias_trabajados, incluir_detalle=True):
    """
    Calcula las deducciones del IMSS con desglose completo de cuotas y validaciones robustas
    Versión mejorada con manejo seguro de tipos Decimal y float.
    """
    try:
        # Validación de parámetros
        try:
            salario_diario_dec = Decimal(str(float(salario_diario))).quantize(Decimal('0.01'))
            if salario_diario_dec <= Decimal('0'):
                raise ValueError("El salario diario debe ser mayor a 0")
        except (ValueError, InvalidOperation, TypeError) as e:
            raise ValueError("El salario diario debe ser un valor numérico válido") from e

        try:
            dias = int(dias_trabajados)
            if dias <= 0:
                raise ValueError("Días trabajados debe ser mayor a 0")
            if dias > 31:
                raise ValueError("Días trabajados no puede ser mayor a 31")
        except (ValueError, TypeError) as e:
            raise ValueError("Días trabajados debe ser un número entero válido") from e

        # Cálculo de cuotas IMSS
        calculadora = CalculadoraIMSS(salario_diario_dec)
        
        # Calcular Salario Base de Cotización (SBC)
        sbc_diario = calculadora.calcular_sbc().quantize(Decimal('0.01'))
        sbc_periodo = (sbc_diario * Decimal(dias)).quantize(Decimal('0.01'))
        
        # Calcular todas las cuotas IMSS
        cuotas = calculadora.calcular_cuotas(dias)
        
        # Calcular total de deducción
        total_deduccion_dec = (
            cuotas['prestaciones_dinero'] + 
            cuotas['prestaciones_especies'] + 
            cuotas['invalidez_vida'] + 
            cuotas['cesantia_vejez'] +
            cuotas['excedente_especies']
        ).quantize(Decimal('0.01'))

        # Función auxiliar para conversión segura a float
        def safe_float(value):
            """Convierte Decimal a float de forma segura"""
            if isinstance(value, Decimal):
                return float(value.quantize(Decimal('0.01')))
            return float(value)
        
        # Estructura del resultado
        resultado = {
            'prestaciones_dinero': safe_float(cuotas['prestaciones_dinero']),
            'prestaciones_especies': safe_float(cuotas['prestaciones_especies']),
            'invalidez_vida': safe_float(cuotas['invalidez_vida']),
            'cesantia_vejez': safe_float(cuotas['cesantia_vejez']),
            'excedente_especies': safe_float(cuotas['excedente_especies']),
            'total_deduccion_imss': safe_float(total_deduccion_dec),
            'sbc': {
                'diario': safe_float(sbc_diario),
                'periodo': safe_float(sbc_periodo),
                'factor_integracion': float(CalculadoraIMSS.FACTOR_INTEGRACION),
                'formula': f"{safe_float(salario_diario_dec)} × {float(CalculadoraIMSS.FACTOR_INTEGRACION)}"
            },
            'bases_calculo': {
                'prestaciones': safe_float(sbc_diario),
                'excedente': safe_float(cuotas.get('base_excedente', Decimal('0'))),
                'tres_uma': safe_float(cuotas.get('tres_uma', Decimal('0')))
            }
        }

        if incluir_detalle:
            # Calcular excedente sobre 3 UMA
            excedente_calculado = max(Decimal('0'), sbc_diario - cuotas.get('tres_uma', Decimal('0'))).quantize(Decimal('0.01'))
            
            resultado.update({
                'detalle_excedente': {
                    'valor': safe_float(cuotas['excedente_especies']),
                    'porcentaje': '0.40%',
                    'base_calculo': safe_float(cuotas.get('base_excedente', Decimal('0'))),
                    'limite': safe_float(cuotas.get('tres_uma', Decimal('0'))),
                    'excedente_calculado': safe_float(excedente_calculado),
                    'nota': 'Calculado sobre el excedente del SBC diario sobre 3 UMA'
                },
                'porcentajes': {
                    'prestaciones_dinero': '0.25%',
                    'prestaciones_especies': '0.375%',
                    'invalidez_vida': '0.625%',
                    'cesantia_vejez': '1.125%',
                    'excedente_especies': '0.40%'
                },
                'metadatos': {
                    'version_calculo': '1.3',
                    'fecha_actualizacion': '2025-01-15',
                    'notas': [
                        'Cálculos según LSS vigente 2025',
                        'Factor de integración: 1.0493',
                        'UMA 2025: $113.14',
                        'Todos los valores monetarios se redondean a 2 decimales'
                    ]
                }
            })

        return resultado

    except ValueError as ve:
        raise ValueError(f"Error de validación en cálculo IMSS: {str(ve)}") from ve
    except Exception as e:
        error_msg = f"Error en cálculo IMSS: {str(e)}"
        if hasattr(e, 'args') and e.args:
            error_msg += f" - Detalles: {e.args[0]}"
        raise ValueError(error_msg) from e

from decimal import Decimal

def calcular_base_gravable_isr(salario_bruto, pago_extra):
    """
    Calcula y despliega los conceptos de la base gravable ISR igual que en nómina quincenal/semanal
    
    Args:
        salario_bruto: Salario bruto del empleado (ya con descuentos por faltas aplicados)
        pago_extra: Diccionario con los pagos adicionales que forman parte de la base gravable:
                   - pago_festivos: Pago por días festivos trabajados (100%)
                   - excedente_uma: Excedente de prima dominical (parte sobre 1 UMA por domingo)
    
    Returns:
        Un diccionario con:
        - base_gravable: El total de la base gravable para ISR
        - detalle: Desglose de los conceptos que componen la base
        
    Raises:
        ValueError: Si ocurre algún error en los cálculos
    """
    try:
        # Convertir a Decimal para precisión
        salario = Decimal(str(salario_bruto))
        pago_festivos = Decimal(str(pago_extra.get('pago_festivos', 0)))
        excedente = Decimal(str(pago_extra.get('excedente_uma', 0)))
        
        # Calcular total
        base_total = (salario + pago_festivos + excedente).quantize(Decimal('0.01'))
        
        # Estructura simple igual que en quincenal/semanal
        return {
            'base_gravable': float(base_total),
            'detalle': {
                'salario_bruto': float(salario),
                'pago_festivos': float(pago_festivos),
                'excedente_prima_dominical': float(excedente)
            }
        }
    except Exception as e:
        raise ValueError(f"Error calculando base ISR: {str(e)}")
# =============================================
# FUNCIONES PRINCIPALES DE NÓMINA
# =============================================
# gestion/utils.py (agregar esto junto a las otras funciones)



def calcular_dias_laborados_por_fecha_ingreso(fecha_ingreso, fecha_inicio_periodo, fecha_fin_periodo):
    """
    Calcula los días laborados considerando la fecha de ingreso del empleado.
    Todos los días del periodo (incluyendo descansos) se cuentan como laborados,
    excepto si son anteriores a la fecha de ingreso.
    
    Args:
        fecha_ingreso (date): Fecha en que el empleado ingresó a trabajar
        fecha_inicio_periodo (date): Inicio del periodo de nómina
        fecha_fin_periodo (date): Fin del periodo de nómina
    
    Returns:
        int: Número de días laborados en el periodo (incluyendo días de descanso)
    """
    if fecha_ingreso > fecha_fin_periodo:
        return 0  # El empleado ingresó después del periodo
    
    # Ajustar fecha de inicio si el empleado ingresó después
    fecha_inicio_calculada = max(fecha_ingreso, fecha_inicio_periodo)
    
    # Calcular días totales en el periodo (incluyendo descansos)
    dias_laborados = (fecha_fin_periodo - fecha_inicio_calculada).days + 1
    
    return max(0, dias_laborados)  # Asegurar no negativo


def verificar_pago_festivo_con_falta(empleado, fecha, pago_festivos):
    """
    Verifica si un día festivo coincide con una falta justificada
    y ajusta el pago correspondiente.
    
    Args:
        empleado: Objeto empleado con sus faltas
        fecha: datetime.date a verificar
        pago_festivos: Diccionario con el pago de festivos calculado
    
    Returns:
        dict: pago_festivos ajustado si hay coincidencia
    """
    try:
        fecha_str = fecha.strftime('%Y-%m-%d')
        
        # Verificar si es día festivo
        if fecha in DIAS_FESTIVOS_2025:
            # Verificar si el empleado tiene falta justificada en esta fecha
            if (hasattr(empleado, 'fechas_faltas_justificadas') and 
                fecha_str in empleado.fechas_faltas_justificadas):
                
                # No se paga el extra por festivo si hay falta justificada
                # Solo se paga el salario normal (no el doble)
                salario_diario = Decimal(str(empleado.salario_diario)).quantize(Decimal('0.01'))
                
                # Restar el pago extra del festivo (solo se quita el adicional, no el salario base)
                if pago_festivos['total'] >= salario_diario:
                    pago_festivos['total'] -= salario_diario
                    pago_festivos['pago_festivos'] -= salario_diario
                    
                    # Registrar en metadatos
                    if 'festivos_con_falta_justificada' not in pago_festivos.get('metadatos', {}):
                        pago_festivos.setdefault('metadatos', {})['festivos_con_falta_justificada'] = []
                    
                    pago_festivos['metadatos']['festivos_con_falta_justificada'].append({
                        'fecha': fecha_str,
                        'motivo': 'falta_justificada_en_festivo',
                        'descuento_adicional': float(salario_diario)
                    })
    
    except Exception as e:
        # En caso de error, continuar sin modificar el pago
        print(f"Error en verificar_pago_festivo_con_falta: {str(e)}")
    
    return pago_festivos

def calcular_nomina_quincenal(empleado, dias_laborados=None, faltas_en_periodo=0, fecha_referencia=None):
    """
    Calcula la nómina quincenal para un empleado con estructura completa.
    Ahora diferencia entre faltas justificadas e injustificadas.
    
    Args:
        empleado: Objeto empleado con sus datos
        dias_laborados: Días laborados (opcional, si no se proporciona se calculan)
        faltas_en_periodo: Faltas en el periodo (opcional, si no se proporciona se calculan)
        fecha_referencia: Fecha de referencia para el cálculo (opcional, por defecto hoy)
    
    Returns:
        dict: Estructura completa con todos los cálculos de nómina
    
    Raises:
        ValueError: Si hay errores en los cálculos
    """
    try:
        # 1. Configuración inicial del periodo
        fecha_ref = fecha_referencia if fecha_referencia else date.today()
        meses = {
            1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL",
            5: "MAYO", 6: "JUNIO", 7: "JULIO", 8: "AGOSTO",
            9: "SEPTIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
        }
        
        # Determinar quincena (1ra o 2da)
        if fecha_ref.day <= 15:
            quincena = "01"
            fecha_inicio = date(fecha_ref.year, fecha_ref.month, 1)
            fecha_fin = date(fecha_ref.year, fecha_ref.month, 15)
            total_dias_periodo = 15
        else:
            quincena = "02"
            fecha_inicio = date(fecha_ref.year, fecha_ref.month, 16)
            # Calcular último día del mes
            if fecha_ref.month == 12:
                siguiente_mes = date(fecha_ref.year + 1, 1, 1)
            else:
                siguiente_mes = date(fecha_ref.year, fecha_ref.month + 1, 1)
            ultimo_dia = (siguiente_mes - timedelta(days=1)).day
            fecha_fin = date(fecha_ref.year, fecha_ref.month, ultimo_dia)
            total_dias_periodo = ultimo_dia - 15

        mes_nombre = meses.get(fecha_ref.month, "")
        
        # 2. Calcular faltas REALES para el periodo actual - MODIFICACIÓN PRINCIPAL
        # Obtener faltas INJUSTIFICADAS (generan descuento)
        fechas_faltas_injustificadas = []
        for fecha_str in getattr(empleado, 'fechas_faltas_injustificadas', []):
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                if fecha_inicio <= fecha <= fecha_fin:
                    fechas_faltas_injustificadas.append(fecha_str)
            except (ValueError, TypeError):
                continue
        
        # Obtener faltas JUSTIFICADAS (solo para registro, NO generan descuento)
        fechas_faltas_justificadas = []
        for fecha_str in getattr(empleado, 'fechas_faltas_justificadas', []):
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                if fecha_inicio <= fecha <= fecha_fin:
                    fechas_faltas_justificadas.append(fecha_str)
            except (ValueError, TypeError):
                continue
        
        # Solo las faltas injustificadas generan descuento
        faltas_injustificadas = len(fechas_faltas_injustificadas)
        faltas_justificadas = len(fechas_faltas_justificadas)
        total_faltas_registradas = faltas_injustificadas + faltas_justificadas
        
        # 3. Calcular días laborados REALES considerando fecha de ingreso
        dias_laborados_reales = calcular_dias_laborados_por_fecha_ingreso(
            empleado.fecha_ingreso,
            fecha_inicio,
            fecha_fin
        )
        
        # 4. Calcular días NO trabajados por ingreso posterior
        dias_no_trabajados_por_ingreso = 0
        if empleado.fecha_ingreso > fecha_inicio:
            dias_no_trabajados_por_ingreso = (empleado.fecha_ingreso - fecha_inicio).days
        
        # Ajustar por faltas INJUSTIFICADAS (solo estas afectan días laborados)
        dias_laborados_reales = max(0, dias_laborados_reales - faltas_injustificadas)
        
        # Validar días laborados
        if dias_laborados is None:
            dias_laborados = dias_laborados_reales
            
        if not 0 <= dias_laborados <= total_dias_periodo:
            raise ValueError(f"Días laborados debe estar entre 0 y {total_dias_periodo}")
            
        if not 0 <= faltas_injustificadas <= total_dias_periodo:
            raise ValueError(f"Faltas injustificadas debe estar entre 0 and {total_dias_periodo}")
            
        if (dias_laborados + faltas_injustificadas + dias_no_trabajados_por_ingreso) > total_dias_periodo:
            raise ValueError(
                f"Suma de días laborados ({dias_laborados}), faltas injustificadas ({faltas_injustificadas}) "
                f"y días no trabajados por ingreso ({dias_no_trabajados_por_ingreso}) "
                f"no puede exceder días del periodo ({total_dias_periodo})"
            )

        # 5. Cálculo del salario diario y bruto
        salario_diario = Decimal(str(empleado.salario_diario)).quantize(Decimal('0.01'))
        
        # Salario bruto completo (15 días)
        salario_bruto = (salario_diario * Decimal(total_dias_periodo)).quantize(Decimal('0.01'))
        
        # Calcular descuento por días no trabajados por ingreso posterior
        descuento_ingreso = (salario_diario * Decimal(dias_no_trabajados_por_ingreso)).quantize(Decimal('0.01'))
        
        # Calcular descuento por faltas INJUSTIFICADAS (faltas + 1 día de descanso si faltó 2+ días)
        if faltas_injustificadas == 0:
            descuento_faltas = Decimal('0')
        elif faltas_injustificadas == 1:
            descuento_faltas = salario_diario * Decimal('1')  # Solo 1 día
        else:
            # Aplicar regla: por cada falta injustificada, se descuenta el día + 1 día de descanso por cada 2 faltas
            dias_descontados = faltas_injustificadas + (faltas_injustificadas // 2)
            descuento_faltas = salario_diario * Decimal(str(dias_descontados))
        
        # Asegurar que el descuento no exceda el salario bruto
        descuento_faltas = min(descuento_faltas, salario_bruto)
        
        # Salario después de descuentos
        salario_despues_descuentos = salario_bruto - descuento_ingreso - descuento_faltas

        # 6. Exenciones por salario mínimo
        aplica_exencion_isr, aplica_exencion_imss = aplicar_exenciones_salario_minimo(
            empleado, salario_despues_descuentos, 'quincenal'
        )

        # 7. Cálculo IMSS (siempre sobre los 15 días completos)
        imss_calculator = CalculadoraIMSS(empleado.salario_diario)
        sbc_diario = imss_calculator.calcular_sbc().quantize(Decimal('0.01'))
        sbc_periodo = (sbc_diario * Decimal(total_dias_periodo)).quantize(Decimal('0.01'))
        
        if aplica_exencion_imss:
            imss_data = {
                'prestaciones_dinero': 0.0,
                'prestaciones_especies': 0.0,
                'invalidez_vida': 0.0,
                'cesantia_vejez': 0.0,
                'excedente_especies': 0.0,
                'total_deduccion_imss': 0.0,
                'sbc': {
                    'diario': float(sbc_diario),
                    'periodo': float(sbc_periodo)
                }
            }
            total_imss = Decimal('0')
        else:
            imss_data = calcular_imss(empleado.salario_diario, total_dias_periodo)
            total_imss = Decimal(str(imss_data['total_deduccion_imss'])).quantize(Decimal('0.01'))

        # 8. Cálculo de pagos extras (festivos y prima dominical)
        pago_extra = calcular_pago_extra(empleado, fecha_inicio, fecha_fin)
        
        # APLICAR VERIFICACIÓN ADICIONAL PARA FALTAS JUSTIFICADAS EN FESTIVOS
        for festivo in DIAS_FESTIVOS_2025:
            if fecha_inicio <= festivo <= fecha_fin:
                pago_extra = verificar_pago_festivo_con_falta(empleado, festivo, pago_extra)
        
        prima_dominical = Decimal(str(pago_extra['prima_dominical'])).quantize(Decimal('0.01'))
        pago_festivos = Decimal(str(pago_extra['pago_festivos'])).quantize(Decimal('0.01'))
        total_pago_extra = prima_dominical + pago_festivos

        # 9. Base gravable para ISR
        base_gravable = salario_despues_descuentos + pago_festivos + Decimal(str(pago_extra.get('excedente_uma', 0)))
        base_gravable_data = {
            'base_gravable': float(base_gravable.quantize(Decimal('0.01'))),
            'base_gravable_detalle': {
                'salario_bruto': float(salario_bruto.quantize(Decimal('0.01'))),
                'descuento_ingreso': float(descuento_ingreso.quantize(Decimal('0.01'))),
                'descuento_faltas': float(descuento_faltas.quantize(Decimal('0.01'))),
                'salario_despues_descuentos': float(salario_despues_descuentos.quantize(Decimal('0.01'))),
                'pago_festivos': float(pago_festivos),
                'excedente_prima_dominical': float(pago_extra.get('excedente_uma', 0))
            },
            'tipo_periodo': 'quincenal',
            'subsidio_aplicado': float(Decimal('113.14') * Decimal('0.138') * Decimal('15'))
        }

        # 10. Cálculo ISR
        if aplica_exencion_isr:
            isr_retenido = Decimal('0')
        else:
            isr_retenido = Decimal(str(calcular_isr(float(base_gravable), 'quincenal'))).quantize(Decimal('0.01'))

        # 11. Salario neto
        salario_neto = (salario_despues_descuentos + total_pago_extra - isr_retenido - total_imss).quantize(Decimal('0.01'))

        # 12. DETERMINAR LA LÓGICA PARA EL CALCULO DEL TOTAL EN RESUMEN
        # Nueva funcionalidad: Diferentes cálculos según el motivo de la diferencia
        motivo_diferencia = None
        total_percepciones_calculado = 0.0
        mostrar_sueldo_en_resumen = True
        
        if dias_no_trabajados_por_ingreso > 0:
            # Diferencia por ingreso posterior: usar salario_despues_descuentos + total_pago_extra
            motivo_diferencia = 'ingreso_posterior'
            total_percepciones_calculado = float(salario_despues_descuentos + total_pago_extra)
            mostrar_sueldo_en_resumen = True
        elif faltas_injustificadas > 0:
            # Diferencia por faltas injustificadas: usar salario_bruto_ajustado + prima_dominical + pago_festivos
            motivo_diferencia = 'faltas_injustificadas'
            salario_bruto_ajustado = float(salario_bruto - descuento_ingreso)
            total_percepciones_calculado = salario_bruto_ajustado + float(prima_dominical) + float(pago_festivos)
            mostrar_sueldo_en_resumen = False
        else:
            # Caso normal: usar salario_despues_descuentos + total_pago_extra
            motivo_diferencia = 'normal'
            total_percepciones_calculado = float(salario_despues_descuentos + total_pago_extra)
            mostrar_sueldo_en_resumen = True

        # 13. Estructura del resultado final - MODIFICACIÓN PRINCIPAL
        resultado = {
            'empleado': {
                'id': empleado.id,
                'nombre_completo': empleado.nombre_completo,
                'salario_diario': float(salario_diario),
                'dias_laborados': dias_laborados_reales,
                'fechas_faltas_injustificadas': fechas_faltas_injustificadas,
                'fechas_faltas_justificadas': fechas_faltas_justificadas,
                'faltas_injustificadas': faltas_injustificadas,
                'faltas_justificadas': faltas_justificadas,
                'faltas_en_periodo': faltas_injustificadas,
                'dias_descanso': empleado.get_dias_descanso_display(),
                'periodo_nominal': empleado.periodo_nominal,
                'dias_faltados_real': faltas_injustificadas,
                'dias_descontados_real': faltas_injustificadas + (faltas_injustificadas // 2),
                'dias_no_trabajados_por_ingreso': dias_no_trabajados_por_ingreso
            },
            'periodo': {
                'tipo': 'quincenal',
                'fecha_inicio': fecha_inicio.strftime('%d/%m/%Y'),
                'fecha_fin': fecha_fin.strftime('%d/%m/%Y'),
                'total_dias': total_dias_periodo,
                'quincena': quincena,
                'mes': mes_nombre,
                'año': fecha_ref.year,
                'etiqueta': f"{mes_nombre}/{quincena}"
            },
            'sbc': {
                'diario': float(sbc_diario),
                'periodo': float(sbc_periodo),
                'factor_integracion': float(CalculadoraIMSS.FACTOR_INTEGRACION),
                'formula': f"{float(salario_diario)} × {float(CalculadoraIMSS.FACTOR_INTEGRACION)}"
            },
            'percepciones': {
                'sueldo': float(salario_bruto),
                'pago_extra': float(total_pago_extra),
                'total': float(salario_bruto + total_pago_extra)
            },
            'deducciones': {
                'imss': float(total_imss),
                'isr': float(isr_retenido),
                'faltas': float(descuento_faltas),
                'ingreso_posterior': float(descuento_ingreso),
                'total': float(total_imss + isr_retenido + descuento_faltas + descuento_ingreso),
                'detalle': {
                    'imss': imss_data,
                    'isr': base_gravable_data
                }
            },
            'resumen': {
                'salario_bruto': float(salario_bruto),
                'ajustes': {
                    'dias_no_trabajados_por_ingreso': {
                        'dias': dias_no_trabajados_por_ingreso,
                        'monto': float(descuento_ingreso),
                        'nota': 'Ajuste por ingreso posterior al inicio del periodo'
                    },
                    'faltas_injustificadas': {
                        'dias': faltas_injustificadas,
                        'monto': float(descuento_faltas),
                        'nota': 'Solo las faltas injustificadas generan descuento'
                    },
                    'faltas_justificadas': {
                        'dias': faltas_justificadas,
                        'monto': 0.0,
                        'nota': 'Las faltas justificadas no generan descuento'
                    },
                    'total_ajustes': float(descuento_ingreso + descuento_faltas)
                },
                'salario_bruto_ajustado': float(salario_bruto - descuento_ingreso),
                'total_percepciones': {
                    'Sueldo': float(salario_despues_descuentos) if mostrar_sueldo_en_resumen else None,
                    'Prima dominical': float(prima_dominical),
                    'Pago festivos': float(pago_festivos),
                    'Total': total_percepciones_calculado
                },
                'deducciones': {
                    'IMSS': float(total_imss),
                    'ISR': float(isr_retenido),
                    'FALTAS_INJUSTIFICADAS': float(descuento_faltas),
                    'total_deducciones': float(total_imss + isr_retenido + descuento_faltas)
                },
                'neto_a_pagar': float(salario_neto),
                'salario_bruto_efectivo': float(salario_despues_descuentos),
                'dias_trabajados_a_partir_ingreso': dias_laborados_reales,
                'motivo_calculo_total': motivo_diferencia,
                'mostrar_sueldo_en_resumen': mostrar_sueldo_en_resumen
            },
            'percepciones_extra': {
                'prima_dominical': float(prima_dominical),
                'pago_festivos': float(pago_festivos),
                'uma_diaria': float(pago_extra.get('uma_diaria', 0)),
                'excedente_uma': float(pago_extra.get('excedente_uma', 0)),
                'domingos_trabajados': pago_extra.get('domingos_trabajados', 0),
                'dias_festivos': pago_extra.get('dias_festivos', 0),
                'total': float(total_pago_extra)
            },
            'descuentos_detalle': {
                'salario_bruto': float(salario_bruto),
                'dias_faltados_injustificadas': faltas_injustificadas,
                'dias_faltados_justificadas': faltas_justificadas,
                'dias_no_trabajados_por_ingreso': dias_no_trabajados_por_ingreso,
                'dias_descontados': faltas_injustificadas + (faltas_injustificadas // 2),
                'descuento_por_faltas': float(descuento_faltas),
                'descuento_por_ingreso': float(descuento_ingreso),
                'salario_despues_descuentos': float(salario_despues_descuentos)
            },
            'calculos': {
                'empleado': {
                    'id': empleado.id,
                    'nombre_completo': empleado.nombre_completo,
                    'salario_diario': float(salario_diario),
                    'dias_laborados': dias_laborados_reales,
                    'fechas_faltas_injustificadas': fechas_faltas_injustificadas,
                    'fechas_faltas_justificadas': fechas_faltas_justificadas,
                    'faltas_injustificadas': faltas_injustificadas,
                    'faltas_justificadas': faltas_justificadas,
                    'faltas_en_periodo': faltas_injustificadas,
                    'dias_faltados_real': faltas_injustificadas,
                    'descuento_por_faltas': float(descuento_faltas.quantize(Decimal('0.01'))),
                    'dias_descontados_real': faltas_injustificadas + (faltas_injustificadas // 2),
                    'dias_no_trabajados_por_ingreso': dias_no_trabajados_por_ingreso
                },
                'resumen': {
                    'deducciones': {
                        'FALTAS_INJUSTIFICADAS': float(descuento_faltas),
                        'IMSS': float(total_imss),
                        'ISR': float(isr_retenido),
                        'total_deducciones': float(total_imss + isr_retenido + descuento_faltas)
                    },
                    'ajustes': {
                        'DIAS_NO_TRABAJADOS': float(descuento_ingreso)
                    }
                },
                'deducciones': {
                    'faltas': float(descuento_faltas)
                },
                'descuentos_detalle': {
                    'descuento_por_faltas': float(descuento_faltas.quantize(Decimal('0.01'))),
                    'dias_faltados_injustificadas': faltas_injustificadas,
                    'dias_faltados_justificadas': faltas_justificadas,
                    'dias_descontados': faltas_injustificadas + (faltas_injustificadas // 2)
                }
            },
            'faltas_en_periodo': faltas_injustificadas,
            'dias_laborados': dias_laborados_reales,
            'salario_neto': float(salario_neto)
        }

        # Eliminar el campo 'Sueldo' del resumen si no debe mostrarse
        if not mostrar_sueldo_en_resumen:
            del resultado['resumen']['total_percepciones']['Sueldo']

        return serialize_decimal(resultado)
        
    except Exception as e:
        raise ValueError(f"Error en cálculo de nómina quincenal: {str(e)}")



def calcular_nomina_semanal(empleado, dias_laborados=None, fecha_referencia=None, faltas_en_periodo=None):
    """Calcula la nómina semanal con serialización adecuada de Decimal a float"""
    try:
        # 1. Configuración inicial del periodo
        fecha_inicio = fecha_referencia if fecha_referencia else date.today() - timedelta(days=date.today().weekday())
        fecha_fin = fecha_inicio + timedelta(days=6)

        # 2. Calcular faltas REALES para el periodo actual - MODIFICACIÓN PRINCIPAL
        # Obtener faltas INJUSTIFICADAS (generan descuento)
        fechas_faltas_injustificadas = []
        for fecha_str in getattr(empleado, 'fechas_faltas_injustificadas', []):
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                if fecha_inicio <= fecha <= fecha_fin:
                    fechas_faltas_injustificadas.append(fecha_str)
            except (ValueError, TypeError):
                continue
        
        # Obtener faltas JUSTIFICADAS (solo para registro, NO generan descuento)
        fechas_faltas_justificadas = []
        for fecha_str in getattr(empleado, 'fechas_faltas_justificadas', []):
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                if fecha_inicio <= fecha <= fecha_fin:
                    fechas_faltas_justificadas.append(fecha_str)
            except (ValueError, TypeError):
                continue
        
        # Solo las faltas injustificadas generan descuento
        faltas_injustificadas = len(fechas_faltas_injustificadas)
        faltas_justificadas = len(fechas_faltas_justificadas)
        total_faltas_registradas = faltas_injustificadas + faltas_justificadas

        # 3. Calcular días NO trabajados por ingreso posterior
        dias_no_trabajados_por_ingreso = 0
        if empleado.fecha_ingreso > fecha_inicio:
            dias_no_trabajados_por_ingreso = (empleado.fecha_ingreso - fecha_inicio).days

        # 4. Calcular días laborados REALES
        # Solo las faltas INJUSTIFICADAS afectan los días laborados
        dias_laborados_reales = 7 - dias_no_trabajados_por_ingreso - faltas_injustificadas
        dias_trabajados_a_partir_ingreso = 7 - dias_no_trabajados_por_ingreso

        # Validar entrada manual
        if dias_laborados is None:
            dias_laborados = dias_laborados_reales

        if not 0 <= dias_laborados <= 7:
            raise ValueError("Días laborados debe estar entre 0 y 7")

        if not 0 <= faltas_injustificadas <= 7:
            raise ValueError("Faltas injustificadas debe estar entre 0 y 7")

        if (dias_laborados + faltas_injustificadas + dias_no_trabajados_por_ingreso) > 7:
            raise ValueError(
                f"Suma de días laborados ({dias_laborados}), faltas injustificadas ({faltas_injustificadas}) "
                f"y días no trabajados por ingreso ({dias_no_trabajados_por_ingreso}) "
                f"no puede exceder días del periodo (7)"
            )

        # 5. Información del periodo
        meses = {
            1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL",
            5: "MAYO", 6: "JUNIO", 7: "JULIO", 8: "AGOSTO",
            9: "SEPTIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
        }
        mes_nombre = meses.get(fecha_inicio.month, "")
        semana_numero = (fecha_inicio - date(fecha_inicio.year, 1, 1)).days // 7 + 1
        semana_mes = (fecha_inicio.day - 1) // 7 + 1
        periodo_nominal = f"{mes_nombre}/{semana_mes:02d}"

        salario_diario = Decimal(str(empleado.salario_diario)).quantize(Decimal('0.01'))

        # 6. Salario bruto (completo - 7 días)
        salario_bruto = (salario_diario * Decimal('7')).quantize(Decimal('0.01'))

        # 7. Descuentos
        descuento_ingreso = (salario_diario * Decimal(dias_no_trabajados_por_ingreso)).quantize(Decimal('0.01'))
        
        # Solo faltas INJUSTIFICADAS generan descuento
        if faltas_injustificadas > 0:
            descuento_por_falta = Decimal('1') + (Decimal('1') / Decimal('6'))  # 1.1667
            total_descuento_faltas = (Decimal(str(faltas_injustificadas)) * descuento_por_falta * salario_diario).quantize(Decimal('0.01'))
            dias_efectivos = Decimal('7') - (Decimal(str(faltas_injustificadas)) * descuento_por_falta)
        else:
            total_descuento_faltas = Decimal('0')
            dias_efectivos = Decimal('7')

        dias_efectivos = dias_efectivos.quantize(Decimal('0.0001'))
        
        # Salario bruto efectivo (después de descuentos)
        salario_bruto_efectivo = (salario_bruto - descuento_ingreso - total_descuento_faltas).quantize(Decimal('0.01'))

        # 8. Exenciones
        aplica_exencion_isr, aplica_exencion_imss = aplicar_exenciones_salario_minimo(
            empleado, salario_bruto_efectivo, 'semanal'
        )

        # 9. IMSS
        if aplica_exencion_imss:
            imss_data = {
                'prestaciones_dinero': 0.0,
                'prestaciones_especies': 0.0,
                'invalidez_vida': 0.0,
                'cesantia_vejez': 0.0,
                'excedente_especies': {
                    'valor': 0.0,
                    'porcentaje': '0.40%',
                    'base_calculo': 0.0,
                    'tres_uma': float(Decimal('3') * CalculadoraIMSS.UMA_2025),
                    'nota': 'Exento por salario mínimo'
                },
                'total_deduccion_imss': 0.0
            }
            total_imss = Decimal('0')
        else:
            imss_data = calcular_imss(empleado.salario_diario, 7)
            total_imss = Decimal(str(imss_data['total_deduccion_imss']))

        # 10. Pago extra
        pago_extra = calcular_pago_extra_semanal(empleado, fecha_inicio, fecha_fin, dias_laborados)
        detalle_pago_extra = pago_extra['detalle_pago_extra']
        prima_dominical = Decimal(str(detalle_pago_extra.get('prima_dominical', 0)))
        pago_festivos = Decimal(str(detalle_pago_extra.get('pago_festivos', 0)))
        total_pago_extra = prima_dominical + pago_festivos

        # 11. Base gravable e ISR
        base_gravable_data = calcular_base_gravable_isr(
            salario_bruto_efectivo,
            {
                'pago_festivos': float(pago_festivos),
                'excedente_uma': float(detalle_pago_extra.get('excedente_uma', 0)),
                'uma_diaria': float(detalle_pago_extra.get('uma_diaria', 0)),
                'domingos_trabajados': detalle_pago_extra.get('domingos_trabajados', 0)
            }
        )
        base_gravable = Decimal(str(base_gravable_data['base_gravable']))

        isr_retenido = Decimal('0') if aplica_exencion_isr else Decimal(str(calcular_isr(float(base_gravable), 'semanal')))

        # 12. Descuento faltas (detallado) - SOLO para injustificadas
        _, dias_normales_faltados, dias_festivos_asignados_faltados, faltas_detalle = calcular_descuento_faltas(
            empleado, fecha_inicio, fecha_fin
        )

        # 13. Salario neto
        salario_neto = (salario_bruto_efectivo + total_pago_extra - isr_retenido - total_imss).quantize(Decimal('0.01'))

        # 14. SBC
        calculadora_imss = CalculadoraIMSS(empleado.salario_diario)
        sbc_diario = calculadora_imss.calcular_sbc()

        # 15. Resultado FINAL CORREGIDO - MODIFICACIÓN PRINCIPAL
        resultado = {
            'empleado': {
                'id': empleado.id,
                'nombre_completo': empleado.nombre_completo,
                'salario_diario': float(empleado.salario_diario),
                'dias_laborados': dias_laborados,
                'fechas_faltas_injustificadas': fechas_faltas_injustificadas,  # Nuevo campo
                'fechas_faltas_justificadas': fechas_faltas_justificadas,      # Nuevo campo
                'faltas_injustificadas': faltas_injustificadas,                # Nuevo campo
                'faltas_justificadas': faltas_justificadas,                    # Nuevo campo
                'faltas_en_periodo': total_faltas_registradas,                 # Total de ambos tipos
                'dias_descanso': empleado.get_dias_descanso_display(),
                'dias_descanso_numericos': empleado.dias_descanso,
                'fecha_ingreso': empleado.fecha_ingreso.strftime('%Y-%m-%d') if empleado.fecha_ingreso else None,
                'dias_no_trabajados_por_ingreso': dias_no_trabajados_por_ingreso,
                'dias_faltados_real': faltas_injustificadas,                   # Solo injustificadas afectan
                'dias_descontados_real': faltas_injustificadas
            },
            'periodo': {
                'tipo': 'semanal',
                'fecha_inicio': fecha_inicio.strftime('%Y-%m-%d'),
                'fecha_fin': fecha_fin.strftime('%Y-%m-%d'),
                'total_dias': 7,
                'semana_numero': semana_numero,
                'semana_mes': semana_mes,
                'periodo_nominal': periodo_nominal,
                'mes': mes_nombre,
                'etiqueta': f"SEMANA {semana_numero}",
                'mes_numero': fecha_inicio.month,
                'año': fecha_inicio.year
            },
            'sbc': {
                'diario': float(sbc_diario),
                'periodo': float(sbc_diario * Decimal('7')),
                'factor_integracion': float(CalculadoraIMSS.FACTOR_INTEGRACION),
                'formula': f"{float(empleado.salario_diario)} × {float(CalculadoraIMSS.FACTOR_INTEGRACION)}"
            },
            'percepciones': {
                'sueldo': float(salario_bruto),
                'pago_extra': float(total_pago_extra),
                'total': float(salario_bruto_efectivo + total_pago_extra),
                'detalle': {
                    'dias_pagados': dias_laborados,
                    'dias_faltados_injustificadas': faltas_injustificadas,      # Nuevo campo
                    'dias_faltados_justificadas': faltas_justificadas,          # Nuevo campo
                    'salario_por_dia': float(salario_diario),
                    'dias_efectivos': float(dias_efectivos),
                    'descuento_por_falta': float(Decimal('1.1667') if faltas_injustificadas > 0 else 0)
                }
            },
            'deducciones': {
                'isr': float(isr_retenido),
                'imss': float(total_imss),
                'faltas_injustificadas': float(total_descuento_faltas),         # Nuevo campo
                'total': float(isr_retenido + total_imss + total_descuento_faltas),
                'detalle': {
                    'isr': base_gravable_data,
                    'imss': imss_data,
                    'faltas': {
                        'total': float(total_descuento_faltas),
                        'dias_faltados_injustificadas': faltas_injustificadas,  # Nuevo campo
                        'dias_faltados_justificadas': faltas_justificadas,      # Nuevo campo
                        'descuento_por_dia': float((Decimal('1') + (Decimal('1') / Decimal('6'))) * salario_diario),
                        'dias_descanso_descontados': 1 if faltas_injustificadas >= 2 else 0
                    },
                    'descuentos_detalle': {
                        'descuento_por_falta': float(total_descuento_faltas),
                        'descuento_por_ingreso': float(descuento_ingreso),
                        'dias_faltados_injustificadas': faltas_injustificadas,  # Nuevo campo
                        'dias_faltados_justificadas': faltas_justificadas,      # Nuevo campo
                        'dias_no_trabajados_por_ingreso': dias_no_trabajados_por_ingreso,
                        'dias_efectivos': float(dias_efectivos)
                    }
                }
            },
            'detalle_pago_extra': detalle_pago_extra,
            'percepciones_extra': {
                'prima_dominical': float(prima_dominical),
                'pago_festivos': float(pago_festivos),
                'uma_diaria': float(detalle_pago_extra.get('uma_diaria', 0)),
                'excedente_uma': float(detalle_pago_extra.get('excedente_uma', 0)),
                'domingos_trabajados': detalle_pago_extra.get('domingos_trabajados', 0),
                'dias_festivos': detalle_pago_extra.get('dias_festivos', 0),
                'total': float(total_pago_extra)
            },
            'resumen': {
                'salario_bruto': float(salario_bruto),
                'dias_trabajados_a_partir_ingreso': dias_trabajados_a_partir_ingreso,
                'salario_bruto_efectivo': float(salario_bruto_efectivo),
                'total_percepciones': {
                    'Prima dominical': float(prima_dominical),
                    'Pago festivos': float(pago_festivos),
                    'Total': float(salario_bruto_efectivo + prima_dominical + pago_festivos)
                },
                'deducciones': {
                    'IMSS': float(total_imss),
                    'ISR': float(isr_retenido),
                    'FALTAS_INJUSTIFICADAS': float(total_descuento_faltas),     # Nuevo campo
                    'Total': float(isr_retenido + total_imss + total_descuento_faltas)
                },
                'neto_a_pagar': float(salario_neto)
            },
            'configuracion': {
                'dias_semana': 7,
                'factor_descuento_falta': 1.1667,
                'version_calculo': '2.1',
                'logica_faltas': 'compatible_con_quincenal'
            }
        }

        return serialize_decimal(resultado)

    except Exception as e:
        raise ValueError(f"Error en cálculo de nómina semanal: {str(e)}")

def calcular_nomina_mensual(empleado, dias_laborados=None, faltas_en_periodo=0, fecha_referencia=None):
    """
    Calcula nómina mensual con estructura completa y manejo robusto de errores.
    Incluye tabla de subsidio mensual 2025 para ISR.
    """
    from decimal import Decimal, getcontext, InvalidOperation
    from datetime import date, datetime, timedelta
    import locale
    
    # Configuración inicial
    getcontext().prec = 10
    getcontext().rounding = 'ROUND_HALF_UP'

    # Tabla de subsidio mensual 2025 según SAT
    SUBSIDIO_MENSUAL_2025 = {
        1: 474.94,   # Enero
        2: 474.64,   # Febrero
        3: 474.64,   # Marzo
        4: 474.64,   # Abril
        5: 474.64,   # Mayo
        6: 474.64,   # Junio
        7: 474.64,   # Julio
        8: 474.64,   # Agosto
        9: 474.64,   # Septiembre
        10: 474.64,  # Octubre
        11: 474.64,  # Noviembre
        12: 474.64   # Diciembre
    }

    def get_dias_descanso_display(dias_descanso_numericos):
        """Convierte días de descanso numéricos a nombres (0=Lunes, 6=Domingo)"""
        dias_semana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
        return [dias_semana[dia] for dia in dias_descanso_numericos if 0 <= dia <= 6]

    def obtener_subsidio_mensual_2025(mes_numero, salario_bruto_ajustado):
        """
        Obtiene el subsidio mensual según tabla 2025.
        Solo aplica si el salario bruto ajustado no excede $10,171.00
        """
        salario_maximo_subsidio = Decimal('10171.00')
        
        if salario_bruto_ajustado <= salario_maximo_subsidio:
            return Decimal(str(SUBSIDIO_MENSUAL_2025.get(mes_numero, 474.64)))
        return Decimal('0.00')

    # Validación inicial del objeto empleado
    atributos_requeridos = ['sueldo_mensual', 'fecha_ingreso', 'periodo_nominal']
    for attr in atributos_requeridos:
        if not hasattr(empleado, attr):
            raise ValueError(f"Falta atributo requerido: {attr}")

    if empleado.periodo_nominal != 'MENSUAL':
        raise ValueError("El empleado no tiene configuración de nómina mensual")

    try:
        # 1. Configuración del periodo
        fecha_ref = fecha_referencia if fecha_referencia else date.today()
        
        meses = {
            1: "ENERO", 2: "FEBRERO", 3: "MARZO", 4: "ABRIL",
            5: "MAYO", 6: "JUNIO", 7: "JULIO", 8: "AGOSTO",
            9: "SEPTIEMBRE", 10: "OCTUBRE", 11: "NOVIEMBRE", 12: "DICIEMBRE"
        }
        
        # Calcular fechas del mes
        if fecha_ref.month == 12:
            siguiente_mes = date(fecha_ref.year + 1, 1, 1)
        else:
            siguiente_mes = date(fecha_ref.year, fecha_ref.month + 1, 1)
        
        ultimo_dia = (siguiente_mes - timedelta(days=1)).day
        fecha_inicio = date(fecha_ref.year, fecha_ref.month, 1)
        fecha_fin = date(fecha_ref.year, fecha_ref.month, ultimo_dia)
        total_dias_periodo = ultimo_dia

        # 2. Inicializar estructura de resumen
        resumen = {
            'salario_bruto': 0.0,
            'ajustes': {
                'dias_no_trabajados_por_ingreso': {
                    'dias': 0,
                    'monto': 0.0,
                    'nota': 'Días no trabajados por ingreso posterior'
                },
                'total_ajustes': 0.0
            },
            'salario_bruto_ajustado': 0.0,
            'total_percepciones': {
                'Prima dominical': 0.0,
                'Pago festivos': 0.0,
                'Total': 0.0
            },
            'deducciones': {
                'IMSS': 0.0,
                'ISR': 0.0,
                'FALTAS_INJUSTIFICADAS': 0.0,
                'total_deducciones': 0.0
            },
            'neto_a_pagar': 0.0,
            'metadatos': {
                'version_calculo': '3.2',
                'fecha_calculo': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                'empleado_id': getattr(empleado, 'id', 0)
            },
            'salario_bruto_efectivo': 0.0,
            'dias_trabajados_a_partir_ingreso': 0
        }

        # 3. Cálculo de salarios
        salario_diario = (Decimal(str(empleado.sueldo_mensual)) / Decimal('30')).quantize(Decimal('0.01'))
        salario_bruto = Decimal(str(empleado.sueldo_mensual)).quantize(Decimal('0.01'))
        resumen['salario_bruto'] = float(salario_bruto)

        # 4. Calcular ajuste por ingreso posterior
        dias_no_trabajados_por_ingreso = 0
        monto_descuento_ingreso = Decimal('0')
        
        if empleado.fecha_ingreso > fecha_inicio:
            dias_no_trabajados_por_ingreso = (empleado.fecha_ingreso - fecha_inicio).days
            monto_descuento_ingreso = (salario_diario * Decimal(dias_no_trabajados_por_ingreso)).quantize(Decimal('0.01'))
            
            resumen['ajustes']['dias_no_trabajados_por_ingreso'] = {
                'dias': dias_no_trabajados_por_ingreso,
                'monto': float(monto_descuento_ingreso),
                'nota': 'Días no trabajados por ingreso posterior'
            }
            resumen['ajustes']['total_ajustes'] = float(monto_descuento_ingreso)

        # 5. Calcular salario bruto ajustado (después de descuentos por ingreso)
        salario_bruto_ajustado = (salario_bruto - monto_descuento_ingreso).quantize(Decimal('0.01'))
        resumen['salario_bruto_ajustado'] = float(salario_bruto_ajustado)

        # 6. Manejo de faltas
        fechas_faltas_injustificadas = []
        for fecha_str in getattr(empleado, 'fechas_faltas_injustificadas', []):
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                if fecha_inicio <= fecha <= fecha_fin:
                    fechas_faltas_injustificadas.append(fecha_str)
            except (ValueError, TypeError):
                continue
        
        fechas_faltas_justificadas = []
        for fecha_str in getattr(empleado, 'fechas_faltas_justificadas', []):
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                if fecha_inicio <= fecha <= fecha_fin:
                    fechas_faltas_justificadas.append(fecha_str)
            except (ValueError, TypeError):
                continue
        
        faltas_injustificadas = len(fechas_faltas_injustificadas)
        faltas_justificadas = len(fechas_faltas_justificadas)

        # 7. Calcular días laborados reales
        dias_laborados_reales = total_dias_periodo - dias_no_trabajados_por_ingreso - faltas_injustificadas
        dias_laborados_reales = max(0, dias_laborados_reales)
        resumen['dias_trabajados_a_partir_ingreso'] = dias_laborados_reales
        
        # 8. Descuento por faltas INJUSTIFICADAS
        dias_descontados = faltas_injustificadas + (faltas_injustificadas // 2)
        descuento_faltas = (salario_diario * Decimal(str(dias_descontados))).quantize(Decimal('0.01'))
        descuento_faltas = min(descuento_faltas, salario_bruto_ajustado)
        
        resumen['deducciones']['FALTAS_INJUSTIFICADAS'] = float(descuento_faltas)

        # 9. Calcular salario efectivo después de descuentos
        salario_despues_descuentos = (salario_bruto_ajustado - descuento_faltas).quantize(Decimal('0.01'))
        salario_bruto_efectivo = (salario_diario * Decimal(dias_laborados_reales)).quantize(Decimal('0.01'))
        resumen['salario_bruto_efectivo'] = float(salario_bruto_efectivo)

        # 10. Exenciones por salario mínimo
        aplica_exencion_isr, aplica_exencion_imss = aplicar_exenciones_salario_minimo(
            empleado, salario_despues_descuentos, 'mensual'
        )

        # 11. Cálculo IMSS
        imss_calculator = CalculadoraIMSS(salario_diario)
        sbc_diario = imss_calculator.calcular_sbc().quantize(Decimal('0.01'))
        sbc_periodo = (sbc_diario * Decimal(total_dias_periodo)).quantize(Decimal('0.01'))
        
        if aplica_exencion_imss:
            imss_data = {
                'prestaciones_dinero': 0.0,
                'prestaciones_especies': 0.0,
                'invalidez_vida': 0.0,
                'cesantia_vejez': 0.0,
                'excedente_especies': 0.0,
                'total_deduccion_imss': 0.0,
                'sbc': {
                    'diario': float(sbc_diario),
                    'periodo': float(sbc_periodo)
                }
            }
            total_imss = Decimal('0')
        else:
            imss_data = calcular_imss(salario_diario, total_dias_periodo)
            total_imss = Decimal(str(imss_data['total_deduccion_imss'])).quantize(Decimal('0.01'))

        resumen['deducciones']['IMSS'] = float(total_imss)

        # 12. Cálculo de pagos extras
        pago_extra = calcular_pago_extra(empleado, fecha_inicio, fecha_fin)
        prima_dominical = Decimal(str(pago_extra.get('prima_dominical', 0))).quantize(Decimal('0.01'))
        pago_festivos = Decimal(str(pago_extra.get('pago_festivos', 0))).quantize(Decimal('0.01'))
        total_pago_extra = (prima_dominical + pago_festivos).quantize(Decimal('0.01'))

        # 13. Calcular TOTAL PERCEPCIONES correctamente
        total_percepciones = salario_bruto_ajustado + prima_dominical + pago_festivos
        
        resumen['total_percepciones']['Prima dominical'] = float(prima_dominical)
        resumen['total_percepciones']['Pago festivos'] = float(pago_festivos)
        resumen['total_percepciones']['Total'] = float(total_percepciones)

        # 14. Base gravable ISR CORREGIDA - Restar faltas injustificadas Y días no trabajados por ingreso
        base_data = calcular_base_gravable_isr(
            salario_bruto,
            {
                'pago_festivos': float(pago_festivos),
                'excedente_uma': float(pago_extra.get('excedente_uma', 0))
            }
        )
        
        # CORRECCIÓN: Restar el monto descontado por faltas injustificadas Y por ingreso posterior
        base_gravable_sin_ajuste = Decimal(str(base_data['base_gravable']))
        base_gravable = (base_gravable_sin_ajuste - descuento_faltas - monto_descuento_ingreso).quantize(Decimal('0.01'))

        base_data['faltas_injustificadas'] = {
            'dias': faltas_injustificadas,
            'monto_descontado': float(descuento_faltas)
        }

        base_data['dias_no_trabajados_por_ingreso'] = {
            'dias': dias_no_trabajados_por_ingreso,
            'monto_descontado': float(monto_descuento_ingreso)
        }

        # 15. Cálculo ISR con subsidio mensual 2025
        if aplica_exencion_isr:
            isr_retenido = Decimal('0')
            subsidio_aplicado = Decimal('0')
        else:
            # Calcular ISR determinado
            isr_determinado = Decimal(str(calcular_isr(float(base_gravable), 'mensual')))
            
            # Aplicar subsidio mensual 2025 si el salario bruto ajustado no excede $10,171.00
            subsidio_aplicado = obtener_subsidio_mensual_2025(fecha_ref.month, salario_bruto_ajustado)
            
            # Calcular ISR final restando el subsidio
            isr_retenido = max(Decimal('0'), isr_determinado - subsidio_aplicado).quantize(Decimal('0.01'))

        resumen['deducciones']['ISR'] = float(isr_retenido)
        resumen['deducciones']['total_deducciones'] = float(total_imss + isr_retenido + descuento_faltas)

        # 16. Salario neto
        salario_neto = (total_percepciones - isr_retenido - total_imss - descuento_faltas).quantize(Decimal('0.01'))
        resumen['neto_a_pagar'] = float(salario_neto)

        # 17. Estructura final del resultado
        resultado = {
            'empleado': {
                'id': getattr(empleado, 'id', 0),
                'nombre_completo': getattr(empleado, 'nombre_completo', ''),
                'salario_diario': float(salario_diario),
                'sueldo_mensual': float(empleado.sueldo_mensual),
                'dias_laborados': dias_laborados_reales,
                'fechas_faltas_injustificadas': fechas_faltas_injustificadas,
                'fechas_faltas_justificadas': fechas_faltas_justificadas,
                'faltas_injustificadas': faltas_injustificadas,
                'faltas_justificadas': faltas_justificadas,
                'faltas_en_periodo': faltas_injustificadas,
                'dias_descanso': get_dias_descanso_display(getattr(empleado, 'dias_descanso', [])),
                'dias_descanso_numericos': getattr(empleado, 'dias_descanso', []),
                'periodo_nominal': empleado.periodo_nominal,
                'zona_salarial': getattr(empleado, 'zona_salarial', 'general'),
                'fecha_ingreso': empleado.fecha_ingreso.strftime('%Y-%m-%d'),
                'dias_no_trabajados_por_ingreso': dias_no_trabajados_por_ingreso,
                'dias_faltados_real': faltas_injustificadas,
                'descuento_por_faltas': float(descuento_faltas),
                'dias_descontados_real': dias_descontados
            },
            'periodo': {
                'tipo': 'mensual',
                'fecha_inicio': fecha_inicio.strftime('%Y-%m-%d'),
                'fecha_fin': fecha_fin.strftime('%Y-%m-%d'),
                'total_dias': total_dias_periodo,
                'mes': meses.get(fecha_ref.month, ""),
                'año': fecha_ref.year,
                'etiqueta': f"{meses.get(fecha_ref.month, '')}/00",
                'mes_numero': fecha_ref.month
            },
            'sbc': {
                'diario': float(sbc_diario),
                'periodo': float(sbc_periodo),
                'factor_integracion': float(CalculadoraIMSS.FACTOR_INTEGRACION),
                'formula': f"{float(salario_diario)} × {float(CalculadoraIMSS.FACTOR_INTEGRACION)}"
            },
            'percepciones': {
                'pago_extra': float(total_pago_extra),
                'total': float(total_percepciones)
            },
            'deducciones': {
                'imss': float(total_imss),
                'isr': float(isr_retenido),
                'faltas_injustificadas': float(descuento_faltas),
                'total': float(total_imss + isr_retenido + descuento_faltas),
                'detalle': {
                    'imss': imss_data,
                    'isr': {
                        'base_gravable': float(base_gravable),
                        'base_gravable_sin_ajuste': float(base_gravable_sin_ajuste),
                        'subsidio_aplicado': float(subsidio_aplicado),
                        'tipo_periodo': 'mensual',
                        'tarifa_aplicada': 'Tabla mensual ISR 2025',
                        'limite_subsidio': 10171.00,
                        'aplica_subsidio': float(salario_bruto_ajustado) <= 10171.00,
                        'conceptos': {
                            'salario_bruto': float(salario_bruto),
                            'pago_festivos': float(pago_festivos),
                            'excedente_prima_dominical': float(pago_extra.get('excedente_uma', 0)),
                            'descuento_faltas_injustificadas': float(descuento_faltas),
                            'descuento_ingreso_posterior': float(monto_descuento_ingreso)
                        },
                        'faltas_injustificadas': {
                            'dias': faltas_injustificadas,
                            'monto_descontado': float(descuento_faltas)
                        },
                        'dias_no_trabajados_por_ingreso': {
                            'dias': dias_no_trabajados_por_ingreso,
                            'monto_descontado': float(monto_descuento_ingreso)
                        },
                        'tabla_subsidio': {
                            'mes': fecha_ref.month,
                            'valor_subsidio': float(subsidio_aplicado),
                            'limite_ingresos': 10171.00
                        }
                    }
                }
            },
            'resumen': resumen,
            'percepciones_extra': {
                'prima_dominical': float(prima_dominical),
                'pago_festivos': float(pago_festivos),
                'uma_diaria': float(pago_extra.get('uma_diaria', 0)),
                'excedente_uma': float(pago_extra.get('excedente_uma', 0)),
                'domingos_trabajados': pago_extra.get('domingos_trabajados', 0),
                'dias_festivos': pago_extra.get('dias_festivos', 0),
                'total': float(total_pago_extra)
            },
            'exenciones': {
                'por_salario_minimo': {
                    'aplica_isr': aplica_exencion_isr,
                    'aplica_imss': aplica_exencion_imss,
                    'salario_minimo_aplicable': float(SALARIO_MINIMO_FRONTERA_2025 
                                                     if getattr(empleado, 'zona_salarial', '').lower() == 'frontera' 
                                                     else SALARIO_MINIMO_GENERAL_2025),
                    'salario_diario_empleado': float(salario_diario)
                }
            },
            'metadatos': {
                'procesamiento': {
                    'fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'version': '3.2',
                    'estado': 'completado',
                    'cambios_aplicados': [
                        'Implementada tabla de subsidio mensual 2025',
                        'Subsidio aplicado si salario_bruto_ajustado <= $10,171.00',
                        'Valores según mes: Enero $474.94, Feb-Dic $474.64'
                    ]
                }
            }
        }

        return serialize_decimal(resultado)

    except ValueError as ve:
        raise ValueError(f"Error en nómina mensual para {getattr(empleado, 'nombre_completo', 'empleado')}: {str(ve)}")
    except Exception as e:
        error_msg = f"Error inesperado en nómina mensual: {str(e)}"
        if hasattr(e, 'args') and e.args:
            error_msg += f" - Detalles: {e.args[0]}"
        raise ValueError(error_msg)

def calcular_nomina_empleado(empleado, periodo='quincenal', dias_laborados=None, 
                           faltas_en_periodo=0, fecha_referencia=None):
    """
    Función principal que redirige al cálculo específico según el periodo
    """
    if periodo == 'mensual':
        return calcular_nomina_mensual(
            empleado, 
            dias_laborados=dias_laborados,
            faltas_en_periodo=faltas_en_periodo,
            fecha_referencia=fecha_referencia
        )
    elif periodo == 'semanal':
        return calcular_nomina_semanal(
            empleado,
            dias_laborados=dias_laborados,
            faltas_en_periodo=faltas_en_periodo,
            fecha_referencia=fecha_referencia
        )
    else:  # quincenal
        return calcular_nomina_quincenal(
            empleado,
            dias_laborados=dias_laborados,
            faltas_en_periodo=faltas_en_periodo,
            fecha_referencia=fecha_referencia
        )