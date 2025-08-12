from rest_framework import permissions

class IsEmpresaOwner(permissions.BasePermission):
    """
    Permiso personalizado para verificar si el usuario es dueño de la empresa.
    Permite acciones sobre objetos Empresa específicos.
    """
    def has_object_permission(self, request, view, obj):
        # Superusuarios pueden hacer cualquier cosa
        if request.user.is_superuser:
            return True
            
        # Usuarios tipo EMPRESA solo pueden acceder a sus propias empresas
        if hasattr(obj, 'usuarios'):
            return request.user in obj.usuarios.all()
            
        return False

class IsAdminOrEmpresaOwner(permissions.BasePermission):
    """
    Permite acceso a superusuarios o dueños de la empresa.
    Funciona tanto a nivel de objeto como de vista general.
    """
    def has_permission(self, request, view):
        # Solo usuarios autenticados
        if not request.user.is_authenticated:
            return False
            
        # Superusuarios pueden hacer cualquier cosa
        if request.user.is_superuser:
            return True
            
        # Usuarios tipo EMPRESA tienen acceso
        return request.user.tipo_usuario == 'EMPRESA'

    def has_object_permission(self, request, view, obj):
        # Superusuarios pueden hacer cualquier cosa
        if request.user.is_superuser:
            return True
            
        # Para objetos Empresa
        if hasattr(obj, 'usuarios'):
            return request.user in obj.usuarios.all()
            
        # Para otros objetos relacionados con Empresa
        if hasattr(obj, 'empresa'):
            return request.user in obj.empresa.usuarios.all()
            
        return False

class IsAdminOrSameEmpresa(permissions.BasePermission):
    """
    Permite acceso a superusuarios o usuarios de la misma empresa.
    Específico para objetos relacionados con una empresa (Empleados, Nóminas).
    """
    def has_permission(self, request, view):
        # Solo usuarios autenticados
        if not request.user.is_authenticated:
            return False
            
        # Superusuarios pueden hacer cualquier cosa
        if request.user.is_superuser:
            return True
            
        # Usuarios tipo EMPRESA o CONTADOR tienen acceso
        return request.user.tipo_usuario in ['EMPRESA', 'CONTADOR']

    def has_object_permission(self, request, view, obj):
        # Superusuarios pueden hacer cualquier cosa
        if request.user.is_superuser:
            return True
            
        # Para objetos con relación directa a Empresa
        if hasattr(obj, 'empresa'):
            return request.user in obj.empresa.usuarios.all()
            
        # Para objetos Empresa
        if hasattr(obj, 'usuarios'):
            return request.user in obj.usuarios.all()
            
        return False

class EsAdministradorEmpresa(permissions.BasePermission):
    """
    Permite acceso solo a usuarios administradores de la empresa (tipo EMPRESA).
    No permite acceso a superusuarios a menos que también sean tipo EMPRESA.
    """
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.tipo_usuario == 'EMPRESA'
        )

    def has_object_permission(self, request, view, obj):
        # Para objetos con relación directa a Empresa
        if hasattr(obj, 'empresa'):
            return request.user in obj.empresa.usuarios.all()
            
        # Para objetos Empresa
        if hasattr(obj, 'usuarios'):
            return request.user in obj.usuarios.all()
            
        return False