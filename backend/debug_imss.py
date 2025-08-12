#!/usr/bin/env python3
from gestion.utils import calcular_imss

# Versión mejorada del debugger
def debug_calculo():
    print("\n=== MODO DEBUGGING ===")
    
    # Caso que falla
    try:
        print("\nPrueba 1 - Con string '15'")
        resultado = calcular_imss(300.00, '15')
        print("Resultado:", resultado)
    except Exception as e:
        print("¡Error detectado!", type(e).__name__, ":", e)
    
    # Caso que debería funcionar
    try:
        print("\nPrueba 2 - Con número 15")
        resultado = calcular_imss(300.00, 15)
        print("Resultado exitoso:", resultado)
    except Exception as e:
        print("Error inesperado:", e)

if __name__ == "__main__":
    debug_calculo()