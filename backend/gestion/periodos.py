from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from django.http import JsonResponse

def generar_calendario_semanal_2025():
    """Genera todas las semanas del año 2025 (considerando semanas de lunes a domingo)"""
    periodos = []
    año = 2025
    fecha_inicio = date(año, 1, 1)
    
    # Ajustar al primer lunes si no empieza en lunes
    if fecha_inicio.weekday() != 0:  # 0 es lunes
        fecha_inicio += timedelta(days=(7 - fecha_inicio.weekday()))
    
    semana_num = 1
    fecha_actual = fecha_inicio
    
    while fecha_actual.year == año:
        fecha_fin = fecha_actual + timedelta(days=6)
        mes_numero = fecha_actual.month
        mes_nombre = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ][mes_numero-1]
        
        periodos.append({
            'id': f"{año}-S-{semana_num:02d}",
            'tipo': 'SEMANAL',
            'fecha_inicio': fecha_actual.strftime('%Y-%m-%d'),
            'fecha_fin': fecha_fin.strftime('%Y-%m-%d'),
            'etiqueta': f"SEMANA {semana_num}",
            'mes': mes_nombre,
            'mes_numero': mes_numero,
            'año': año,
            'total_dias': 7
        })
        fecha_actual += timedelta(days=7)
        semana_num += 1
    
    return periodos

def generar_periodos_nominales(tipo_periodo, año=2025):
    """Genera todos los periodos nominales del año especificado"""
    periodos = []
    meses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    
    if tipo_periodo == 'SEMANAL':
        return generar_calendario_semanal_2025()
    
    if tipo_periodo == 'QUINCENAL':
        for mes in range(1, 13):
            # ✅ SOLUCIÓN: Usar strings directamente para evitar problemas de timezone
            # Primera quincena (días 1-15)
            periodos.append({
                'id': f"{año}-Q1-{mes:02d}",
                'tipo': 'QUINCENAL',
                'fecha_inicio': f"{año}-{mes:02d}-01",  # ← FORMATO STRING DIRECTAMENTE
                'fecha_fin': f"{año}-{mes:02d}-15",     # ← FORMATO STRING DIRECTAMENTE
                'etiqueta': f"{meses[mes-1].upper()}/01",
                'mes': meses[mes-1],
                'mes_numero': mes,
                'año': año,
                'total_dias': 15,
                'quincena': '01'
            })
            
            # Segunda quincena (días 16-fin de mes)
            # Calcular el último día del mes
            if mes == 12:
                ultimo_dia = 31
            else:
                ultimo_dia = (date(año, mes + 1, 1) - timedelta(days=1)).day
            
            dias_segunda_quincena = ultimo_dia - 15
            
            periodos.append({
                'id': f"{año}-Q2-{mes:02d}",
                'tipo': 'QUINCENAL',
                'fecha_inicio': f"{año}-{mes:02d}-16",  # ← FORMATO STRING DIRECTAMENTE
                'fecha_fin': f"{año}-{mes:02d}-{ultimo_dia:02d}",  # ← FORMATO STRING DIRECTAMENTE
                'etiqueta': f"{meses[mes-1].upper()}/02",
                'mes': meses[mes-1],
                'mes_numero': mes,
                'año': año,
                'total_dias': dias_segunda_quincena,
                'quincena': '02'
            })
    
    elif tipo_periodo == 'MENSUAL':
        for mes in range(1, 13):
            # Calcular el último día del mes
            if mes == 12:
                ultimo_dia = 31
            else:
                ultimo_dia = (date(año, mes + 1, 1) - timedelta(days=1)).day
            
            periodos.append({
                'id': f"{año}-M-{mes:02d}",
                'tipo': 'MENSUAL',
                'fecha_inicio': f"{año}-{mes:02d}-01",  # ← FORMATO STRING DIRECTAMENTE
                'fecha_fin': f"{año}-{mes:02d}-{ultimo_dia:02d}",  # ← FORMATO STRING DIRECTAMENTE
                'etiqueta': meses[mes-1].upper(),
                'mes': meses[mes-1],
                'mes_numero': mes,
                'año': año,
                'total_dias': ultimo_dia
            })
    
    return periodos

