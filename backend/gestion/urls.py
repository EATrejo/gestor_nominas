# backend/gestion/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.views import (
    TokenRefreshView,
    TokenVerifyView
)
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

# Router API
router = DefaultRouter()
router.register(r'empresas', EmpresaViewSet)
router.register(r'empleados', EmpleadoViewSet)
router.register(r'nominas', NominaViewSet, basename='nominas')

urlpatterns = [
    # Autenticación JWT
    path('auth/token/', csrf_exempt(CustomTokenObtainPairView.as_view()), name='token_obtain_pair'),
    path('auth/token/refresh/', csrf_exempt(TokenRefreshView.as_view()), name='token_refresh'),
    path('auth/token/verify/', csrf_exempt(TokenVerifyView.as_view()), name='token_verify'),

    # Registros (convención nueva)
    path('auth/register/', csrf_exempt(EmpresaRegistrationView.as_view()), name='empresa-register'),
    path('auth/register-user/', csrf_exempt(UserRegistrationView.as_view()), name='user-register'),

    # (compatibilidad opcional con rutas viejas)
    path('auth/registro-empresa/', csrf_exempt(EmpresaRegistrationView.as_view()), name='registro-empresa'),
    path('auth/registro-usuario/', csrf_exempt(UserRegistrationView.as_view()), name='registro-usuario'),

    # Nóminas y periodos
    path('periodos/', obtener_periodos, name='obtener_periodos'),
    path('nominas/procesar_nomina/', NominaViewSet.as_view({'post': 'procesar_nomina'}), name='procesar-nomina'),
    path('calendario/', generar_calendario, name='generar_calendario'),

    # Faltas
    path(
        'empleados/<int:empleado_id>/faltas/registrar-faltas/',
        csrf_exempt(FaltasViewSet.as_view({'post': 'registrar_faltas'})),
        name='registrar-faltas'
    ),

    # Rutas del router
    path('', include(router.urls)),
]
