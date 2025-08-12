import unittest
from decimal import Decimal
from gestion.utils import CalculadoraIMSS, calcular_imss

class TestIMSS(unittest.TestCase):
    def test_calculo_sbc(self):
        calc = CalculadoraIMSS(300.50)
        self.assertAlmostEqual(float(calc.calcular_sbc()), 300.50 * 1.0493, places=2)
    
    def test_calculo_imss_valido(self):
        resultado = calcular_imss(300.50, 15)
        self.assertIn('prestaciones_dinero', resultado)
        self.assertGreater(resultado['total_deduccion_imss'], 0)
    
    def test_dias_invalidos(self):
        with self.assertRaises(ValueError):
            calcular_imss(300.50, "quince")
        with self.assertRaises(ValueError):
            calcular_imss(300.50, -5)
    
    def test_salario_invalido(self):
        with self.assertRaises(ValueError):
            CalculadoraIMSS("no es un número")

if __name__ == "__main__":
    unittest.main()