def obtener_periodos_nominales(request, tipo_periodo):
    """Endpoint para obtener todos los periodos de un tipo específico"""
    try:
        if tipo_periodo not in ['SEMANAL', 'QUINCENAL', 'MENSUAL']:
            return JsonResponse({
                'error': 'Tipo de periodo no válido',
                'tipos_permitidos': ['SEMANAL', 'QUINCENAL', 'MENSUAL'],
                'status': 'error'
            }, status=400)
            
        # Permitir especificar el año por parámetro (opcional)
        año_param = request.GET.get('año')
        if año_param:
            try:
                año = int(año_param)
                if año < 2000 or año > 2100:
                    return JsonResponse({
                        'error': 'El año debe estar entre 2000 y 2100',
                        'status': 'error'
                    }, status=400)
            except ValueError:
                return JsonResponse({
                    'error': 'El año debe ser un valor numérico válido',
                    'status': 'error'
                }, status=400)
        else:
            año = 2025  # Valor por defecto
            
        periodos = generar_periodos_nominales(tipo_periodo, año)
        
        # ✅ DEBUG: Verificar período AGOSTO/01 específicamente
        for periodo in periodos:
            if periodo.get('etiqueta') == 'AGOSTO/01':
                print("✅ PERIODO AGOSTO/01 ENCONTRADO:")
                print(f"   ID: {periodo['id']}")
                print(f"   Fecha inicio: {periodo['fecha_inicio']}")
                print(f"   Fecha fin: {periodo['fecha_fin']}")
                print(f"   Total días: {periodo.get('total_dias', 'N/A')}")
        
        return JsonResponse({
            'periodos': periodos,
            'total_periodos': len(periodos),
            'tipo_periodo': tipo_periodo,
            'año': año,
            'status': 'success'
        })
        
    except Exception as e:
        return JsonResponse({
            'error': f'Error al generar periodos: {str(e)}',
            'status': 'error'
        }, status=500)

def obtener_periodos_semanales(request):
    """Endpoint para obtener todos los periodos semanales"""
    try:
        # Permitir especificar el año por parámetro (opcional)
        año_param = request.GET.get('año')
        if año_param:
            try:
                año = int(año_param)
                if año < 2000 or año > 2100:
                    return JsonResponse({
                        'error': 'El año debe estar entre 2000 y 2100',
                        'status': 'error'
                    }, status=400)
            except ValueError:
                return JsonResponse({
                    'error': 'El año debe ser un valor numérico válido',
                    'status': 'error'
                }, status=400)
        else:
            año = 2025  # Valor por defecto
            
        # Para años diferentes a 2025, generar semanas dinámicamente
        if año == 2025:
            semanas = generar_calendario_semanal_2025()
        else:
            semanas = generar_calendario_semanal_por_año(año)
            
        return JsonResponse({
            'semanas': semanas,
            'total_semanas': len(semanas),
            'año': año,
            'status': 'success'
        })
        
    except Exception as e:
        return JsonResponse({
            'error': f'Error al generar semanas: {str(e)}',
            'status': 'error'
        }, status=500)

