from django.urls import path, include
from rest_framework.routers import DefaultRouter
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.views import TokenRefreshView # type: ignore
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
    path('auth/token/', csrf_exempt(CustomTokenObtainPairView.as_view()), name='token_obtain_pair'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/registro-empresa/', csrf_exempt(EmpresaRegistrationView.as_view()), name='registro-empresa'),
    path('auth/registro-usuario/', csrf_exempt(UserRegistrationView.as_view()), name='registro-usuario'),

    path('periodos/', obtener_periodos, name='obtener_periodos'),
    path('nominas/procesar_nomina/', NominaViewSet.as_view({'post': 'procesar_nomina'}), name='procesar-nomina'),
    path('calendario/', generar_calendario, name='generar_calendario'),

    # ✅ Ruta explícita para registrar faltas
    path('empleados/<int:empleado_id>/faltas/registrar-faltas/', 
         csrf_exempt(FaltasViewSet.as_view({'post': 'registrar_faltas'})), 
         name='registrar-faltas'),

    path('', include(router.urls)),
]
