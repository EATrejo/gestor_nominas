from django import forms
from django.core.exceptions import ValidationError
from datetime import datetime
from .models import Empresa, Empleado, Nomina

class DateInput(forms.DateInput):
    input_type = 'date'
    format = '%d/%m/%Y'  # Formato de visualización

class EmpresaForm(forms.ModelForm):
    class Meta:
        model = Empresa
        fields = ['nombre', 'activa', 'usuarios']
        widgets = {
            'nombre': forms.TextInput(attrs={
                'class': 'form-control',
                'placeholder': 'Nombre de la empresa'
            }),
            'activa': forms.CheckboxInput(attrs={
                'class': 'form-check-input'
            }),
            'usuarios': forms.SelectMultiple(attrs={
                'class': 'form-select'
            })
        }

class EmpleadoForm(forms.ModelForm):
    class Meta:
        model = Empleado
        fields = '__all__'
        widgets = {
            'nss': forms.TextInput(attrs={
                'class': 'form-control',
                'pattern': '[0-9]{11}',
                'title': '11 dígitos numéricos'
            }),
            'fecha_ingreso': DateInput(attrs={'class': 'form-control'}),
            'salario_diario': forms.NumberInput(attrs={
                'class': 'form-control',
                'step': '0.01'
            }),
            'dias_descanso': forms.CheckboxSelectMultiple()
        }

    def clean_fecha_ingreso(self):
        fecha = self.cleaned_data['fecha_ingreso']
        if fecha > datetime.now().date():
            raise ValidationError("La fecha no puede ser futura")
        return fecha

class NominaForm(forms.ModelForm):
    class Meta:
        model = Nomina
        fields = ['empleado', 'tipo_nomina', 'fecha_inicio', 'fecha_fin']
        widgets = {
            'empleado': forms.Select(attrs={'class': 'form-select'}),
            'tipo_nomina': forms.Select(attrs={'class': 'form-select'}),
            'fecha_inicio': DateInput(attrs={'class': 'form-control'}),
            'fecha_fin': DateInput(attrs={'class': 'form-control'})
        }

    def clean(self):
        cleaned_data = super().clean()
        fecha_inicio = cleaned_data.get('fecha_inicio')
        fecha_fin = cleaned_data.get('fecha_fin')

        if fecha_inicio and fecha_fin and fecha_inicio > fecha_fin:
            raise ValidationError("La fecha de inicio no puede ser posterior a la fecha final")