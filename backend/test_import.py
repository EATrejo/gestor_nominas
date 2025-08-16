import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# test_vscode.py
from rest_framework_simplejwt.views import TokenObtainPairView  # Should no longer show error
print("VSCode recognizes the import!")