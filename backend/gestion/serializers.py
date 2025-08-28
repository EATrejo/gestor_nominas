from datetime import datetime
from decimal import Decimal, InvalidOperation
from django.forms import ValidationError
from rest_framework import serializers
from .models import User, Empresa, Empleado, Nomina
from django.contrib.auth import get_user_model
from django.db import transaction
import re
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'email', 'tipo_usuario', 'is_staff', 'empresa', 'empresa_nombre']
        extra_kwargs = {
            'password': {'write_only': True},
            'empresa': {'write_only': True}
        }

from django.contrib.auth import get_user_model
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

User = get_user_model()

from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from .models import Empresa

User = get_user_model()

from django.contrib.auth import get_user_model
from django.utils.translation import gettext_lazy as _
from rest_framework import serializers

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer para registro de usuarios con validación avanzada de contraseña.
    Compatible con modelos de usuario personalizados.
    """

    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        min_length=8,
        max_length=128,
        help_text=_("La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, números y caracteres especiales"),
        trim_whitespace=False
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=True,
        style={'input_type': 'password'},
        help_text=_("Repita la misma contraseña para verificación")
    )

    class Meta:
        model = User
        fields = ['email', 'password', 'confirm_password', 'es_principal']
        extra_kwargs = {
            'email': {
                'required': True,
                'allow_blank': False,
                'help_text': _("Correo electrónico válido que será usado para iniciar sesión"),
                'error_messages': {
                    'blank': _("El correo electrónico no puede estar vacío"),
                    'invalid': _("Ingrese un correo electrónico válido")
                }
            },
            'es_principal': {
                'required': False,
                'help_text': _("Indica si este usuario es el principal de la empresa")
            }
        }

    def validate_email(self, value):
        """Normaliza email y verifica unicidad"""
        value = value.lower().strip()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                _("Este correo electrónico ya está registrado. ¿Olvidó su contraseña?")
            )
        return value

    def validate_password(self, value):
        """Validación avanzada de contraseña"""
        if len(value) < 8:
            raise serializers.ValidationError(
                _("La contraseña debe tener al menos 8 caracteres")
            )
        # Aquí puedes agregar más validaciones de complejidad (mayúsculas, números, etc.)
        return value

    def validate(self, data):
        """Valida que las contraseñas coincidan"""
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': _("Las contraseñas no coinciden. Por favor intente nuevamente")
            })
        return data

    def create(self, validated_data):
        """Crea el usuario con el manager personalizado"""
        validated_data.pop('confirm_password')
        return User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            tipo_usuario='EMPRESA',
            es_principal=validated_data.get('es_principal', False)
        )

    def to_representation(self, instance):
        """Controla la respuesta después de la creación"""
        return {
            'id': instance.id,
            'email': instance.email,
            'tipo_usuario': instance.tipo_usuario,
            'es_principal': instance.es_principal,
            'message': _("Usuario registrado exitosamente")
        }


class EmpresaRegistrationSerializer(serializers.ModelSerializer):
    usuario_principal = UserRegistrationSerializer(required=True)
    usuario_secundario = UserRegistrationSerializer(required=False, allow_null=True, write_only=True)

    class Meta:
        model = Empresa
        fields = [
            'nombre', 'giro', 'cantidad_empleados', 'ciudad', 'estado',
            'usuario_principal', 'usuario_secundario'
        ]

    def validate(self, data):
        # Validar empresa duplicada
        if Empresa.objects.filter(nombre__iexact=data.get('nombre', '')).exists():
            raise serializers.ValidationError({'nombre': _("Ya existe una empresa con este nombre")})
        
        # Validar correo del usuario principal
        principal_data = data.get('usuario_principal', {})
        principal_email = principal_data.get('email')
        if not principal_email:
            raise serializers.ValidationError({'usuario_principal': {'email': _("El email del usuario principal es obligatorio")}})
        if User.objects.filter(email=principal_email).exists():
            raise serializers.ValidationError({'usuario_principal': {'email': _("Este correo ya está registrado")}})
        
        # Validar correo del usuario secundario (solo si viene)
        usuario_secundario_data = data.get('usuario_secundario') or {}
        secundario_email = usuario_secundario_data.get('email')
        if secundario_email:
            if User.objects.filter(email=secundario_email).exists():
                raise serializers.ValidationError({'usuario_secundario': {'email': _("Este correo ya está registrado")}})
            if secundario_email == principal_email:
                raise serializers.ValidationError({'usuario_secundario': {'email': _("No puede ser igual al usuario principal")}})
        
        return data

    def create(self, validated_data):
        from django.db import transaction

        usuario_principal_data = validated_data.pop('usuario_principal')
        usuario_secundario_data = validated_data.pop('usuario_secundario', None)

        with transaction.atomic():
            # Crear empresa
            empresa = Empresa.objects.create(**validated_data)

            # Crear usuario principal
            user_principal = User.objects.create_user(
                email=usuario_principal_data['email'],
                password=usuario_principal_data['password'],
                es_principal=True,
                tipo_usuario='EMPRESA'
            )
            empresa.usuarios.add(user_principal)

            # Crear usuario secundario si se envió
            if usuario_secundario_data and usuario_secundario_data.get('email'):
                user_secundario = User.objects.create_user(
                    email=usuario_secundario_data['email'],
                    password=usuario_secundario_data['password'],
                    es_principal=False,
                    tipo_usuario='EMPRESA'
                )
                empresa.usuarios.add(user_secundario)

        return empresa

    def to_representation(self, instance):
        return {
            'id': instance.id,
            'nombre': instance.nombre,
            'giro': instance.giro,
            'cantidad_empleados': instance.cantidad_empleados,
            'ciudad': instance.ciudad,
            'estado': instance.estado,
            'usuario_principal': {
                'email': instance.obtener_usuario_principal().email
            },
            'message': _("Empresa registrada exitosamente")
        }



class EmpresaSerializer(serializers.ModelSerializer):
    usuario_email = serializers.SerializerMethodField()
    
    class Meta:
        model = Empresa
        fields = ['id', 'nombre', 'activa', 'fecha_registro', 'usuario_email']
        read_only_fields = ['activa', 'fecha_registro']

    def get_usuario_email(self, obj):
        if obj.usuarios.exists():
            return obj.usuarios.first().email
        return None

import re
from datetime import datetime
from rest_framework import serializers
from .models import Empleado

class EmpleadoSerializer(serializers.ModelSerializer):
    fecha_ingreso = serializers.DateField(input_formats=['%d/%m/%Y', '%Y-%m-%d'])
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    periodo_nominal = serializers.ChoiceField(choices=Empleado.PERIODO_NOMINAL_CHOICES)
    
    # Nuevos campos para faltas (fechas)
    fechas_faltas_injustificadas = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        help_text="Lista de fechas de faltas injustificadas (YYYY-MM-DD)"
    )
    
    fechas_faltas_justificadas = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        allow_empty=True,
        help_text="Lista de fechas de faltas justificadas (YYYY-MM-DD)"
    )
    
    # ✅ NUEVOS CAMPOS: Contadores de faltas que el frontend necesita
    faltas_injustificadas = serializers.SerializerMethodField(read_only=True)
    faltas_justificadas = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Empleado
        fields = '__all__'
        extra_kwargs = {
            'empresa': {'required': True},
            'salario_diario': {'required': False, 'allow_null': True},
            'sueldo_mensual': {'required': False, 'allow_null': True},
            'dias_descanso': {'required': False, 'allow_null': True},
            'fechas_faltas_injustificadas': {'required': False},
            'fechas_faltas_justificadas': {'required': False}
        }

    # ✅ MÉTODOS PARA LOS NUEVOS CAMPOS
    def get_faltas_injustificadas(self, obj):
        """Retorna el conteo de faltas injustificadas"""
        if hasattr(obj, 'fechas_faltas_injustificadas') and obj.fechas_faltas_injustificadas:
            return len(obj.fechas_faltas_injustificadas)
        return 0

    def get_faltas_justificadas(self, obj):
        """Retorna el conteo de faltas justificadas"""
        if hasattr(obj, 'fechas_faltas_justificadas') and obj.fechas_faltas_justificadas:
            return len(obj.fechas_faltas_justificadas)
        return 0

    def validate_nss(self, value):
        if not value.isdigit() or len(value) != 11:
            raise serializers.ValidationError("El NSS debe tener 11 dígitos numéricos")
        return value

    def validate_rfc(self, value):
        if not re.match('^[A-Z&Ñ]{4}\d{6}[A-V1-9][0-9A-Z]$', value):
            raise serializers.ValidationError("El RFC no tiene un formato válido para persona física")
        return value

    def validate_dias_descanso(self, value):
        """Validar que dias_descanso sea una lista de números válidos"""
        if value is None:
            return []
        
        if not isinstance(value, list):
            raise serializers.ValidationError("dias_descanso debe ser una lista")
        
        for dia in value:
            if not isinstance(dia, int) or dia < 0 or dia > 6:
                raise serializers.ValidationError(f"Día inválido: {dia}. Debe ser 0-6 (0=Lunes, 6=Domingo)")
        
        return value

    def validate(self, data):
        """
        Validación mejorada que maneja correctamente las actualizaciones
        y no es tan estricta con los campos de salario
        """
        # Si es una actualización, obtener la instancia existente
        instance = getattr(self, 'instance', None)
        
        # ✅ NUEVA VALIDACIÓN: Verificar formato de fechas de faltas
        for campo_falta in ['fechas_faltas_injustificadas', 'fechas_faltas_justificadas']:
            if campo_falta in data and data[campo_falta] is not None:
                if not isinstance(data[campo_falta], list):
                    raise serializers.ValidationError({
                        campo_falta: 'Debe ser una lista de fechas en formato YYYY-MM-DD'
                    })
                
                # Validar formato de cada fecha
                for fecha_str in data[campo_falta]:
                    try:
                        datetime.strptime(fecha_str, '%Y-%m-%d').date()
                    except ValueError:
                        raise serializers.ValidationError({
                            campo_falta: f'Formato de fecha inválido: {fecha_str}. Use YYYY-MM-DD'
                        })
        
        # Resto de la validación existente...
        # Determinar el periodo nominal (nuevo valor o existente)
        periodo_nominal = data.get('periodo_nominal')
        if periodo_nominal is None and instance:
            periodo_nominal = instance.periodo_nominal
        
        # Solo validar lógica de salario si tenemos un periodo nominal
        if periodo_nominal:
            if periodo_nominal == 'MENSUAL':
                # Para mensual, asegurar que sueldo_mensual esté presente y salario_diario sea null
                if 'salario_diario' in data and data['salario_diario'] is not None:
                    # Permitir si es el mismo valor que ya tenía (para updates)
                    if not instance or data['salario_diario'] != instance.salario_diario:
                        raise serializers.ValidationError({
                            'salario_diario': 'Este campo debe ser nulo para periodo MENSUAL'
                        })
                
                # Si se está creando, requerir sueldo_mensual
                if not instance and 'sueldo_mensual' not in data:
                    raise serializers.ValidationError({
                        'sueldo_mensual': 'Este campo es requerido para periodo MENSUAL'
                    })
            
            else:  # SEMANAL o QUINCENAL
                # Para otros periodos, asegurar que salario_diario esté presente y sueldo_mensual sea null
                if 'sueldo_mensual' in data and data['sueldo_mensual'] is not None:
                    # Permitir si es el mismo valor que ya tenía (para updates)
                    if not instance or data['sueldo_mensual'] != instance.sueldo_mensual:
                        raise serializers.ValidationError({
                            'sueldo_mensual': 'Este campo debe ser nulo para periodo SEMANAL/QUINCENAL'
                        })
                
                # Si se está creando, requerir salario_diario
                if not instance and not data.get('salario_diario'):
                    raise serializers.ValidationError({
                        'salario_diario': 'Requerido para periodo SEMANAL/QUINCENAL'
                    })
        
        return data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # ✅ CORREGIR: Asegurar que faltas_en_periodo refleje SOLO injustificadas
        representation['faltas_en_periodo'] = len(instance.fechas_faltas_injustificadas)
        
        # ✅ Asegurar que los NUEVOS campos de contadores de faltas estén presentes
        representation['faltas_injustificadas'] = self.get_faltas_injustificadas(instance)
        representation['faltas_justificadas'] = self.get_faltas_justificadas(instance)
        
        # ✅ Asegurar que los campos de fechas de faltas estén presentes
        if 'fechas_faltas_injustificadas' not in representation:
            representation['fechas_faltas_injustificadas'] = instance.fechas_faltas_injustificadas if instance.fechas_faltas_injustificadas else []
        
        if 'fechas_faltas_justificadas' not in representation:
            representation['fechas_faltas_justificadas'] = instance.fechas_faltas_justificadas if instance.fechas_faltas_justificadas else []
        
        # ✅ ELIMINAR campo antiguo de compatibilidad para evitar confusiones
        if 'fechas_faltas' in representation:
            representation.pop('fechas_faltas', None)
        
        # Resto del código existente para conversión de decimales...
        representation['salario_diario'] = float(instance.salario_diario) if instance.salario_diario else None
        representation['sueldo_mensual'] = float(instance.sueldo_mensual) if instance.sueldo_mensual else None
        
        # Asegurar que empresa_nombre esté presente
        if 'empresa_nombre' not in representation:
            representation['empresa_nombre'] = instance.empresa.nombre if instance.empresa else None
        
        # Asegurar que dias_descanso esté presente y sea un array
        if 'dias_descanso' not in representation or representation['dias_descanso'] is None:
            representation['dias_descanso'] = instance.dias_descanso if instance.dias_descanso else []
        elif not isinstance(representation['dias_descanso'], list):
            representation['dias_descanso'] = list(representation['dias_descanso']) if representation['dias_descanso'] else []
        
        # Asegurar que todos los campos numéricos sean números
        numeric_fields = ['salario_diario', 'sueldo_mensual']
        for field in numeric_fields:
            if field in representation and representation[field] is not None:
                try:
                    representation[field] = float(representation[field])
                except (TypeError, ValueError):
                    representation[field] = None
        
        return representation

    def create(self, validated_data):
        # ✅ Asegurar valores por defecto para los nuevos campos de faltas
        if 'fechas_faltas_injustificadas' not in validated_data:
            validated_data['fechas_faltas_injustificadas'] = []
        if 'fechas_faltas_justificadas' not in validated_data:
            validated_data['fechas_faltas_justificadas'] = []
        
        # Limpiar campos según el periodo nominal
        periodo_nominal = validated_data.get('periodo_nominal')
        
        if periodo_nominal == 'MENSUAL':
            validated_data['salario_diario'] = None
            # Asegurar que sueldo_mensual tenga valor
            if not validated_data.get('sueldo_mensual'):
                raise serializers.ValidationError({
                    'sueldo_mensual': 'Requerido para periodo MENSUAL'
                })
        else:
            validated_data['sueldo_mensual'] = None
            # Asegurar que salario_diario tenga valor
            if not validated_data.get('salario_diario'):
                raise serializers.ValidationError({
                    'salario_diario': 'Requerido para periodo SEMANAL/QUINCENAL'
                })
        
        # Asegurar que dias_descanso sea una lista
        if 'dias_descanso' in validated_data and validated_data['dias_descanso'] is None:
            validated_data['dias_descanso'] = []
            
        return super().create(validated_data)

    def update(self, instance, validated_data):
        # ✅ Manejar campos de faltas durante la actualización
        for campo_falta in ['fechas_faltas_injustificadas', 'fechas_faltas_justificadas']:
            if campo_falta in validated_data and validated_data[campo_falta] is None:
                validated_data[campo_falta] = []
        
        periodo_nominal = validated_data.get('periodo_nominal', instance.periodo_nominal)
        
        # Limpiar campos según el periodo nominal
        if periodo_nominal == 'MENSUAL':
            validated_data['salario_diario'] = None
            # Si se cambia a mensual, requerir sueldo_mensual
            if 'sueldo_mensual' not in validated_data and not instance.sueldo_mensual:
                raise serializers.ValidationError({
                    'sueldo_mensual': 'Requerido al cambiar a periodo MENSUAL'
                })
        else:
            validated_data['sueldo_mensual'] = None
            # Si se cambia a semanal/quincenal, requerir salario_diario
            if 'salario_diario' not in validated_data and not instance.salario_diario:
                raise serializers.ValidationError({
                    'salario_diario': 'Requerido al cambiar a periodo SEMANAL/QUINCENAL'
                })
        
        # Asegurar que dias_descanso sea una lista
        if 'dias_descanso' in validated_data and validated_data['dias_descanso'] is None:
            validated_data['dias_descanso'] = []
            
        return super().update(instance, validated_data)



    
from datetime import datetime
from rest_framework import serializers
from .models import Nomina

class NominaSerializer(serializers.ModelSerializer):
    id_nomina = serializers.IntegerField(source='id', read_only=True)
    id_empleado = serializers.IntegerField(source='empleado.id', read_only=True)
    empleado_nombre = serializers.CharField(source='empleado.nombre_completo', read_only=True)
    empleado_fecha_ingreso = serializers.DateField(source='empleado.fecha_ingreso', format='%Y-%m-%d', read_only=True)
    empresa_nombre = serializers.CharField(source='empresa.nombre', read_only=True)
    dias_laborados = serializers.SerializerMethodField()
    
    class Meta:
        model = Nomina
        fields = [
            'id_nomina',
            'id_empleado',
            'empleado_nombre',
            'empleado_fecha_ingreso',
            'periodo_nominal',
            'tipo_nomina',
            'fecha_inicio',
            'fecha_fin',
            'dias_laborados',
            'faltas_en_periodo',
            'salario_neto',
            'calculos',
            'estado',
            'fecha_creacion',
            'fecha_actualizacion',
            'empresa',
            'empresa_nombre',
            'creado_por'
        ]
        read_only_fields = ['faltas_en_periodo']

    def get_dias_laborados(self, obj):
        """
        Obtiene los días laborados directamente de los cálculos almacenados.
        Si no existen, calcula un valor por defecto basado en el tipo de nómina.
        """
        if isinstance(obj.calculos, dict) and 'empleado' in obj.calculos:
            return obj.calculos['empleado'].get('dias_laborados', 0)
        
        # Valor por defecto para compatibilidad con versiones anteriores
        return {
            'SEMANAL': 7,
            'QUINCENAL': 15,
            'MENSUAL': 30
        }.get(obj.tipo_nomina, 0)

    def to_representation(self, instance):
        """
        Transforma la instancia de nómina a su representación JSON,
        asegurando que las faltas injustificadas SOLAMENTE estén en deducciones.
        """
        representation = super().to_representation(instance)
        
        # 1. Convertir campos decimales a float para la API
        representation['salario_neto'] = float(instance.salario_neto) if instance.salario_neto else 0.0
        
        # 2. Asegurar que calculos sea un diccionario válido
        if not isinstance(representation.get('calculos'), dict):
            representation['calculos'] = {}
        
        calculos = representation['calculos']
        
        # 3. LIMPIEZA CRÍTICA: Eliminar faltas_injustificadas de ajustes si existen
        try:
            if ('resumen' in calculos and 
                isinstance(calculos['resumen'], dict) and
                'ajustes' in calculos['resumen'] and 
                isinstance(calculos['resumen']['ajustes'], dict) and
                'faltas_injustificadas' in calculos['resumen']['ajustes']):
                
                # Eliminar completamente las faltas de ajustes
                del calculos['resumen']['ajustes']['faltas_injustificadas']
                
                # Recalcular total_ajustes si existe
                if 'total_ajustes' in calculos['resumen']['ajustes']:
                    total_actual = calculos['resumen']['ajustes']['total_ajustes']
                    # Buscar y sumar solo los ajustes válidos (excluyendo faltas)
                    nuevos_ajustes = 0
                    for key, value in calculos['resumen']['ajustes'].items():
                        if (isinstance(value, dict) and 
                            'monto' in value and 
                            key != 'total_ajustes' and 
                            key != 'faltas_injustificadas'):
                            nuevos_ajustes += value['monto']
                    calculos['resumen']['ajustes']['total_ajustes'] = nuevos_ajustes
        except (KeyError, TypeError, AttributeError):
            # Si hay algún error en la estructura, continuar sin modificar
            pass
        
        # 4. Asegurar que las faltas estén en deducciones
        try:
            if ('resumen' in calculos and 
                isinstance(calculos['resumen'], dict) and
                'deducciones' in calculos['resumen'] and 
                isinstance(calculos['resumen']['deducciones'], dict)):
                
                deducciones = calculos['resumen']['deducciones']
                
                # Si no existe FALTAS_INJUSTIFICADAS en deducciones, calcularla
                if 'FALTAS_INJUSTIFICADAS' not in deducciones:
                    # Calcular monto basado en faltas del empleado
                    if (hasattr(instance, 'empleado') and 
                        hasattr(instance.empleado, 'salario_diario') and
                        instance.empleado.salario_diario and
                        'faltas_en_periodo' in representation):
                        
                        salario_diario = float(instance.empleado.salario_diario)
                        faltas_count = representation['faltas_en_periodo']
                        deducciones['FALTAS_INJUSTIFICADAS'] = salario_diario * faltas_count
                        
                        # Recalcular total_deducciones
                        if 'total_deducciones' in deducciones:
                            total_actual = deducciones['total_deducciones']
                            deducciones['total_deducciones'] = total_actual + (salario_diario * faltas_count)
        except (KeyError, TypeError, AttributeError):
            # Si hay algún error, continuar sin modificar
            pass
        
        # 5. Mantener compatibilidad con campos existentes
        representation['calculos'] = calculos
        
        return representation

    def validate(self, data):
        """
        Validación general que aplica a todos los tipos de nómina.
        """
        if (data.get('fecha_inicio') and 
            data.get('fecha_fin') and 
            data.get('fecha_inicio') > data.get('fecha_fin')):
            raise serializers.ValidationError("La fecha de inicio no puede ser posterior a la fecha fin")
        return data