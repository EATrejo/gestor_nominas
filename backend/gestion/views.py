import re
import os
import pandas as pd
from decimal import Decimal, getcontext, InvalidOperation
from datetime import datetime, timedelta, date
from django.utils import timezone
import calendar
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q
from django.conf import settings
import traceback
from datetime import datetime
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal
from .models import Empresa, Empleado, Nomina
from .serializers import NominaSerializer, EmpresaSerializer
from .utils import DIAS_FESTIVOS_2025, calcular_nomina_mensual, calcular_nomina_quincenal, calcular_nomina_semanal, calcular_nomina_empleado
from .periodos import generar_periodos_nominales
from gestion.serializers import NominaSerializer
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer # type: ignore
from rest_framework_simplejwt.views import TokenObtainPairView # type: ignore
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import viewsets, status, permissions, generics
from rest_framework.response import Response
from rest_framework.decorators import action, permission_classes
from rest_framework.exceptions import PermissionDenied
from io import StringIO
from .permissions import IsAdminOrEmpresaOwner, IsAdminOrSameEmpresa, EsAdministradorEmpresa
from .models import Empresa, Empleado, Nomina, User
from .serializers import (
    EmpresaSerializer,
    EmpleadoSerializer,
    NominaSerializer,
    UserSerializer,
    EmpresaRegistrationSerializer,
    UserRegistrationSerializer
)
from .permissions import IsAdminOrEmpresaOwner, IsAdminOrSameEmpresa, EsAdministradorEmpresa
from .utils import CalculadoraIMSS, calcular_nomina_empleado, calcular_isr, calcular_imss, calcular_nomina_semanal, calcular_semana_laboral
from .periodos import generar_periodos_nominales

from rest_framework_simplejwt.tokens import RefreshToken # type: ignore

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        refresh = self.get_token(self.user)
        
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'tipo_usuario': self.user.tipo_usuario,
        }
        
        # Add empresa info if exists
        if hasattr(self.user, 'empresas_relacionadas') and self.user.empresas_relacionadas.exists():
            empresa = self.user.empresas_relacionadas.first()
            data['user']['empresa_id'] = empresa.id
            data['user']['empresa_nombre'] = empresa.nombre
            
        return data

from rest_framework_simplejwt.views import TokenObtainPairView # type: ignore
class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # Set CORS headers
        response["Access-Control-Allow-Origin"] = request.headers.get('Origin', '*')
        response["Access-Control-Allow-Credentials"] = "true"
        
        return response
    
@method_decorator(csrf_exempt, name='dispatch')
class EmpresaRegistrationView(generics.CreateAPIView):
    serializer_class = EmpresaRegistrationSerializer
    permission_classes = [AllowAny]
    
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegistrationSerializer
    permission_classes = [IsAuthenticated, EsAdministradorEmpresa]
    
    @method_decorator(csrf_exempt)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

@method_decorator(csrf_exempt, name='dispatch')
class EmpresaViewSet(viewsets.ModelViewSet):
    queryset = Empresa.objects.all()
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated]  # Temporal para pruebas
    #permission_classes = [IsAuthenticated, IsAdminOrEmpresaOwner]

    def get_queryset(self):
        # Filtra por el usuario autenticado
        return self.queryset.filter(usuarios=self.request.user)
    #def get_queryset(self):
    #    user = self.request.user
    #    if user.is_superuser:
    #        return self.queryset
    #    return self.queryset.filter(usuarios=user)

    def perform_create(self, serializer):
        if not self.request.user.is_superuser:
            raise PermissionDenied("Solo administradores pueden crear empresas directamente")
        serializer.save()

