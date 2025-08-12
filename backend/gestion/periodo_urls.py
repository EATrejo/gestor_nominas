from django.urls import path
from .views import NominaViewSet

urlpatterns = [
    path('', NominaViewSet.as_view({'get': 'list_periodos'}), name='periodos-nominales'),
]