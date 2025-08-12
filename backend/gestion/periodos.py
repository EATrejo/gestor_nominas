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
            'año': año
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
    
    fecha_inicio = date(año, 1, 1)
    
    if tipo_periodo == 'QUINCENAL':
        for mes in range(1, 13):
            # Primera quincena (días 1-15)
            fin_quincena1 = date(año, mes, 15)
            periodos.append({
                'id': f"{año}-Q1-{mes:02d}",
                'tipo': 'QUINCENAL',
                'fecha_inicio': date(año, mes, 1).strftime('%Y-%m-%d'),
                'fecha_fin': fin_quincena1.strftime('%Y-%m-%d'),
                'etiqueta': f"{meses[mes-1].upper()}/01",
                'mes': meses[mes-1],
                'mes_numero': mes,
                'año': año
            })
            
            # Segunda quincena (días 16-fin de mes)
            inicio_quincena2 = date(año, mes, 16)
            ultimo_dia = (date(año, mes+1, 1) - timedelta(days=1)).day if mes < 12 else 31
            fin_quincena2 = date(año, mes, ultimo_dia)
            periodos.append({
                'id': f"{año}-Q2-{mes:02d}",
                'tipo': 'QUINCENAL',
                'fecha_inicio': inicio_quincena2.strftime('%Y-%m-%d'),
                'fecha_fin': fin_quincena2.strftime('%Y-%m-%d'),
                'etiqueta': f"{meses[mes-1].upper()}/02",
                'mes': meses[mes-1],
                'mes_numero': mes,
                'año': año
            })
    
    elif tipo_periodo == 'MENSUAL':
        for mes in range(1, 13):
            ultimo_dia = (date(año, mes+1, 1) - timedelta(days=1)).day if mes < 12 else 31
            periodos.append({
                'id': f"{año}-M-{mes:02d}",
                'tipo': 'MENSUAL',
                'fecha_inicio': date(año, mes, 1).strftime('%Y-%m-%d'),
                'fecha_fin': date(año, mes, ultimo_dia).strftime('%Y-%m-%d'),
                'etiqueta': meses[mes-1].upper(),
                'mes': meses[mes-1],
                'mes_numero': mes,
                'año': año
            })
    
    return periodos

def obtener_periodos_nominales(request, tipo_periodo):
    """Endpoint para obtener todos los periodos de un tipo específico"""
    try:
        if tipo_periodo not in ['SEMANAL', 'QUINCENAL', 'MENSUAL']:
            return JsonResponse({
                'error': 'Tipo de periodo no válido',
                'tipos_permitidos': ['SEMANAL', 'QUINCENAL', 'MENSUAL']
            }, status=400)
            
        # Permitir especificar el año por parámetro (opcional)
        año = int(request.GET.get('año', 2025))
        periodos = generar_periodos_nominales(tipo_periodo, año)
        
        return JsonResponse({
            'periodos': periodos,
            'total_periodos': len(periodos),
            'tipo_periodo': tipo_periodo,
            'año': año,
            'status': 'success'
        })
    except ValueError:
        return JsonResponse({'error': 'El año debe ser un valor numérico'}, status=400)
    except Exception as e:
        return JsonResponse({
            'error': f'Error al generar periodos: {str(e)}',
            'status': 'error'
        }, status=500)
    

def obtener_periodos_semanales(request):
    """Endpoint para obtener todos los periodos semanales de 2025"""
    try:
        semanas = generar_calendario_semanal_2025()
        return JsonResponse({
            'semanas': semanas,
            'total_semanas': len(semanas),
            'año': 2025
        })
    except Exception as e:
        return JsonResponse(
            {'error': str(e)},
            status=500
        )                                         