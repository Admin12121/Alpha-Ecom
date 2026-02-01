from django.db import transaction
from django.db.models import F, Q
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import filters, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from account.models import DeliveryAddress
from account.renderers import UserRenderer
from product.models import Product, ProductVariant
from server.utils.encryption import encrypt_response

from .models import *
from .serializers import *

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100

def get_invoice_details(data):
    invoice_items = []

    for item in data.get("products", []):
        product = Product.objects.select_related().get(id=item['product'])
        variant = ProductVariant.objects.select_related('product').get(id=item['variant'])
        image = product.images.first().image.url if product.images.exists() else None

        invoice_items.append({
            "product_name": product.product_name,
            "variant_size": variant.size,
            "pcs": item["pcs"],
            "price": float(variant.price),
            "image": image,
            "total": float(variant.price) * item["pcs"]
        })

    return {
        "transactionuid": data.get("transactionuid"),
        "email": data.get("email"),
        "payment_method": data.get("payment_method"),
        "sub_total": float(data.get("sub_total", 0)),
        "shipping": float(data.get("shipping", 0)),
        "discount": float(data.get("discount", 0)),
        "total_amt": float(data.get("total_amt", 0)),
        "products": invoice_items,
    }

class SalesViewSet(viewsets.ModelViewSet):
    queryset = Sales.objects.all().order_by('-id')
    renderer_classes = [UserRenderer]
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['costumer_name']
    search_fields = ['costumer_name__first_name', 'transactionuid', 'costumer_name__email']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return SalesPostDataSerializer
        return SaleQuertSetSerializer
    
    @encrypt_response
    def retrieve(self, request, *args, **kwargs):
        transactionuid = kwargs.get('transactionuid')
        instance = get_object_or_404(Sales, transactionuid=transactionuid)
        serializer = SalesDataSerializer(instance)
        return Response(serializer.data)

    def get_queryset(self):
        queryset = self.queryset
        search = self.request.query_params.get('search')
        if search:
            filters = Q(costumer_name__first_name__icontains=search) | Q(transactionuid__icontains=search) | Q(costumer_name__email__icontains=search)
            queryset = queryset.filter(filters)
        user = self.request.user
        if not user.is_superuser:
            return queryset.filter(costumer_name=user)
        return queryset

    def perform_create(self, serializer):
        data = self.request.data
        invoice_data = data.get('products', [])
        user = self.request.user

        try:
            shipping_instance = DeliveryAddress.objects.get(id=data.get('shipping'))
        except DeliveryAddress.DoesNotExist:
            return Response({"error": "Invalid shipping address."}, status=status.HTTP_400_BAD_REQUEST)

        redeem_code_obj = None
        redeem_code_error = None

        with transaction.atomic():
            redeem_data = data.get('redeemData')
            if redeem_data:
                try:
                    redeem_code_obj = Redeem_Code.objects.get(id=redeem_data["id"])
                    if redeem_code_obj.valid_until < timezone.now().date():
                        redeem_code_error = "Redeem code is expired."
                    elif redeem_code_obj.used >= redeem_code_obj.limit:
                        redeem_code_error = "Redeem code usage limit reached."
                    else:
                        redeem_code_obj.used += 1
                        redeem_code_obj.save()
                except Redeem_Code.DoesNotExist:
                    redeem_code_error = "Invalid redeem code."

            if redeem_code_error:
                return Response({"warning": redeem_code_error}, status=status.HTTP_201_CREATED)

            sale = serializer.save(
                costumer_name=user,
                redeem_data=redeem_code_obj.name if redeem_code_obj and redeem_code_obj.name else None,
                shipping=shipping_instance,
                discount=data.get('discount'),
                sub_total=data.get('sub_total'),
                total_amt=data.get('total_amt'),
                transactionuid=data.get('transactionuid'),
                payment_method=data.get('payment_method')
            )

            for item in invoice_data:
                product = get_object_or_404(Product, id=item['product'])
                variant = get_object_or_404(ProductVariant, id=item['variant'])
                quantity_sold = item['pcs']

                if variant.stock < quantity_sold:
                    raise serializers.ValidationError({"error": f"Not enough stock for product variant {variant.id}"})

                variant.stock -= quantity_sold
                variant.save()

                Saled_Products.objects.create(
                    transition=sale,
                    product=product,
                    variant=variant,
                    price=variant.price,
                    qty=quantity_sold,
                    total=variant.price * quantity_sold
                )

            context = get_invoice_details(data)

            return Response({"success": "Order created and invoice sent."}, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='status/(?P<status_param>[^/.]+)')
    def filter_by_status(self, request, status_param=None):
        status_map = {
            'onshipping': ['pending', 'verified'],
            'arrived': ['proceed', 'packed'],
            'delivered': ['delivered', 'successful'],
            'canceled': ['unpaid', 'cancelled']
        }
        queryset = self.get_queryset()
        if status_param != 'all':
            queryset = queryset.filter(status__in=status_map.get(status_param, []))
            
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RedeemCodeViewSet(viewsets.ModelViewSet):
    queryset = Redeem_Code.objects.all().order_by('-id')
    serializer_class = RedeemSerializer
    renderer_classes = [UserRenderer]
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['code', 'name']
    search_fields = ['code', 'name']
    ordering_fields = ['valid', 'used']

    def get_queryset(self):
        code = self.request.query_params.get('code')
        if code:
            return Redeem_Code.objects.filter(code=code)
        return super().get_queryset()

    def perform_create(self, serializer):
        name = self.request.data.get('name')
        code = self.request.data.get('code')
        if Redeem_Code.objects.filter(code=code, name=name).exists():
            raise serializers.ValidationError({'error': f'{name} already exists in this store'})
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        name = instance.name
        self.perform_destroy(instance)
        return Response({'msg': f'Redeem code {name} deleted successfully'}, status=status.HTTP_200_OK)
        
    @action(detail=False, methods=['post'], url_path='verify-code')
    def verify_code(self, request):
        code = request.data.get('code')
        if not code:
            return Response({'error': 'Code is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            redeem_code = Redeem_Code.objects.get(code=code)
        except Redeem_Code.DoesNotExist:
            return Response({'error': 'Invalid code'}, status=status.HTTP_404_NOT_FOUND)
        
        if redeem_code.valid_until < timezone.now().date():
            return Response({'error': 'Code is expired'}, status=status.HTTP_400_BAD_REQUEST)
        
        if redeem_code.limit is not None and redeem_code.used >= redeem_code.limit:
            return Response({'error': 'Code usage limit reached'}, status=status.HTTP_400_BAD_REQUEST)
        
        data = {
            'id': redeem_code.id,
            'type': redeem_code.type,
            'discount': redeem_code.discount,
            'minimum': redeem_code.minimum,
            'limit': redeem_code.limit,
        }
        return Response(data, status=status.HTTP_200_OK)    
    


