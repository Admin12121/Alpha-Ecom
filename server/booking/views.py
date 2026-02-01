from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
import datetime
import random
import string

from .models import Booking
from .serializers import (
    BookingCreateSerializer,
    BookingListSerializer,
    BookingDetailSerializer,
    BookingMeasurementUpdateSerializer,
)


class IsAdminOrCreateOnly(permissions.BasePermission):
    """
    Custom permission to allow anyone to create bookings,
    but only admins can view, update, or delete.
    """
    
    def has_permission(self, request, view):
        if request.method == 'POST' and view.action == 'create':
            return True
        return request.user and request.user.is_staff


def send_booking_confirmation_email(booking):
    """Send confirmation email to customer after booking"""
    try:
        subject = "Booking Confirmed - Your Measurement Appointment"
        message = f"""
Dear {booking.name},

Thank you for booking with us! Your appointment has been successfully scheduled.

Appointment Details:
- Date: {booking.preferred_date}
- Time: {booking.preferred_time}
- Type: {'In-Store Visit' if booking.measurement_type == 'in_store' else 'Home Visit'}
- Location: {booking.location}

We will contact you shortly to confirm your appointment.

Best regards,
The Team
        """
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [booking.email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send booking confirmation email: {e}")


def send_measurement_complete_email(booking):
    """Send email to customer when measurements are completed"""
    try:
        subject = "Your Measurements are Complete!"
        
        # Build measurements summary
        measurements_text = ""
        if booking.coat_measurements:
            measurements_text += "\nCOAT & SAFARI Measurements:\n"
            for key, val in booking.coat_measurements.items():
                a_val = val.get('A', '-')
                b_val = val.get('B', '-')
                measurements_text += f"  {key}: A={a_val}, B={b_val}\n"
        
        if booking.pant_measurements:
            measurements_text += "\nPANT Measurements:\n"
            for key, val in booking.pant_measurements.items():
                a_val = val.get('A', '-')
                b_val = val.get('B', '-')
                measurements_text += f"  {key}: A={a_val}, B={b_val}\n"
        
        if booking.shirt_measurements:
            measurements_text += "\nSHIRT Measurements:\n"
            for key, val in booking.shirt_measurements.items():
                a_val = val.get('A', '-')
                b_val = val.get('B', '-')
                measurements_text += f"  {key}: A={a_val}, B={b_val}\n"
        
        admin_note = ""
        if booking.admin_message:
            admin_note = f"\n\nMessage from our team:\n{booking.admin_message}"
        
        delivery_info = ""
        if booking.delivery_date:
            delivery_info = f"\nExpected Delivery Date: {booking.delivery_date}"
        
        message = f"""
Dear {booking.name},

Great news! Your measurements have been completed and recorded.

Bill Number: {booking.bill_number or 'N/A'}
Status: {booking.get_status_display()}{delivery_info}
{measurements_text}{admin_note}

Thank you for choosing us!

Best regards,
The Team
        """
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [booking.email],
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send measurement complete email: {e}")


def generate_bill_number():
    """Generate a unique bill number"""
    date_part = datetime.date.today().strftime('%Y%m%d')
    random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    bill_number = f"{date_part}-{random_part}"
    
    while Booking.objects.filter(bill_number=bill_number).exists():
        random_part = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        bill_number = f"{date_part}-{random_part}"
    
    return bill_number


class BookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for unified booking and measurement management.
    - Public: Can create bookings (POST)
    - Admin: Can list, view, update, delete bookings and add measurements
    """
    
    queryset = Booking.objects.all()
    permission_classes = [IsAdminOrCreateOnly]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        elif self.action == 'list':
            return BookingListSerializer
        elif self.action in ['update_measurements', 'partial_update']:
            return BookingMeasurementUpdateSerializer
        return BookingDetailSerializer
    
    def get_queryset(self):
        queryset = Booking.objects.all()
        
        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(email__icontains=search) |
                Q(phone_number__icontains=search) |
                Q(bill_number__icontains=search)
            )
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date', None)
        end_date = self.request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(preferred_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(preferred_date__lte=end_date)
        
        # Filter by measurement type
        measurement_type = self.request.query_params.get('measurement_type', None)
        if measurement_type:
            queryset = queryset.filter(measurement_type=measurement_type)
        
        # Filter by has_measurements
        has_measurements = self.request.query_params.get('has_measurements', None)
        if has_measurements == 'true':
            queryset = queryset.exclude(
                coat_measurements={},
                pant_measurements={},
                shirt_measurements={}
            )
        elif has_measurements == 'false':
            queryset = queryset.filter(
                coat_measurements={},
                pant_measurements={},
                shirt_measurements={}
            )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new booking (public access) and send confirmation email"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(status='pending')
        
        # Send confirmation email
        send_booking_confirmation_email(booking)
        
        # Return full booking info
        response_serializer = BookingDetailSerializer(booking)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Quick status update for a booking"""
        booking = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in dict(Booking.STATUS_CHOICES):
            return Response(
                {'error': 'Invalid status'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        booking.status = new_status
        booking.save()
        
        serializer = BookingDetailSerializer(booking)
        return Response(serializer.data)
    
    @action(detail=True, methods=['patch'])
    def update_measurements(self, request, pk=None):
        """Update measurements for a booking (admin only)"""
        booking = self.get_object()
        
        # Generate bill number if not exists
        if not booking.bill_number:
            booking.bill_number = generate_bill_number()
        
        serializer = BookingMeasurementUpdateSerializer(booking, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        
        # Check if this is completing measurements
        old_has_measurements = booking.has_measurements()
        serializer.save()
        booking.refresh_from_db()
        new_has_measurements = booking.has_measurements()
        
        # If measurements were just completed, set timestamp and send email
        if not old_has_measurements and new_has_measurements:
            booking.measurement_completed_at = timezone.now()
            booking.save()
        
        # Send email if status changed to completed or delivered, or if send_email flag is set
        if request.data.get('send_email') or booking.status in ['completed', 'delivered']:
            send_measurement_complete_email(booking)
        
        response_serializer = BookingDetailSerializer(booking)
        return Response(response_serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get booking statistics"""
        total = Booking.objects.count()
        pending = Booking.objects.filter(status='pending').count()
        confirmed = Booking.objects.filter(status='confirmed').count()
        in_progress = Booking.objects.filter(status='in_progress').count()
        completed = Booking.objects.filter(status='completed').count()
        delivered = Booking.objects.filter(status='delivered').count()
        cancelled = Booking.objects.filter(status='cancelled').count()
        
        with_measurements = Booking.objects.exclude(
            coat_measurements={},
            pant_measurements={},
            shirt_measurements={}
        ).count()
        
        return Response({
            'total': total,
            'pending': pending,
            'confirmed': confirmed,
            'in_progress': in_progress,
            'completed': completed,
            'delivered': delivered,
            'cancelled': cancelled,
            'with_measurements': with_measurements
        })


class CustomerLookupView(APIView):
    """
    API view for looking up customer by phone, email, or name.
    """
    
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        query = request.query_params.get('q', '')
        
        if not query:
            return Response(
                {'error': 'Query parameter "q" is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        bookings = Booking.objects.filter(
            Q(phone_number__icontains=query) |
            Q(email__icontains=query) |
            Q(name__icontains=query) |
            Q(bill_number__icontains=query)
        ).order_by('-created_at')[:10]
        
        return Response({
            'results': BookingListSerializer(bookings, many=True).data
        })


class GenerateBillNumberView(APIView):
    """Generate a unique bill number"""
    
    permission_classes = [permissions.IsAdminUser]
    
    def get(self, request):
        return Response({'bill_number': generate_bill_number()})
