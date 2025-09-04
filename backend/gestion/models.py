import re
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.core.validators import RegexValidator, MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from datetime import datetime, date, timedelta
import calendar
from decimal import Decimal
from django.utils.translation import gettext_lazy as _

from django.db import models
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    def _create_user(self, email, password, **extra_fields):
        """
        Creates and saves a User with the given email and password.
        """
        if not email:
            raise ValueError('The Email must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        """
        Creates and saves a regular User with the given email and password.
        """
        extra_fields.setdefault('is_staff', False)
        extra_fields.setdefault('is_superuser', False)
        extra_fields.setdefault('tipo_usuario', 'EMPRESA')
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        """
        Creates and saves a superuser with the given email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('tipo_usuario', 'ADMIN')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')
            
        return self._create_user(email, password, **extra_fields)

class User(AbstractUser):
    # Campos EXISTENTES (se mantienen todos)
    TIPOS_USUARIO = [
        ('ADMIN', 'Administrador'),
        ('EMPRESA', 'Empresa'),
        ('CONTADOR', 'Contador'),
    ]
    
    username = None  # Deshabilitamos el campo username
    email = models.EmailField(_('email address'), unique=True)
    tipo_usuario = models.CharField(
        max_length=10, 
        choices=TIPOS_USUARIO, 
        default='EMPRESA',
        verbose_name=_('tipo de usuario')
    )
    
    # Nuevo campo necesario para identificar usuarios principales
    es_principal = models.BooleanField(
        default=False,
        verbose_name=_("Usuario principal"),
        help_text=_("Indica si este usuario es el principal de la empresa")
    )
    
    # Configuración básica
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = []
    
    objects = UserManager()  # ¡Cambiado a nuestro UserManager personalizado!
    
    def clean(self):
        """Validaciones personalizadas para el modelo User"""
        super().clean()
        
        # Validaciones para superusuarios y staff
        if self.is_superuser or self.is_staff:
            self.tipo_usuario = 'ADMIN'
            return
            
        # Validaciones para usuarios normales
        if self.pk is not None:  # Solo para usuarios existentes
            if self.tipo_usuario == 'EMPRESA' and not self.empresas.exists():
                raise ValidationError(
                    _('Los usuarios de tipo EMPRESA deben tener una empresa asociada')
                )
            if self.tipo_usuario == 'ADMIN' and self.empresas.exists():
                raise ValidationError(
                    _('Los administradores no deben tener empresa asociada')
                )

    def save(self, *args, **kwargs):
        """Guardado personalizado con limpieza automática"""
        if not kwargs.pop('skip_clean', False):
            self.full_clean()
            
        if self.is_superuser:
            self.tipo_usuario = 'ADMIN'
            
        super().save(*args, **kwargs)

    @property
    def empresas_relacionadas(self):
        """Propiedad para compatibilidad con código existente"""
        if hasattr(self, 'empresas'):
            return self.empresas.all()
        from gestion.models import Empresa  # Importación local para evitar circular imports
        return Empresa.objects.none()

    def __str__(self):
        return self.email

    class Meta:
        verbose_name = _('usuario')
        verbose_name_plural = _('usuarios')
        ordering = ['-date_joined']

class Empresa(models.Model):
    nombre = models.CharField(max_length=100, verbose_name=_("Nombre de la empresa/compañía"))
    giro = models.CharField(max_length=100, default='Sin giro especificado', verbose_name="Giro de la compañía/empresa")
    cantidad_empleados = models.IntegerField(default=1, verbose_name="Cantidad de empleados (aproximadamente)")
    ciudad = models.CharField(max_length=100, default='Ciudad no especificada', verbose_name="Ciudad")
    estado = models.CharField(max_length=100, default='Estado no especificado', verbose_name="Estado")
    activa = models.BooleanField(default=True, verbose_name=_("Activa"))
    
    # Relación correcta con usuarios
    usuarios = models.ManyToManyField(
        'User',
        related_name='empresas',
        verbose_name=_("Usuarios asociados"),
        help_text=_("Usuarios que pueden gestionar esta empresa")
    )

    fecha_registro = models.DateTimeField(auto_now_add=True, verbose_name=_("Fecha de registro"))
    fecha_actualizacion = models.DateTimeField(auto_now=True, verbose_name=_("Última actualización"))

    class Meta:
        verbose_name = _("Empresa")
        verbose_name_plural = _("Empresas")
        ordering = ['-fecha_registro']

    def __str__(self):
        return self.nombre

    def clean(self):
        super().clean()
        if self.cantidad_empleados < 1:
            raise ValidationError({
                'cantidad_empleados': _("La empresa debe tener al menos 1 empleado")
            })

    def obtener_usuario_principal(self):
        """Devuelve el usuario principal de la empresa si existe"""
        return self.usuarios.filter(es_principal=True).first()


from django.db import models
from django.core.validators import MinValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _
from decimal import Decimal
from datetime import datetime, date, timedelta
from django.db.models import Q


class Empleado(models.Model):
    PERIODO_NOMINAL_CHOICES = [
        ('SEMANAL', 'Semanal'),
        ('QUINCENAL', 'Quincenal'),
        ('MENSUAL', 'Mensual'),
    ]

    DIAS_DESCANSO_CHOICES = [
        (0, 'Lunes'),
        (1, 'Martes'),
        (2, 'Miércoles'),
        (3, 'Jueves'),
        (4, 'Viernes'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]

    ZONA_CHOICES = [
        ('general', 'Zona General'),
        ('frontera', 'Zona Frontera Norte'),
    ]

    nombre = models.CharField(max_length=50, verbose_name=_('Nombre'))
    apellido_paterno = models.CharField(max_length=50, verbose_name=_('Apellido Paterno'))
    apellido_materno = models.CharField(max_length=50, blank=True, null=True, verbose_name=_('Apellido Materno'))
    
    nss = models.CharField(
        max_length=11, 
        unique=True,
        validators=[RegexValidator(regex=r'^\d{11}$', message=_('El NSS debe tener 11 dígitos'))],
        verbose_name=_('Número de Seguro Social')
    )
    rfc = models.CharField(
    max_length=13,
    validators=[
        RegexValidator(
            regex=r'^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$',
            message=_('RFC inválido para persona física. Formato requerido: 4 letras + 6 dígitos + 3 caracteres alfanuméricos')
        )
    ],
    verbose_name=_('RFC')
)

    sueldo_mensual = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
        verbose_name=_('Sueldo Mensual'),
        help_text=_('Obligatorio solo para periodo MENSUAL')
    )
    salario_diario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        null=True,
        blank=True,
        verbose_name=_('Salario Diario'),
        help_text=_('Obligatorio para periodos SEMANAL/QUINCENAL')
    )

    fecha_ingreso = models.DateField(verbose_name=_('Fecha de Ingreso'))
    empresa = models.ForeignKey(
        'Empresa', 
        on_delete=models.CASCADE, 
        related_name='empleados',
        verbose_name=_('Empresa')
    )
    periodo_nominal = models.CharField(
        max_length=10,
        choices=PERIODO_NOMINAL_CHOICES,
        default='QUINCENAL',
        verbose_name=_('Periodo de Pago')
    )
    dias_descanso = models.JSONField(
        default=list,
        verbose_name=_('Días de Descanso'),
        help_text=_("Días de descanso (0=Lunes, 6=Domingo)")
    )
    dias_laborados = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name=_('Días Laborados'),
        help_text=_("Calculado automáticamente")
    )
    faltas_en_periodo = models.PositiveSmallIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name=_('Faltas en Periodo')
    )
    
    # Campos para faltas (MODIFICACIÓN PRINCIPAL)
    fechas_faltas_injustificadas = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_('Fechas de Faltas Injustificadas'),
        help_text=_("Formato YYYY-MM-DD")
    )
    
    fechas_faltas_justificadas = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_('Fechas de Faltas Justificadas'),
        help_text=_("Formato YYYY-MM-DD")
    )
    
    # Mantener campo original para compatibilidad
    fechas_faltas = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_('Fechas de Faltas (Compatibilidad)'),
        help_text=_("Formato YYYY-MM-DD - En proceso de migración")
    )
    
    zona_salarial = models.CharField(
        max_length=10,
        choices=ZONA_CHOICES,
        default='general',
        verbose_name=_('Zona Salarial')
    )
    
    activo = models.BooleanField(default=True, verbose_name=_('Activo'))
    fecha_baja = models.DateField(blank=True, null=True, verbose_name=_('Fecha de Baja'))
    motivo_baja = models.TextField(blank=True, null=True, verbose_name=_('Motivo de Baja'))

    class Meta:
        verbose_name = _("Empleado")
        verbose_name_plural = _("Empleados")
        ordering = ['apellido_paterno', 'apellido_materno', 'nombre']
        constraints = [
            models.UniqueConstraint(
                fields=['nombre', 'apellido_paterno', 'apellido_materno', 'empresa'],
                name='unique_empleado_empresa'
            ),
            models.UniqueConstraint(
                fields=['rfc', 'empresa'],
                name='unique_rfc_empresa',
                condition=Q(activo=True),
                violation_error_message=_('No se pueden registrar dos empleados activos con el mismo RFC en la misma empresa')
            )
        ]

    def __str__(self):
        return f"{self.nombre_completo} - {self.empresa.nombre}"

    @property
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido_paterno} {self.apellido_materno or ''}".strip()

    @property
    def salario_diario_calculado(self):
        if self.periodo_nominal == 'MENSUAL' and self.sueldo_mensual:
            return (self.sueldo_mensual / Decimal('30')).quantize(Decimal('0.01'))
        return self.salario_diario or Decimal('0.00')

    def get_dias_descanso_display(self):
        dias = []
        for dia in self.dias_descanso:
            try:
                dias.append(dict(self.DIAS_DESCANSO_CHOICES)[dia])
            except KeyError:
                continue
        return ", ".join(dias) if dias else _("No especificado")

    def registrar_faltas(self, fechas_faltas, usuario_registra=None):
        """
        Registra faltas y actualiza nómina relacionada
        """
        from .models import Nomina
        
        # Validar fechas
        fechas_validadas = []
        for fecha_str in fechas_faltas:
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                # Verificar que no sea día de descanso
                if fecha.weekday() in self.dias_descanso:
                    continue
                fechas_validadas.append(fecha.isoformat())
            except ValueError:
                continue
        
        # Actualizar faltas del empleado
        if not hasattr(self, 'fechas_faltas'):
            self.fechas_faltas = []
        
        # Agregar solo faltas nuevas
        nuevas_faltas = [f for f in fechas_validadas if f not in self.fechas_faltas]
        self.fechas_faltas.extend(nuevas_faltas)
        self.save()
        
        # Buscar y actualizar todas las nóminas afectadas
        nominas_afectadas = Nomina.objects.filter(
            empleado=self,
            estado__in=['BORRADOR', 'PENDIENTE']
        )
        
        for nomina in nominas_afectadas:
            # Filtrar faltas que corresponden a este periodo
            faltas_periodo = [
                f for f in self.fechas_faltas 
                if nomina.fecha_inicio <= datetime.strptime(f, '%Y-%m-%d').date() <= nomina.fecha_fin
            ]
            
            # Actualizar cálculos de la nómina
            if not nomina.calculos:
                nomina.calculos = {}
            
            if 'empleado' not in nomina.calculos:
                nomina.calculos['empleado'] = {}
            
            nomina.calculos['empleado']['fechas_faltas'] = faltas_periodo
            nomina.calculos['empleado']['faltas_en_periodo'] = len(faltas_periodo)
            nomina.faltas_en_periodo = len(faltas_periodo)
            
            # Recalcular días laborados
            dias_periodo = (nomina.fecha_fin - nomina.fecha_inicio).days + 1
            dias_laborados = dias_periodo - len(faltas_periodo)
            nomina.calculos['empleado']['dias_laborados'] = dias_laborados
            nomina.dias_laborados = dias_laborados
            
            nomina.save()
        
        return {
            'status': 'success',
            'faltas_registradas': len(nuevas_faltas),
            'faltas_totales': len(self.fechas_faltas),
            'nominas_afectadas': [n.id for n in nominas_afectadas]
        }

    def clean(self):
        errors = {}

        # Validación para RFC único
        if self.rfc and self.empresa and self.activo:
            existe_rfc = Empleado.objects.filter(
                rfc=self.rfc, 
                empresa=self.empresa,
                activo=True
            ).exclude(pk=self.pk).exists()
            
            if existe_rfc:
                errors['rfc'] = _('Ya existe un empleado activo con este RFC en la empresa')

        # Validación de días de descanso
        if self.dias_descanso:
            for dia in self.dias_descanso:
                if dia not in [choice[0] for choice in self.DIAS_DESCANSO_CHOICES]:
                    errors.setdefault('dias_descanso', []).append(
                        _("Día inválido: {}. Rango permitido: 0-6").format(dia)
                    )

        # Validación de periodo nominal vs salario
        if self.periodo_nominal == 'MENSUAL':
            if self.salario_diario is not None:
                errors['salario_diario'] = _("Debe estar vacío para periodo MENSUAL")
            if not self.sueldo_mensual:
                errors['sueldo_mensual'] = _("Requerido para periodo MENSUAL")
        else:
            if self.sueldo_mensual is not None:
                errors['sueldo_mensual'] = _("Debe estar vacío para este periodo")
            if not self.salario_diario:
                errors['salario_diario'] = _("Requerido para este periodo")

        # Validación de faltas en periodo
        periodo_dias = 7 if self.periodo_nominal == 'SEMANAL' else 15 if self.periodo_nominal == 'QUINCENAL' else 30
        if self.faltas_en_periodo > periodo_dias:
            errors['faltas_en_periodo'] = _("Excede el máximo de {} faltas").format(periodo_dias)

        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        # Sincronizar faltas_en_periodo con fechas_faltas al guardar
        if hasattr(self, 'fechas_faltas'):
            self.faltas_en_periodo = len(self.fechas_faltas_injustificadas)
        
        # Calcular días laborados según periodo nominal
        periodo_dias = {
            'SEMANAL': 7,
            'QUINCENAL': 15,
            'MENSUAL': 30
        }.get(self.periodo_nominal, 0)
        
        self.dias_laborados = max(0, periodo_dias - self.faltas_en_periodo)
        
        # Asegurar coherencia entre periodo nominal y campos de salario
        if self.periodo_nominal == 'MENSUAL':
            self.salario_diario = None
            if not self.sueldo_mensual:
                raise ValueError("Para periodo MENSUAL se requiere especificar sueldo_mensual")
        else:
            self.sueldo_mensual = None
            if not self.salario_diario:
                raise ValueError("Para periodos no mensuales se requiere especificar salario_diario")

        # Validar y ajustar faltas en el periodo
        if self.faltas_en_periodo < 0:
            raise ValueError("Las faltas en periodo no pueden ser negativas")
        self.faltas_en_periodo = min(self.faltas_en_periodo, periodo_dias)

        # Validación completa y guardado
        self.full_clean()
        super().save(*args, **kwargs)

