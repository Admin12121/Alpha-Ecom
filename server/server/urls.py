from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # path('admin/', admin.site.urls),
    path('api/accounts/',include('account.urls')),
    path('api/sales/', include('sales.urls')),
    path('api/products/', include('product.urls')),
    path('api/layout/', include('layout.urls')),
    path('api/booking/', include('booking.urls')),
]
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)