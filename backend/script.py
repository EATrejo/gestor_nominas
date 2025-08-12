import pandas as pd

import os

excel_file = 'C:/Users/alons/OneDrive/Escritorio/gestor_nominas/backend/gestion/data/tabla_subsidio_semanal.xlsx'
print("Intentando cargar el archivo:", os.path.abspath(excel_file))
df = pd.read_excel(excel_file, sheet_name='Hoja1')

# Cargar el archivo Excel 
excel_file = 'C:/Users/alons/OneDrive/Escritorio/gestor_nominas/backend/gestion/data/tabla_subsidio_semanal.xlsx'  # Reemplaza con la ruta de tu archivo Excel 
# Leer el archivo Excel 
df = pd.read_excel(excel_file, sheet_name='Hoja1')  # Cambia 'NombreHoja' por el nombre de la hoja que deseas convertir

# Guardar como CSV 
csv_file = 'gestion/data/tabla_subsidio_semanal.csv'  # Reemplaza con la ruta donde deseas guardar el archivo CSV 
df.to_csv(csv_file, index=False)  # index=False para no incluir el índice en el CSV

print("Conversión completa.") 