from rest_framework import viewsets
from .models import Layout
from .serializers import LayoutSerializer

class LayoutViewSet(viewsets.ModelViewSet):
    queryset = Layout.objects.all()
    serializer_class = LayoutSerializer
    lookup_field = 'slug'
