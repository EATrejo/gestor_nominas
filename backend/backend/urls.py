from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView
from django.http import HttpResponse
from django.conf import settings
from django.conf.urls.static import static

def get_jwt_view():
    from gestion.views import CustomTokenObtainPairView
    return CustomTokenObtainPairView.as_view()

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/token/', get_jwt_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Ruta específica para periodos nominales ANTES del include general
    path('api/periodos-nominales/', include('gestion.periodo_urls')),
    
    # Otras rutas API
    path('api/', include('gestion.urls')),
    
    path('', lambda request: HttpResponse("Backend funcionando"), name='home'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += [path('favicon.ico', lambda _: HttpResponse(status=204))]