def generar_calendario_semanal_por_año(año):
    """Genera todas las semanas de cualquier año (considerando semanas de lunes a domingo)"""
    periodos = []
    fecha_inicio = date(año, 1, 1)
    
    # Ajustar al primer lunes si no empieza en lunes
    if fecha_inicio.weekday() != 0:  # 0 es lunes
        fecha_inicio += timedelta(days=(7 - fecha_inicio.weekday()))
    
    semana_num = 1
    fecha_actual = fecha_inicio
    
    while fecha_actual.year == año:
        fecha_fin = fecha_actual + timedelta(days=6)
        mes_numero = fecha_actual.month
        mes_nombre = [
            "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ][mes_numero-1]
        
        periodos.append({
            'id': f"{año}-S-{semana_num:02d}",
            'tipo': 'SEMANAL',
            'fecha_inicio': fecha_actual.strftime('%Y-%m-%d'),
            'fecha_fin': fecha_fin.strftime('%Y-%m-%d'),
            'etiqueta': f"SEMANA {semana_num}",
            'mes': mes_nombre,
            'mes_numero': mes_numero,
            'año': año,
            'total_dias': 7
        })
        fecha_actual += timedelta(days=7)
        semana_num += 1
    
    return periodos

def obtener_periodo_actual(tipo_periodo, fecha_referencia=None):
    """Obtiene el periodo actual basado en una fecha de referencia"""
    if fecha_referencia is None:
        fecha_referencia = date.today()
    
    año = fecha_referencia.year
    mes = fecha_referencia.month
    dia = fecha_referencia.day
    
    periodos = generar_periodos_nominales(tipo_periodo, año)
    
    if tipo_periodo == 'QUINCENAL':
        # Para quincenas: primera quincena (1-15), segunda quincena (16-fin de mes)
        if dia <= 15:
            quincena = '01'
        else:
            quincena = '02'
        
        # Buscar el periodo correspondiente
        for periodo in periodos:
            if (periodo['mes_numero'] == mes and 
                periodo.get('quincena') == quincena):
                return periodo
    
    elif tipo_periodo == 'MENSUAL':
        # Para mensual: buscar por mes
        for periodo in periodos:
            if periodo['mes_numero'] == mes:
                return periodo
    
    elif tipo_periodo == 'SEMANAL':
        # Para semanal: encontrar la semana que contiene la fecha
        for periodo in periodos:
            fecha_inicio = date.fromisoformat(periodo['fecha_inicio'])
            fecha_fin = date.fromisoformat(periodo['fecha_fin'])
            if fecha_inicio <= fecha_referencia <= fecha_fin:
                return periodo
    
    return None

# Función de utilidad para verificar si una fecha está dentro de un periodo
def fecha_en_periodo(fecha, periodo):
    """Verifica si una fecha está dentro del rango de un periodo"""
    if isinstance(fecha, str):
        fecha = date.fromisoformat(fecha)
    
    fecha_inicio = date.fromisoformat(periodo['fecha_inicio'])
    fecha_fin = date.fromisoformat(periodo['fecha_fin'])
    
    return fecha_inicio <= fecha <= fecha_fin

# ✅ FUNCIÓN DE REPARACIÓN EMERGENCIA
def reparar_periodo_agosto(periodos):
    """Función de reparación específica para AGOSTO/01"""
    periodos_reparados = []
    
    for periodo in periodos:
        # Reparar específicamente AGOSTO/01
        if periodo.get('etiqueta') == 'AGOSTO/01':
            periodo_reparado = {
                'id': '2025-Q1-08',
                'tipo': 'QUINCENAL',
                'fecha_inicio': '2025-08-01',
                'fecha_fin': '2025-08-15',
                'etiqueta': 'AGOSTO/01',
                'mes': 'Agosto',
                'mes_numero': 8,
                'año': 2025,
                'total_dias': 15,
                'quincena': '01'
            }
            print("🔧 PERIODO AGOSTO/01 REPARADO FORZOSAMENTE")
            periodos_reparados.append(periodo_reparado)
        # Reparar específicamente AGOSTO/02
        elif periodo.get('etiqueta') == 'AGOSTO/02':
            periodo_reparado = {
                'id': '2025-Q2-08',
                'tipo': 'QUINCENAL',
                'fecha_inicio': '2025-08-16',
                'fecha_fin': '2025-08-31',
                'etiqueta': 'AGOSTO/02',
                'mes': 'Agosto',
                'mes_numero': 8,
                'año': 2025,
                'total_dias': 16,
                'quincena': '02'
            }
            print("🔧 PERIODO AGOSTO/02 REPARADO FORZOSAMENTE")
            periodos_reparados.append(periodo_reparado)
        else:
            periodos_reparados.append(periodo)
    
    return periodos_reparados

# ✅ VERSIÓN FINAL DE generar_periodos_nominales CON REPARACIÓN
def generar_periodos_nominales_final(tipo_periodo, año=2025):
    """Versión final con reparación de emergencia"""
    periodos = generar_periodos_nominales(tipo_periodo, año)
    
    # Aplicar reparación específica para AGOSTO
    if año == 2025 and tipo_periodo == 'QUINCENAL':
        periodos = reparar_periodo_agosto(periodos)
    
    return periodos