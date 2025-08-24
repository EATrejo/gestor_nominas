from django.contrib import admin
from .models import Empresa, Empleado, Nomina, User
from django.utils.html import format_html
from .forms import EmpresaForm
from django.core.exceptions import FieldDoesNotExist

# admin.py
from django.contrib import admin
from .models import Empresa

@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = (
        'nombre',
        'giro',
        'cantidad_empleados',
        'ciudad',
        'estado',
        'activa',
        'fecha_registro',
        'fecha_actualizacion',
        'usuarios_asociados'
    )
    search_fields = (
        'nombre',
        'giro',
        'ciudad',
        'estado',
        'usuarios__email'
    )
    list_filter = ('activa', 'estado', 'fecha_registro')
    ordering = ('-fecha_registro',)
    filter_horizontal = ('usuarios',)  # Para manejar ManyToMany con selección múltiple
    readonly_fields = ('fecha_registro', 'fecha_actualizacion')

    fieldsets = (
        ('Información general', {
            'fields': ('nombre', 'giro', 'cantidad_empleados', 'activa')
        }),
        ('Ubicación', {
            'fields': ('ciudad', 'estado')
        }),
        ('Usuarios asociados', {
            'fields': ('usuarios',)
        }),
        ('Fechas de control', {
            'fields': ('fecha_registro', 'fecha_actualizacion')
        }),
    )

    def usuarios_asociados(self, obj):
        return ", ".join([u.email for u in obj.usuarios.all()])
    usuarios_asociados.short_description = "Usuarios asociados"


@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = (
        'nombre_completo', 
        'nss_formateado', 
        'empresa_link', 
        'periodo_nominal', 
        'salario_display',
        'estado', 
        'fecha_ingreso_formatted',
        'activo',
        'faltas_injustificadas_count',  # Nuevo campo
        'faltas_justificadas_count'     # Nuevo campo
    )
    list_filter = ('empresa__nombre', 'activo', 'periodo_nominal', 'zona_salarial')
    search_fields = (
        'nombre', 
        'apellido_paterno', 
        'apellido_materno', 
        'nss', 
        'empresa__nombre',
        'rfc'
    )
    list_editable = ('periodo_nominal', 'activo')
    raw_id_fields = ('empresa',)
    list_select_related = ('empresa',)
    list_per_page = 25
    readonly_fields = ('fecha_baja', 'motivo_baja')
    actions = ['marcar_como_inactivo', 'marcar_como_activo']
    
    def nombre_completo(self, obj):
        return f"{obj.nombre} {obj.apellido_paterno} {obj.apellido_materno or ''}".strip()
    nombre_completo.short_description = 'Nombre Completo'
    nombre_completo.admin_order_field = 'nombre'
    
    def nss_formateado(self, obj):
        return f"{obj.nss[:2]} {obj.nss[2:5]} {obj.nss[5:8]} {obj.nss[8:]}" if obj.nss else ""
    nss_formateado.short_description = 'NSS'
    nss_formateado.admin_order_field = 'nss'
    
    def empresa_link(self, obj):
        if obj.empresa:
            return format_html('<a href="/admin/gestion/empresa/{}/change/">{}</a>', obj.empresa.id, obj.empresa.nombre)
        return "-"
    empresa_link.short_description = 'Empresa'
    empresa_link.admin_order_field = 'empresa__nombre'
    
    def salario_display(self, obj):
        if obj.periodo_nominal == 'MENSUAL':
            return f"Mensual: ${obj.sueldo_mensual:,.2f}" if obj.sueldo_mensual else "$0.00"
        return f"Diario: ${obj.salario_diario:,.2f}" if obj.salario_diario else "$0.00"
    salario_display.short_description = 'Salario'
    salario_display.admin_order_field = 'salario_diario'
    
    def estado(self, obj):
        color = 'green' if obj.activo else 'red'
        return format_html(
            '<span style="color: {};">{}</span>',
            color,
            "Activo" if obj.activo else "Inactivo"
        )
    estado.short_description = 'Estado'
    
    def fecha_ingreso_formatted(self, obj):
        return obj.fecha_ingreso.strftime('%d/%m/%Y') if obj.fecha_ingreso else ""
    fecha_ingreso_formatted.short_description = 'Fecha Ingreso'
    fecha_ingreso_formatted.admin_order_field = 'fecha_ingreso'

    def faltas_injustificadas_count(self, obj):
        return len(obj.fechas_faltas_injustificadas) if obj.fechas_faltas_injustificadas else 0
    faltas_injustificadas_count.short_description = 'F. Injustificadas'
    
    def faltas_justificadas_count(self, obj):
        return len(obj.fechas_faltas_justificadas) if obj.fechas_faltas_justificadas else 0
    faltas_justificadas_count.short_description = 'F. Justificadas'

    fieldsets = (
        ('Información Personal', {
            'fields': ('nombre', 'apellido_paterno', 'apellido_materno')
        }),
        ('Datos Laborales', {
            'fields': ('nss', 'rfc', 'fecha_ingreso', 'empresa', 'periodo_nominal', 
                      'zona_salarial', 'dias_descanso', 'activo')
        }),
        ('Registro de Faltas', {
            'fields': ('fechas_faltas_injustificadas', 'fechas_faltas_justificadas'),
            'description': 'Registro de faltas del empleado'
        }),
        ('Salario', {
            'fields': (),
            'description': 'Complete según el periodo de pago seleccionado'
        }),
        ('Baja Laboral (solo lectura)', {
            'fields': ('fecha_baja', 'motivo_baja'),
            'classes': ('collapse',)
        }),
    )

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        fieldsets = list(fieldsets)
        
        # Agregar campos de salario dinámicamente según el periodo
        if obj and obj.periodo_nominal == 'MENSUAL':
            fieldsets[3] = ('Salario', {
                'fields': ('sueldo_mensual',),
                'description': 'Sueldo mensual (para periodos MENSUALES)'
            })
        else:
            fieldsets[3] = ('Salario', {
                'fields': ('salario_diario',),
                'description': 'Salario diario (para periodos SEMANAL/QUINCENAL)'
            })
        
        return fieldsets

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        
        try:
            if obj:
                if obj.periodo_nominal == 'MENSUAL' and 'salario_diario' in form.base_fields:
                    form.base_fields['salario_diario'].widget.attrs['readonly'] = True
                    form.base_fields['salario_diario'].help_text = 'No aplica para periodo MENSUAL'
                elif obj.periodo_nominal in ['SEMANAL', 'QUINCENAL'] and 'sueldo_mensual' in form.base_fields:
                    form.base_fields['sueldo_mensual'].widget.attrs['readonly'] = True
                    form.base_fields['sueldo_mensual'].help_text = 'Calculado automáticamente'
        except FieldDoesNotExist:
            pass
            
        return form

    @admin.action(description='Marcar empleados seleccionados como INACTIVOS')
    def marcar_como_inactivo(self, request, queryset):
        updated = queryset.update(activo=False)
        self.message_user(request, f"{updated} empleados marcados como inactivos")

    @admin.action(description='Marcar empleados seleccionados como ACTIVOS')
    def marcar_como_activo(self, request, queryset):
        updated = queryset.update(activo=True)
        self.message_user(request, f"{updated} empleados marcados como activos")