@method_decorator(csrf_exempt, name='dispatch')
class EmpleadoViewSet(viewsets.ModelViewSet):
    queryset = Empleado.objects.all()
    serializer_class = EmpleadoSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSameEmpresa]

    def handle_exception(self, exc):
        if isinstance(exc, ValidationError) and 'rfc' in exc.message_dict:
            return Response(
                {'error': 'No se pueden registrar dos empleados con el mismo RFC', 
                 'detalle': exc.message_dict['rfc']},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().handle_exception(exc)

    def get_queryset(self):
        queryset = self.queryset
        user = self.request.user
        
        if not user.is_superuser:
            queryset = queryset.filter(empresa__usuarios=user)
        
        if empresa_id := self.request.query_params.get('empresa_id'):
            queryset = queryset.filter(empresa_id=empresa_id)
            
        return queryset.select_related('empresa')

    def handle_date_format(self, data):
        if 'fecha_ingreso' in data and isinstance(data['fecha_ingreso'], str):
            try:
                data['fecha_ingreso'] = datetime.strptime(data['fecha_ingreso'], '%d/%m/%Y').date()
            except ValueError:
                raise ValidationError({'fecha_ingreso': 'Formato inválido. Use DD/MM/YYYY'})
        return data

    def perform_create(self, serializer):
        data = self.handle_date_format(serializer.validated_data)
        serializer.save(**data)

    def perform_update(self, serializer):
        data = self.handle_date_format(serializer.validated_data)
        serializer.save(**data)

@method_decorator(csrf_exempt, name='dispatch')
class NominaViewSet(viewsets.ModelViewSet):
    queryset = Nomina.objects.all()
    serializer_class = NominaSerializer
    permission_classes = [IsAuthenticated, IsAdminOrSameEmpresa]

    def get_queryset(self):
        queryset = self.queryset
        user = self.request.user
        
        if not user.is_superuser:
            queryset = queryset.filter(empresa__usuarios=user)
            
        return queryset.select_related('empleado', 'empresa')

    def perform_create(self, serializer):
        serializer.save(creado_por=self.request.user)



    @action(detail=False, methods=['post'])
    def procesar_nomina(self, request):
        """
        Procesa la nómina para todos los empleados activos de una empresa en un periodo específico
        con manejo correcto de días festivos según días de descanso del empleado.
        Incluye transacciones atómicas y manejo robusto de errores.
        """
        try:
            # =============================================
            # 1. VALIDACIÓN DE PARÁMETROS INICIALES
            # =============================================
            tipo_periodo = request.data.get('tipo_periodo', '').upper()
            periodo_id = request.data.get('periodo_id')
            empresa_id = request.data.get('empresa_id')
            
            if not tipo_periodo or tipo_periodo not in ['SEMANAL', 'QUINCENAL', 'MENSUAL']:
                return Response(
                    {
                        'error': 'Tipo de periodo no válido',
                        'detalle': 'Debe especificar SEMANAL, QUINCENAL o MENSUAL'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if not empresa_id:
                return Response(
                    {'error': 'Se requiere el ID de la empresa'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # =============================================
            # 2. OBTENER EMPRESA Y PERIODO
            # =============================================
            try:
                empresa = Empresa.objects.get(id=empresa_id)
                self.check_object_permissions(request, empresa)
            except Empresa.DoesNotExist:
                return Response(
                    {'error': 'Empresa no encontrada'},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Obtener el periodo seleccionado
            periodos = generar_periodos_nominales(tipo_periodo)
            periodo_seleccionado = next((p for p in periodos if p['id'] == periodo_id), None)
            
            if not periodo_seleccionado:
                return Response(
                    {
                        'error': 'Periodo no válido',
                        'detalle': f'No se encontró el periodo {periodo_id} para tipo {tipo_periodo}'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # =============================================
            # 3. VALIDACIÓN Y CONFIGURACIÓN DE FECHAS
            # =============================================
            try:
                fecha_inicio = datetime.strptime(periodo_seleccionado['fecha_inicio'], '%Y-%m-%d').date()
                fecha_fin = datetime.strptime(periodo_seleccionado['fecha_fin'], '%Y-%m-%d').date()
                
                # Validación adicional para quincenas
                if tipo_periodo == 'QUINCENAL' and fecha_inicio.day > 15:  # Segunda quincena
                    # Calcular días exactos de la quincena
                    if fecha_inicio.month == 12:
                        siguiente_mes = date(fecha_inicio.year + 1, 1, 1)
                    else:
                        siguiente_mes = date(fecha_inicio.year, fecha_inicio.month + 1, 1)
                    ultimo_dia = (siguiente_mes - timedelta(days=1)).day
                    dias_quincena = ultimo_dia - 15
                    
                    # Actualizar fecha_fin con el cálculo preciso
                    fecha_fin = date(fecha_inicio.year, fecha_inicio.month, ultimo_dia)
                    periodo_seleccionado['fecha_fin'] = fecha_fin.strftime('%Y-%m-%d')
                    periodo_seleccionado['total_dias'] = dias_quincena
                    
            except ValueError as e:
                return Response(
                    {
                        'error': 'Formato de fecha inválido en periodo',
                        'detalle': str(e)
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # =============================================
            # 4. PROCESAR NÓMINA PARA CADA EMPLEADO (CON TRANSACCIÓN)
            # =============================================
            empleados = Empleado.objects.filter(
                periodo_nominal=tipo_periodo,
                empresa=empresa,
                activo=True
            ).select_related('empresa')
            
            if not empleados.exists():
                return Response(
                    {
                        'error': 'No hay empleados para procesar',
                        'detalle': f'No hay empleados activos con periodo {tipo_periodo} en {empresa.nombre}'
                    },
                    status=status.HTTP_404_NOT_FOUND
                )
            
            nominas = []
            errores = []
            
            try:
                with transaction.atomic():  # Transacción global para todo el procesamiento
                    for empleado in empleados:
                        try:
                            # Intenta obtener la nómina existente primero
                            nomina, created = Nomina.objects.get_or_create(
                                empleado=empleado,
                                fecha_inicio=fecha_inicio,
                                fecha_fin=fecha_fin,
                                defaults={
                                    'empresa': empresa,
                                    'tipo_nomina': tipo_periodo,
                                    'periodo_nominal': periodo_seleccionado['etiqueta'],
                                    'estado': 'PENDIENTE',
                                    'creado_por': request.user
                                }
                            )
                            
                            # Obtener faltas del empleado para este periodo específico
                            faltas = len([
                                f for f in empleado.fechas_faltas 
                                if fecha_inicio <= datetime.strptime(f, '%Y-%m-%d').date() <= fecha_fin
                            ])
                            
                            # Calcular nómina
                            nomina_data = calcular_nomina_empleado(
                                empleado, 
                                periodo=tipo_periodo.lower(),
                                dias_laborados=None,
                                faltas_en_periodo=faltas,
                                fecha_referencia=fecha_inicio
                            )
                            
                            # Actualizar campos de la nómina
                            nomina.faltas_en_periodo = faltas
                            nomina.calculos = nomina_data
                            nomina.salario_neto = Decimal(str(nomina_data['resumen'].get('neto_a_pagar', 0)))
                            
                            # Si ya existía, actualiza el estado
                            if not created:
                                nomina.estado = 'PENDIENTE'
                            
                            # Validación y guardado
                            nomina.full_clean()
                            nomina.save()
                            
                            nominas.append(NominaSerializer(nomina).data)
                            
                        except ValidationError as e:
                            errores.append({
                                'empleado': empleado.nombre_completo,
                                'error': str(e),
                                'tipo_error': 'ValidationError'
                            })
                        except Exception as e:
                            errores.append({
                                'empleado': empleado.nombre_completo,
                                'id_empleado': empleado.id,
                                'error': str(e),
                                'periodo': periodo_seleccionado['etiqueta'],
                                'tipo_error': type(e).__name__
                            })
                            
            except Exception as e:
                return Response(
                    {
                        'error': 'Error en la transacción de nómina',
                        'detalle': str(e)
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # =============================================
            # 5. CONSTRUIR RESPUESTA CON MANEJO SEGURO DE DATOS
            # =============================================
            def safe_decimal(value, default='0'):
                """Convierte un valor a Decimal de forma segura"""
                try:
                    return Decimal(str(value))
                except (TypeError, ValueError, InvalidOperation):
                    return Decimal(default)

            def get_nested_value(data, keys, default=0):
                """Obtiene un valor anidado de un diccionario de forma segura"""
                for key in keys:
                    try:
                        data = data[key]
                    except (KeyError, TypeError):
                        return default
                return data

            # Calcular totales de manera segura
            total_nomina = sum(safe_decimal(n['salario_neto']) for n in nominas)
            total_percepciones = sum(
                safe_decimal(get_nested_value(n, ['calculos', 'percepciones', 'total']))
                for n in nominas
            )
            total_deducciones = sum(
                safe_decimal(get_nested_value(n, ['calculos', 'deducciones', 'total']))
                for n in nominas
            )
            promedio_nomina = total_nomina / len(nominas) if nominas else Decimal('0')

            response_data = {
                'periodo': periodo_seleccionado,
                'empresa': {
                    'id': empresa.id,
                    'nombre': empresa.nombre,
                    'total_empleados': empleados.count()
                },
                'procesamiento': {
                    'total_empleados_procesados': len(nominas),
                    'total_errores': len(errores),
                    'fecha_procesamiento': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
                    'usuario': request.user.email
                },
                'nominas': nominas,
                'errores': errores,
                'resumen_financiero': {
                    'total_nomina': str(total_nomina),
                    'promedio_nomina': str(promedio_nomina),
                    'total_deducciones': str(total_deducciones),
                    'total_percepciones': str(total_percepciones)
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            error_response = {
                'error': 'Error en el servidor al procesar nómina',
                'detalle': str(e),
                'tipo_error': type(e).__name__,
                'timestamp': timezone.now().strftime('%Y-%m-%d %H:%M:%S')
            }
            if settings.DEBUG:
                error_response['traceback'] = traceback.format_exc()
            return Response(error_response, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
   
    @action(detail=False, methods=['GET'], url_path='calcular-todos')
    def calcular_todos(self, request):
        try:
            user = request.user
            empresa_id = request.query_params.get('empresa_id')
            periodo = request.query_params.get('periodo', 'quincenal').lower()
            
            # Validación de empresa
            if user.is_superuser:
                if not empresa_id:
                    return Response(
                        {"error": "Los administradores deben especificar empresa_id"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    empresa = Empresa.objects.get(id=empresa_id)
                except Empresa.DoesNotExist:
                    return Response(
                        {"error": "Empresa no encontrada"}, 
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                empresas = user.empresas.all()
                if not empresas.exists():
                    return Response(
                        {"error": "El usuario no tiene empresas asociadas"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                empresa = empresas.get(id=empresa_id) if empresa_id else empresas.first()

            # Validar y obtener días trabajados
            dias_trabajados = int(request.query_params.get('dias_trabajados', 
                                    7 if periodo == 'semanal' else 
                                    15 if periodo == 'quincenal' else 30))
            
            if periodo == 'semanal' and not 1 <= dias_trabajados <= 7:
                return Response(
                    {"error": "Para SEMANAL, días trabajados debe ser 1-7"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            elif periodo == 'quincenal' and not 1 <= dias_trabajados <= 15:
                return Response(
                    {"error": "Para QUINCENAL, días trabajados debe ser 1-15"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Configurar fechas del periodo
            hoy = date.today()
            if periodo == 'quincenal':
                if hoy.day <= 15:
                    fecha_inicio = date(hoy.year, hoy.month, 1)
                    fecha_fin = date(hoy.year, hoy.month, 15)
                else:
                    fecha_inicio = date(hoy.year, hoy.month, 16)
                    fecha_fin = date(hoy.year, hoy.month, (date(hoy.year, hoy.month + 1, 1) - timedelta(days=1)).day)
                periodo_formateado = f"Quincena {'01' if hoy.day <= 15 else '02'}"
            elif periodo == 'semanal':
                fecha_inicio = hoy - timedelta(days=hoy.weekday())
                fecha_fin = fecha_inicio + timedelta(days=6)
                semana_num = (fecha_inicio.day - 1) // 7 + 1
                periodo_formateado = f"Semana {semana_num}"
            else:  # mensual
                fecha_inicio = date(hoy.year, hoy.month, 1)
                fecha_fin = date(hoy.year, hoy.month, (date(hoy.year, hoy.month + 1, 1) - timedelta(days=1)).day)
                periodo_formateado = "Mensual"

            # Procesar empleados
            empleados = Empleado.objects.filter(empresa=empresa, activo=True)
            resultados = {
                'empresa_id': empresa.id,
                'periodo': periodo,
                'fecha_inicio': fecha_inicio.strftime('%d/%m/%Y'),
                'fecha_fin': fecha_fin.strftime('%d/%m/%Y'),
                'dias_trabajados': dias_trabajados,
                'nominas': []
            }

            for empleado in empleados:
                try:
                    if periodo == 'semanal':
                        nomina_data = calcular_nomina_semanal(
                            empleado, 
                            dias_trabajados=dias_trabajados,
                            fecha_referencia=fecha_inicio
                        )
                    else:
                        nomina_data = calcular_nomina_empleado(empleado, periodo)
                    
                    # Construir respuesta
                    resultados['nominas'].append({
                        'empleado': {
                            'id': empleado.id,
                            'nombre_completo': empleado.nombre_completo,
                            'dias_trabajados': dias_trabajados
                        },
                        'percepciones': {
                            'sueldo': {
                                'importe': nomina_data['salario_bruto'],
                                'dias': dias_trabajados
                            }
                        },
                        'deducciones': {
                            'isr': nomina_data.get('isr_retenido', 0),
                            'imss': nomina_data.get('total_imss', 0)
                        },
                        'neto_a_pagar': nomina_data['salario_neto']
                    })
                    
                    # Registrar en BD
                    Nomina.objects.create(
                        empleado=empleado,
                        empresa=empresa,
                        tipo_nomina=periodo.upper(),
                        fecha_inicio=fecha_inicio,
                        fecha_fin=fecha_fin,
                        salario_neto=Decimal(str(nomina_data['salario_neto'])),
                        calculos=nomina_data
                    )
                    
                except Exception as e:
                    if 'errores' not in resultados:
                        resultados['errores'] = []
                    resultados['errores'].append({
                        'empleado_id': empleado.id,
                        'error': str(e)
                    })

            return Response(resultados)
            
        except Exception as e:
            return Response(
                {"error": f"Error en el servidor: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
    @action(detail=False, methods=['GET'])
    def calcular(self, request):
        try:
            # Obtener parámetros de la solicitud
            empleado_id = request.query_params.get('empleado_id')
            periodo = request.query_params.get('periodo', 'quincenal').lower()
            
            # Validar parámetros requeridos
            if not empleado_id:
                return Response(
                    {"error": "Se requiere empleado_id"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Definir días trabajados según periodo
            dias_por_periodo = {'quincenal': 15, 'mensual': 30, 'semanal': 7}
            
            # Obtener días trabajados (si se especifican)
            dias_trabajados = request.query_params.get('dias_trabajados')
            
            if dias_trabajados is None:
                dias_trabajados = dias_por_periodo.get(periodo, 15)
            else:
                try:
                    dias_trabajados = int(dias_trabajados)
                    if dias_trabajados <= 0:
                        return Response(
                            {"error": "dias_trabajados debe ser mayor a 0"}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                except ValueError:
                    return Response(
                        {"error": "dias_trabajados debe ser un número entero válido"}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Validar periodo
            if periodo not in dias_por_periodo:
                return Response(
                    {"error": "Periodo debe ser: quincenal, mensual o semanal"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Obtener empleado y verificar permisos
            empleado = Empleado.objects.get(id=empleado_id)
            self.check_object_permissions(request, empleado)

            # Calcular datos de nómina
            nomina_data = calcular_nomina_empleado(empleado, periodo)
            sbc_diario = nomina_data['detalle_sbc']['sbc_diario']
            
            # Formatear descripción del periodo para el empleado
            meses = {
                1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
                5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
                9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre"
            }
            
            fecha_inicio = datetime.strptime(nomina_data['fecha_inicio'], '%d/%m/%Y').date()
            mes_nombre = meses.get(fecha_inicio.month, "")
            
            if periodo == 'quincenal':
                descripcion_periodo = f"Quincena {nomina_data['periodo_formateado'].split('/')[1]} de {mes_nombre.upper()} {fecha_inicio.year}"
            elif periodo == 'mensual':
                descripcion_periodo = f"Mes completo de {mes_nombre.upper()} {fecha_inicio.year}"
            else:
                semana_num = int((fecha_inicio.day - 1) / 7) + 1
                descripcion_periodo = f"Semana {semana_num} de {mes_nombre.upper()} {fecha_inicio.year}"
            
            # Construir respuesta
            response_data = {
                'periodo': periodo,
                'periodo_formateado': nomina_data['periodo_formateado'],
                'descripcion_periodo': descripcion_periodo,
                'fecha_inicio': nomina_data['fecha_inicio'],
                'fecha_fin': nomina_data['fecha_fin'],
                'dias_trabajados': dias_trabajados,
                'salario_bruto': nomina_data['salario_bruto'],
                'isr_retenido': nomina_data['isr_retenido'],
                'imss': nomina_data['imss'],
                'pago_extra': nomina_data['pago_extra'],
                'exencion_isr': nomina_data['exencion_isr'],
                'salario_neto': nomina_data['salario_neto'],
                'empleado': {
                    'id': empleado.id,
                    'nombre_completo': empleado.nombre_completo,
                    'rfc': empleado.rfc,
                    'nss': empleado.nss,
                    'salario_diario': float(empleado.salario_diario),
                    'sbc_diario': sbc_diario,
                    'dias_descanso': empleado.dias_descanso
                },
                'detalle_sbc': nomina_data['detalle_sbc'],
                'detalle_calculo': {
                    'formula_salario_bruto': f"{empleado.salario_diario} * {dias_trabajados} días",
                    'periodo_seleccionado': periodo,
                    'dias_por_periodo': dias_por_periodo[periodo],
                    'factor_integracion': float(CalculadoraIMSS.FACTOR_INTEGRACION)
                },
                'detalle_periodo_pago': {
                    'descripcion': descripcion_periodo,
                    'fecha_inicio': nomina_data['fecha_inicio'],
                    'fecha_fin': nomina_data['fecha_fin'],
                    'dias_laborados': dias_trabajados,
                    'periodo_nomina': nomina_data['periodo_formateado']
                }
            }
            
            return Response(response_data)
            
        except Empleado.DoesNotExist:
            return Response(
                {"error": "Empleado no encontrado"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"error": f"Error en cálculo de nómina: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    @action(detail=False, methods=['GET'], url_path='calcular-semanal')
    def calcular_semanal(self, request):
        try:
            # Obtener parámetros
            semana_id = request.query_params.get('semana_id')
            empresa_id = request.query_params.get('empresa_id')
            dias_trabajados = int(request.query_params.get('dias_trabajados', 7))
            
            # Validar empresa
            if not empresa_id:
                return Response(
                    {"error": "Se requiere empresa_id"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            try:
                empresa = Empresa.objects.get(id=empresa_id)
            except Empresa.DoesNotExist:
                return Response(
                    {"error": "Empresa no encontrada"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Verificar permisos
            if not request.user.is_superuser and empresa not in request.user.empresas.all():
                return Response(
                    {"error": "No tienes permisos para esta empresa"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Obtener fechas del periodo
            if semana_id:
                try:
                    num_semana = int(semana_id.split('-')[-1])
                    fecha_inicio = date(2025, 1, 1) + timedelta(weeks=num_semana-1)
                    fecha_fin = fecha_inicio + timedelta(days=6)
                    semana_seleccionada = {
                        'numero_semana': num_semana,
                        'etiqueta': f"Semana {num_semana} del {fecha_inicio.strftime('%d/%m')} al {fecha_fin.strftime('%d/%m/%Y')}",
                        'mes': fecha_inicio.strftime('%B'),
                        'fecha_inicio': fecha_inicio.strftime('%Y-%m-%d'),
                        'fecha_fin': fecha_fin.strftime('%Y-%m-%d')
                    }
                except (ValueError, IndexError):
                    return Response(
                        {"error": "Formato de semana_id no válido. Use '2025-SEM-NN'"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                hoy = date.today()
                fecha_inicio = hoy - timedelta(days=hoy.weekday())
                fecha_fin = fecha_inicio + timedelta(days=6)
                semana_num = (fecha_inicio.day - 1) // 7 + 1
                semana_seleccionada = {
                    'numero_semana': semana_num,
                    'etiqueta': f"Semana {semana_num} del {fecha_inicio.strftime('%d/%m')} al {fecha_fin.strftime('%d/%m/%Y')}",
                    'mes': fecha_inicio.strftime('%B'),
                    'fecha_inicio': fecha_inicio.strftime('%Y-%m-%d'),
                    'fecha_fin': fecha_fin.strftime('%Y-%m-%d')
                }
            
            # Validar días trabajados
            if not 1 <= dias_trabajados <= 7:
                return Response(
                    {"error": "Días trabajados debe ser entre 1 y 7 para periodo semanal"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener empleados activos
            empleados = Empleado.objects.filter(empresa=empresa, activo=True)
            
            # Construir respuesta
            resultados = {
                'periodo': 'semanal',
                'periodo_seleccionado': {
                    'id': semana_id or f"2025-SEM-{semana_seleccionada['numero_semana']:02d}",
                    'etiqueta': semana_seleccionada['etiqueta'],
                    'fecha_inicio': fecha_inicio.strftime('%d/%m/%Y'),
                    'fecha_fin': fecha_fin.strftime('%d/%m/%Y'),
                    'semana_numero': semana_seleccionada['numero_semana'],
                    'mes': semana_seleccionada['mes']
                },
                'nominas': [],
                'errores': []
            }

            for empleado in empleados:
                try:
                    nomina_data = calcular_nomina_semanal(
                        empleado, 
                        dias_laborados=dias_trabajados,
                        fecha_referencia=fecha_inicio
                    )
                    
                    # Construir respuesta detallada con los nuevos campos
                    nomina_detalle = {
                        'empleado': {
                            'id': empleado.id,
                            'nombre_completo': empleado.nombre_completo,
                            'rfc': empleado.rfc,
                            'nss': empleado.nss,
                            'salario_diario': float(empleado.salario_diario),
                            'sbc_diario': nomina_data['sbc']['diario'],
                            'dias_trabajados': dias_trabajados,
                            'dias_descanso': empleado.dias_descanso
                        },
                        'percepciones': {
                            'sueldo': {
                                'importe': float(empleado.salario_diario * dias_trabajados),
                                'dias': dias_trabajados
                            },
                            'pago_extra': nomina_data['percepciones_extra']['total'],
                            'total_percepciones': nomina_data['resumen']['salario_bruto']
                        },
                        'deducciones': {
                            'isr': nomina_data['deducciones']['isr'],
                            'imss': nomina_data['deducciones']['imss'],
                            'total_deducciones': nomina_data['deducciones']['total_deducciones']
                        },
                        'neto_a_pagar': nomina_data['resumen']['neto_a_pagar'],
                        'percepciones_extra': nomina_data['percepciones_extra'],
                        'detalle_calculo': nomina_data['detalle_calculo'],
                        'detalle_periodo': {
                            'fecha_inicio': nomina_data['periodo']['fecha_inicio'],
                            'fecha_fin': nomina_data['periodo']['fecha_fin'],
                            'semana_numero': semana_seleccionada['numero_semana']
                        }
                    }
                    
                    resultados['nominas'].append(nomina_detalle)
                    
                    # Registrar en BD
                    Nomina.objects.create(
                        empleado=empleado,
                        empresa=empresa,
                        tipo_nomina='SEMANAL',
                        fecha_inicio=fecha_inicio,
                        fecha_fin=fecha_fin,
                        salario_neto=Decimal(str(nomina_data['resumen']['neto_a_pagar'])),
                        calculos=nomina_data
                    )
                    
                except Exception as e:
                    resultados['errores'].append({
                        'empleado_id': empleado.id,
                        'empleado_nombre': empleado.nombre_completo,
                        'error': str(e)
                    })

            return Response(resultados)
            
        except Exception as e:
            return Response(
                {"error": f"Error en cálculo semanal: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
    @action(detail=False, methods=['get'])
    def list_periodos(self, request):
        tipo = request.query_params.get('tipo', 'QUINCENAL')
        periodos = generar_periodos_nominales(tipo)
        return Response({
            'periodos': periodos,
            'total': len(periodos),
            'tipo': tipo
        })
        
@permission_classes([IsAuthenticated])
def obtener_periodos(request):
    tipo_nomina = request.GET.get('tipo', 'QUINCENAL').upper()
    año = int(request.GET.get('año', datetime.now().year))
    
    periodos = []
    if tipo_nomina == "QUINCENAL":
        periodos = [
            {"mes": calendar.month_name[mes], "quincena": q, "año": año}
            for mes in range(1, 13)
            for q in ["1", "2"]
        ]
    elif tipo_nomina == "SEMANAL":
        pass
    elif tipo_nomina == "MENSUAL":
        periodos = [{"mes": calendar.month_name[mes], "año": año} for mes in range(1, 13)]
    
    return Response({"periodos": periodos})

@permission_classes([IsAuthenticated])
def generar_calendario(request):
    try:
        empleado_id = request.GET['empleado_id']
        empleado = Empleado.objects.get(id=empleado_id)
        
        if not request.user.is_superuser and empleado.empresa not in request.user.empresa:
            return Response(
                {"error": "No tiene permisos para este empleado"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        calendario = {
            'empleado': empleado.rfc,
            'dias_descanso': empleado.dias_descanso,
            'dias_festivos': [],
            'periodo': request.GET.get('periodo')
        }
        
        return Response(calendario)
        
    except KeyError:
        return Response( 
            {"error": "Se requiere empleado_id"},
            status=status.HTTP_400_BAD_REQUEST
        )
    except Empleado.DoesNotExist:
        return Response(
            {"error": "Empleado no encontrado"},
            status=status.HTTP_404_NOT_FOUND
        )
    
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, datetime, timedelta
import logging
from .models import Empleado
from .utils import DIAS_FESTIVOS_2025
from .permissions import IsAdminOrSameEmpresa

logger = logging.getLogger(__name__)

@method_decorator(csrf_exempt, name='dispatch')
class FaltasViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated, IsAdminOrSameEmpresa]

    def get_empleado(self, empleado_id):
        try:
            empleado = Empleado.objects.select_related('empresa').get(pk=empleado_id)
            self.check_object_permissions(self.request, empleado)
            return empleado
        except Empleado.DoesNotExist:
            return None
        except Exception as e:
            logger.error(f"Error obteniendo empleado: {str(e)}")
            return None

    @action(detail=False, methods=['post'], url_path=r'empleados/(?P<empleado_id>\d+)/faltas/registrar-faltas')
    def registrar_faltas(self, request, empleado_id=None):
        empleado = self.get_empleado(empleado_id)
        if not empleado:
            return Response(
                {'error': 'Empleado no encontrado o sin permisos'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Validación básica del request
        if not isinstance(request.data, dict) or not isinstance(request.data.get('fechas_faltas', []), list):
            return Response(
                {'error': 'Formato inválido. Se espera {"fechas_faltas": ["YYYY-MM-DD"]}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validar fechas, verificar días de descanso, fecha de ingreso y duplicados
        fechas_faltas = []
        dias_descanso = set(empleado.dias_descanso)
        fecha_ingreso = empleado.fecha_ingreso
        faltas_existentes = set(empleado.fechas_faltas) if hasattr(empleado, 'fechas_faltas') else set()
        
        dias_descanso_nombres = {
            0: "Lunes",
            1: "Martes",
            2: "Miércoles",
            3: "Jueves",
            4: "Viernes",
            5: "Sábado",
            6: "Domingo"
        }
        errores_descanso = []
        errores_fecha_ingreso = []
        errores_duplicados = []
        
        # Verificar fechas duplicadas en la solicitud actual
        fechas_solicitud = set()
        
        for fecha_str in request.data.get('fechas_faltas', []):
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                dia_semana = fecha.weekday()
                
                # Verificar duplicados en la solicitud actual
                if fecha_str in fechas_solicitud:
                    errores_duplicados.append({
                        'fecha': fecha_str,
                        'dia_semana': dias_descanso_nombres[dia_semana],
                        'mensaje': 'Fecha duplicada en esta solicitud'
                    })
                    continue
                fechas_solicitud.add(fecha_str)
                
                # Verificar si la fecha ya está registrada
                if fecha_str in faltas_existentes:
                    errores_duplicados.append({
                        'fecha': fecha_str,
                        'dia_semana': dias_descanso_nombres[dia_semana],
                        'mensaje': 'El empleado ya tiene registrada una falta en esta fecha'
                    })
                    continue
                    
                # Verificar si la fecha es anterior al ingreso del empleado
                if fecha < fecha_ingreso:
                    errores_fecha_ingreso.append({
                        'fecha': fecha_str,
                        'dia_semana': dias_descanso_nombres[dia_semana],
                        'fecha_ingreso': fecha_ingreso.strftime('%Y-%m-%d'),
                        'mensaje': 'La fecha es anterior al ingreso del empleado'
                    })
                    continue
                    
                # Verificar si es día de descanso
                if dia_semana in dias_descanso:
                    errores_descanso.append({
                        'fecha': fecha_str,
                        'dia_semana': dias_descanso_nombres[dia_semana],
                        'mensaje': f'El empleado {empleado_id} descansa este día'
                    })
                    continue
                    
                fechas_faltas.append(fecha.isoformat())
            except ValueError:
                return Response(
                    {'error': f'Formato de fecha inválido: {fecha_str}. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Si hay errores de duplicados, retornarlos primero
        if errores_duplicados:
            return Response(
                {
                    'error': 'No se pueden registrar múltiples faltas en la misma fecha',
                    'detalle': errores_duplicados,
                    'empleado': {
                        'id': empleado_id,
                        'nombre_completo': empleado.nombre_completo,
                        'faltas_registradas': list(faltas_existentes)
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si hay errores de fecha de ingreso, retornarlos
        if errores_fecha_ingreso:
            return Response(
                {
                    'error': f'No se pueden registrar faltas a empleados antes de su fecha de ingreso ({fecha_ingreso.strftime("%Y-%m-%d")})',
                    'detalle': errores_fecha_ingreso,
                    'empleado': {
                        'id': empleado_id,
                        'nombre_completo': empleado.nombre_completo,
                        'fecha_ingreso': fecha_ingreso.strftime('%Y-%m-%d'),
                        'periodo_nominal': empleado.periodo_nominal
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si hay errores de días de descanso, retornarlos
        if errores_descanso:
            descansos_configurados = [dias_descanso_nombres[d] for d in sorted(empleado.dias_descanso)]
            return Response(
                {
                    'error': f'No se pueden registrar faltas en días de descanso del empleado {empleado_id}',
                    'detalle': errores_descanso,
                    'dias_descanso_configurados': descansos_configurados,
                    'empleado': {
                        'id': empleado_id,
                        'nombre_completo': f"{empleado.nombre} {empleado.apellido_paterno} {empleado.apellido_materno or ''}".strip(),
                        'periodo_nominal': empleado.periodo_nominal
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Actualizar las faltas en el empleado primero
            if not hasattr(empleado, 'fechas_faltas'):
                empleado.fechas_faltas = []
            
            # Agregar solo faltas nuevas que no estén ya registradas
            nuevas_faltas = [f for f in fechas_faltas if f not in empleado.fechas_faltas]
            empleado.fechas_faltas.extend(nuevas_faltas)
            empleado.faltas_en_periodo = len(empleado.fechas_faltas)
            empleado.save()

            # Función para determinar el periodo según la fecha y tipo de nómina
            def determinar_periodo(fecha, tipo_nomina):
                año = fecha.year
                mes = fecha.month
                dia = fecha.day
                
                if tipo_nomina == 'SEMANAL':
                    inicio_semana = fecha - timedelta(days=fecha.weekday())
                    fin_semana = inicio_semana + timedelta(days=6)
                    semana_num = (inicio_semana.day - 1) // 7 + 1
                    periodo_id = f"{año}-SEM-{mes:02d}-{semana_num:02d}"
                    return {
                        'id': periodo_id,
                        'inicio': inicio_semana,
                        'fin': fin_semana,
                        'tipo': 'SEMANAL'
                    }
                elif tipo_nomina == 'QUINCENAL':
                    if dia <= 15:
                        inicio = date(año, mes, 1)
                        fin = date(año, mes, 15)
                        quincena = 1
                    else:
                        inicio = date(año, mes, 16)
                        fin = date(año, mes + 1, 1) - timedelta(days=1) if mes < 12 else date(año + 1, 1, 1) - timedelta(days=1)
                        quincena = 2
                    periodo_id = f"{año}-Q{quincena}-{mes:02d}"
                    return {
                        'id': periodo_id,
                        'inicio': inicio,
                        'fin': fin,
                        'tipo': 'QUINCENAL'
                    }
                else:  # MENSUAL
                    inicio = date(año, mes, 1)
                    fin = date(año, mes + 1, 1) - timedelta(days=1) if mes < 12 else date(año + 1, 1, 1) - timedelta(days=1)
                    periodo_id = f"{año}-M-{mes:02d}"
                    return {
                        'id': periodo_id,
                        'inicio': inicio,
                        'fin': fin,
                        'tipo': 'MENSUAL'
                    }

            # Procesar cada fecha de falta
            periodos_afectados = set()
            faltas_registradas = []

            for fecha_str in fechas_faltas:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                periodo = determinar_periodo(fecha, empleado.periodo_nominal)
                periodos_afectados.add(periodo['id'])

                # Buscar o crear nómina para el periodo
                nomina, created = Nomina.objects.get_or_create(
                    empleado=empleado,
                    fecha_inicio=periodo['inicio'],
                    fecha_fin=periodo['fin'],
                    defaults={
                        'empresa': empleado.empresa,
                        'tipo_nomina': empleado.periodo_nominal,
                        'estado': 'BORRADOR',
                        'creado_por': request.user,
                        'calculos': {
                            'empleado': {
                                'fechas_faltas': [],
                                'faltas_en_periodo': 0,
                                'dias_laborados': 0,
                                'salario_diario': float(empleado.salario_diario) if empleado.salario_diario else 0.0
                            }
                        }
                    }
                )

                # Actualizar faltas si no están ya registradas
                calculos = nomina.calculos or {}
                if 'empleado' not in calculos:
                    calculos['empleado'] = {
                        'fechas_faltas': [],
                        'faltas_en_periodo': 0,
                        'dias_laborados': 0,
                        'salario_diario': float(empleado.salario_diario) if empleado.salario_diario else 0.0
                    }
                
                if fecha_str not in calculos['empleado'].get('fechas_faltas', []):
                    calculos['empleado'].setdefault('fechas_faltas', []).append(fecha_str)
                    calculos['empleado']['faltas_en_periodo'] = len(calculos['empleado']['fechas_faltas'])
                    
                    # Calcular días laborados (días totales del periodo menos faltas)
                    dias_periodo = (periodo['fin'] - periodo['inicio']).days + 1
                    calculos['empleado']['dias_laborados'] = dias_periodo - calculos['empleado']['faltas_en_periodo']
                    
                    # Aplicar descuento por faltas
                    if empleado.salario_diario:
                        calculos['empleado']['descuento_por_faltas'] = float(empleado.salario_diario) * calculos['empleado']['faltas_en_periodo']
                    else:
                        calculos['empleado']['descuento_por_faltas'] = 0.0
                    
                    nomina.calculos = calculos
                    nomina.save()
                    faltas_registradas.append(fecha_str)

            # Actualización CRÍTICA para forzar sincronización:
            empleado.refresh_from_db()
            
            # Actualizar TODAS las nóminas pendientes del periodo actual
            nominas_afectadas = Nomina.objects.filter(
                empleado=empleado,
                estado__in=['BORRADOR', 'PENDIENTE']
            )

            for nomina in nominas_afectadas:
                try:
                    # Filtrar faltas que corresponden a este periodo de nómina
                    faltas_periodo = [
                        f for f in empleado.fechas_faltas 
                        if nomina.fecha_inicio <= datetime.strptime(f, '%Y-%m-%d').date() <= nomina.fecha_fin
                    ]
                    
                    # Seleccionar la función de cálculo según el tipo de nómina
                    if empleado.periodo_nominal == 'SEMANAL':
                        nomina_data = calcular_nomina_semanal(
                            empleado,
                            fecha_referencia=nomina.fecha_inicio
                        )
                    elif empleado.periodo_nominal == 'QUINCENAL':
                        nomina_data = calcular_nomina_quincenal(
                            empleado,
                            fecha_referencia=nomina.fecha_inicio
                        )
                    else:  # MENSUAL
                        nomina_data = calcular_nomina_mensual(
                            empleado,
                            fecha_referencia=nomina.fecha_inicio
                        )
                    
                    # Actualizar campos críticos
                    nomina.faltas_en_periodo = len(faltas_periodo)
                    nomina.dias_laborados = nomina_data.get('dias_laborados', 0)
                    nomina.salario_neto = nomina_data.get('salario_neto', 0.0)
                    nomina.calculos = nomina_data
                    nomina.save()

                except Exception as e:
                    logger.error(f"Error actualizando nómina {nomina.id}: {str(e)}", exc_info=True)
                    continue

            # Convertir el descuento total a float para la respuesta
            descuento_total = float(empleado.salario_diario) * len(faltas_registradas) if empleado.salario_diario else 0.0

            # Construir respuesta
            return Response({
                'success': True,
                'empleado_id': empleado.id,
                'nombre': empleado.nombre,
                'apellido_paterno': empleado.apellido_paterno,
                'apellido_materno': empleado.apellido_materno or '',
                'empresa_id': empleado.empresa.id,
                'usuario_id': request.user.id,
                'faltas_registradas': len(faltas_registradas),
                'fechas': faltas_registradas,
                'periodos_afectados': list(periodos_afectados),
                'descuento_total': descuento_total,
                'message': 'Faltas registradas correctamente y nóminas actualizadas'
            })

        except Exception as e:
            logger.error(f"Error registrando faltas: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Error interno al registrar faltas: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
                    
    @action(detail=True, methods=['get'], url_path='calendario-periodo')
    def calendario_periodo(self, request, pk=None):
        """
        Obtiene el calendario para un periodo
        GET /api/empleados/{id}/faltas/calendario-periodo/?periodo=semanal&fecha=2025-01-10
        """
        empleado = self.get_empleado(pk)
        if not empleado:
            return Response(
                {'error': 'Empleado no encontrado'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            periodo = request.query_params.get('periodo', 'semanal').lower()
            fecha_referencia = request.query_params.get('fecha')

            try:
                fecha_ref = date.fromisoformat(fecha_referencia) if fecha_referencia else date.today()
            except ValueError:
                fecha_ref = date.today()

            inicio, fin = empleado.obtener_limites_periodo(fecha_ref)

            calendario = [
                {
                    'fecha': (inicio + timedelta(days=i)).isoformat(),
                    'dia_semana': (inicio + timedelta(days=i)).strftime('%A'),
                    'es_festivo': (inicio + timedelta(days=i)) in DIAS_FESTIVOS_2025,
                    'es_descanso': (inicio + timedelta(days=i)).weekday() in empleado.dias_descanso
                }
                for i in range((fin - inicio).days + 1)
            ]

            response_data = {
                'empleado_id': empleado.id,
                'periodo_nominal': empleado.periodo_nominal,
                'periodo_solicitado': periodo,
                'fecha_inicio': inicio.isoformat(),
                'fecha_fin': fin.isoformat(),
                'dias_periodo': (fin - inicio).days + 1,
                'dias_trabajados': empleado.dias_trabajados,
                'faltas_en_periodo': empleado.faltas_en_periodo,
                'calendario': calendario,
                'dias_descanso': [empleado.get_dias_descanso_display()],
                'festivos_en_periodo': sum(1 for dia in DIAS_FESTIVOS_2025 if inicio <= dia <= fin),
                'dias_laborables': (fin - inicio).days + 1 - len([d for d in calendario if d['es_descanso'] or d['es_festivo']])
            }

            return Response(response_data)

        except Exception as e:
            return Response(
                {'error': f'Error al generar calendario: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
