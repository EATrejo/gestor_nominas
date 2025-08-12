from django.test import TestCase
from .models import Empleado, Empresa
from .utils import calcular_isr, calcular_nomina_empleado

class TestCalculoNomina(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.empresa = Empresa.objects.create(
            rfc="TEST12345678",
            nombre="Empresa Test",
            regimen_fiscal="601"
        )
        cls.empleado = Empleado.objects.create(
            nombre_completo="Empleado Test",
            rfc="TEST800101XXX",
            nss="12345678901",
            salario_diario=500.00,
            empresa=cls.empresa
        )

    def test_calculo_isr_quincenal(self):
        resultado = calcular_isr(7500, 'quincenal')
        self.assertIsInstance(resultado, float)
        self.assertGreaterEqual(resultado, 0)

    def test_calculo_nomina_completa(self):
        resultado = calcular_nomina_empleado(self.empleado, 'quincenal')
        self.assertEqual(resultado['periodo'], 'quincenal')
        self.assertEqual(resultado['salario_bruto'], 7500.00)
        self.assertIn('isr_retenido', resultado)