@admin.register(Nomina)
class NominaAdmin(admin.ModelAdmin):
    list_display = (
        'empleado_link',
        'empresa_link',
        'periodo_display',
        'salario_neto_display',
        'creado_por_display',
        'fecha_creacion_formatted'
    )
    list_filter = (
        ('empresa', admin.RelatedOnlyFieldListFilter),
        ('fecha_creacion', admin.DateFieldListFilter),
    )
    search_fields = (
        'empleado__nombre',
        'empleado__apellido_paterno',
        'empleado__apellido_materno',
        'empresa__nombre'
    )
    list_select_related = ('empleado', 'empresa', 'creado_por')
    list_per_page = 30
    date_hierarchy = 'fecha_creacion'
    readonly_fields = ('fecha_creacion',)  # Eliminado ultima_modificacion
    
    def empleado_link(self, obj):
        if obj.empleado:
            return format_html(
                '<a href="/admin/gestion/empleado/{}/change/">{}</a>',
                obj.empleado.id,
                obj.empleado.nombre_completo
            )
        return "-"
    empleado_link.short_description = 'Empleado'
    
    def empresa_link(self, obj):
        if obj.empresa:
            return format_html(
                '<a href="/admin/gestion/empresa/{}/change/">{}</a>',
                obj.empresa.id,
                obj.empresa.nombre
            )
        return "-"
    empresa_link.short_description = 'Empresa'
    
    def periodo_display(self, obj):
        if hasattr(obj, 'fecha_inicio') and obj.fecha_inicio and hasattr(obj, 'fecha_fin') and obj.fecha_fin:
            return format_html(
                '<strong>{} a {}</strong>',
                obj.fecha_inicio.strftime('%d/%m/%Y'),
                obj.fecha_fin.strftime('%d/%m/%Y')
            )
        return "-"
    periodo_display.short_description = 'Periodo'
    
    def salario_neto_display(self, obj):
        if hasattr(obj, 'salario_neto') and obj.salario_neto:
            return f"${obj.salario_neto:,.2f}"
        return "$0.00"
    salario_neto_display.short_description = 'Salario Neto'
    
    def creado_por_display(self, obj):
        if obj.creado_por:
            return format_html(
                '<a href="/admin/gestion/user/{}/change/">{}</a>',
                obj.creado_por.id,
                obj.creado_por.email
            )
        return '-'
    creado_por_display.short_description = 'Creado por'

    def fecha_creacion_formatted(self, obj):
        return obj.fecha_creacion.strftime('%d/%m/%Y %H:%M') if obj.fecha_creacion else ""
    fecha_creacion_formatted.short_description = 'Fecha creación'
    fecha_creacion_formatted.admin_order_field = 'fecha_creacion'

    fieldsets = (
        ('Relaciones', {
            'fields': ('empleado', 'empresa', 'creado_por')
        }),
        ('Datos Laborales', {
            'fields': ('dias_laborados', 'salario_neto')
        }),
        ('Metadatos', {
            'fields': ('fecha_creacion',),  # Eliminado ultima_modificacion
            'classes': ('collapse',)
        }),
    )