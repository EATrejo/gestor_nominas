from rest_framework.decorators import api_view
from rest_framework.response import Response

@api_view(['GET'])
def health_check(request):
    """Endpoint para verificar estado del servidor"""
    return Response({"status": "ok", "message": "API de Gestión de Nóminas activa"})