from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, datetime, timedelta

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime
from django.conf import settings

class Nomina(models.Model):
    TIPO_NOMINA_CHOICES = [
        ('SEMANAL', 'Semanal (7 días)'),
        ('QUINCENAL', 'Quincenal (variable días)'),
        ('MENSUAL', 'Mensual (variable días)'),
    ]

    ESTADO_NOMINA_CHOICES = [
        ('BORRADOR', 'Borrador'),
        ('PENDIENTE', 'Pendiente de pago'),
        ('PAGADA', 'Pagada'),
        ('CANCELADA', 'Cancelada'),
    ]

    empleado = models.ForeignKey(
        'Empleado',
        on_delete=models.CASCADE,
        related_name='nominas',
        null=True,
        blank=True
    )

    periodo_nominal = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Identificador del periodo nominal (ej. ENERO/01)"
    )
    
    empresa = models.ForeignKey(
        'Empresa',
        on_delete=models.CASCADE,
        related_name='nominas',
        null=True,
        blank=True
    )
    
    tipo_nomina = models.CharField(
        max_length=10,
        choices=TIPO_NOMINA_CHOICES,
        default='QUINCENAL'
    )
    
    fecha_inicio = models.DateField(null=True, blank=True)
    fecha_fin = models.DateField(null=True, blank=True)
    faltas_en_periodo = models.PositiveSmallIntegerField(default=0)
    salario_neto = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    calculos = models.JSONField(default=dict)
    
    estado = models.CharField(
        max_length=10,
        choices=ESTADO_NOMINA_CHOICES,
        default='BORRADOR'
    )
    
    creado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='nominas_creadas'
    )
    
    fecha_creacion = models.DateTimeField(null=True, blank=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Nómina"
        verbose_name_plural = "Nóminas"
        ordering = ['-fecha_inicio']
        unique_together = ['empleado', 'fecha_inicio', 'fecha_fin']
        indexes = [
            models.Index(fields=['empleado', 'fecha_inicio']),
            models.Index(fields=['estado']),
        ]

    def __str__(self):
        return f"Nómina {self.get_tipo_nomina_display()} - {self.empleado.nombre_completo if self.empleado else 'Sin empleado'} ({self.periodo_nominal})"

    def clean(self):
        """
        Validaciones mejoradas para:
        - Integridad de fechas
        - Duplicados con mensajes descriptivos
        - Consistencia de datos
        """
        errors = {}
        
        # Validación de fechas
        if self.fecha_inicio and self.fecha_fin:
            if self.fecha_fin <= self.fecha_inicio:
                errors['fecha_fin'] = 'La fecha final debe ser posterior a la fecha inicial'
            
            # Validación de duplicados solo para nuevas nóminas
            if not self.pk:
                existe = Nomina.objects.filter(
                    empleado=self.empleado,
                    fecha_inicio=self.fecha_inicio,
                    fecha_fin=self.fecha_fin
                ).exists()
                
                if existe:
                    periodo = f"{self.fecha_inicio.strftime('%d/%m/%Y')} a {self.fecha_fin.strftime('%d/%m/%Y')}"
                    errors['general'] = f'Ya existe nómina para {self.empleado.nombre_completo} en el periodo {periodo}'
        
        # Validación de estado consistente
        if self.estado == 'PAGADA' and not self.fecha_creacion:
            errors['estado'] = 'No se puede marcar como pagada una nómina no creada'
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        """
        Método save extendido con:
        - Validación automática
        - Sincronización de campos calculados
        - Gestión de fechas
        """
        self.clean()  # Ejecuta todas las validaciones
        
        # Sincroniza faltas desde los cálculos si existen
        if isinstance(self.calculos, dict):
            if 'empleado' in self.calculos and 'faltas_en_periodo' in self.calculos['empleado']:
                self.faltas_en_periodo = self.calculos['empleado']['faltas_en_periodo']
            elif 'faltas_en_periodo' in self.calculos:
                self.faltas_en_periodo = self.calculos['faltas_en_periodo']
        
        # Gestión automática de fechas
        if not self.pk and not self.fecha_creacion:
            self.fecha_creacion = timezone.now()
        
        super().save(*args, **kwargs)

    def actualizar_faltas(self, fechas_faltas):
        """
        Método mejorado para actualizar faltas:
        - Valida formato de fechas
        - Filtra fechas fuera del periodo
        - Actualiza campos relacionados
        """
        if not isinstance(self.calculos, dict):
            self.calculos = {'empleado': {}}
        elif 'empleado' not in self.calculos:
            self.calculos['empleado'] = {}

        faltas_validas = []
        for fecha_str in fechas_faltas:
            try:
                fecha = datetime.strptime(fecha_str, '%Y-%m-%d').date()
                if self.fecha_inicio <= fecha <= self.fecha_fin:
                    faltas_validas.append(fecha.isoformat())
            except (ValueError, TypeError):
                continue

        self.calculos['empleado'].update({
            'fechas_faltas': faltas_validas,
            'faltas_en_periodo': len(faltas_validas)
        })
        
        self.faltas_en_periodo = len(faltas_validas)
        self.save()
        
        return len(faltas_validas)

    def recalcular(self):
        """Método opcional para recalcular toda la nómina"""
        if hasattr(self, '_calcular_nomina'):
            self.calculos = self._calcular_nomina()
            self.salario_neto = self.calculos.get('resumen', {}).get('neto_a_pagar', 0)
            self.save()
        return self.calculos

    @property
    def periodo_completo(self):
        """Propiedad calculada para formato legible"""
        if self.fecha_inicio and self.fecha_fin:
            return f"{self.fecha_inicio.strftime('%d/%m/%Y')} - {self.fecha_fin.strftime('%d/%m/%Y')}"
        return self.periodo_nominal or "Sin periodo definido"
