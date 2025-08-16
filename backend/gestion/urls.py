from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    EmpresaRegistrationView,
    UserRegistrationView,
    FaltasViewSet,
    EmpresaViewSet,
    EmpleadoViewSet,
    NominaViewSet,
    CustomTokenObtainPairView,
    generar_calendario,
    obtener_periodos
)

router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet)
router.register(r'empleados', EmpleadoViewSet)
router.register(r'nominas', NominaViewSet, basename='nominas')

urlpatterns = [
    # Autenticación JWT
    path('auth/token/', csrf_exempt(CustomTokenObtainPairView.as_view()), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Registros
    path('auth/register/', csrf_exempt(EmpresaRegistrationView.as_view()), name='empresa-register'),
    path('auth/registro-empresa/', csrf_exempt(EmpresaRegistrationView.as_view()), name='registro-empresa'),  # Mantenido por compatibilidad
    path('auth/registro-usuario/', csrf_exempt(UserRegistrationView.as_view()), name='registro-usuario'),

    # Rutas de nóminas y periodos
    path('periodos/', obtener_periodos, name='obtener_periodos'),
    path('nominas/procesar_nomina/', NominaViewSet.as_view({'post': 'procesar_nomina'}), name='procesar-nomina'),
    path('calendario/', generar_calendario, name='generar_calendario'),

    # Ruta para registrar faltas
    path('empleados/<int:empleado_id>/faltas/registrar-faltas/', 
         csrf_exempt(FaltasViewSet.as_view({'post': 'registrar_faltas'})), 
         name='registrar-faltas'),

    # Rutas del router
    path('', include(router.urls)),
]