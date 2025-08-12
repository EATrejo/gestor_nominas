# test_imss.py
from gestion.utils import CalculadoraIMSS, calcular_imss

def run_tests():
    # Casos de prueba válidos
    test_cases = [
        (300.50, 15),   # Salario normal
        (150.00, 1),    # Mínimo de días
        (5000.00, 30),  # Salario alto
    ]
    
    for salario, dias in test_cases:
        print(f"\n--- Prueba con salario: {salario}, días: {dias} ---")
        try:
            calc = CalculadoraIMSS(salario)
            print(f"SBC diario: {calc.calcular_sbc()}")
            
            imss = calcular_imss(salario, dias)
            print("IMSS:", imss)
        except Exception as e:
            print(f"❌ Error: {e}")
    
    # Prueba casos inválidos
    invalid_cases = [
        ("abc", 15),       # Salario no numérico
        (300.50, "quince"), # Días no numéricos
        (300.50, -5),       # Días negativos
        (300.50, 0),        # Cero días
    ]
    
    print("\n--- Pruebas de validación ---")
    for salario, dias in invalid_cases:
        print(f"Probando salario: {salario}, días: {dias}")
        try:
            calcular_imss(salario, dias)
            print("✅ (Esta prueba debería fallar!)")
        except ValueError as e:
            print(f"✔️ Comportamiento esperado: {e}")

if __name__ == "__main__":
    run_tests()