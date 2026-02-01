from django.conf import settings
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils import timezone
import random

def generate_otp():
    return str(random.randint(10000, 99999))
def is_otp_valid(user, otp):
    if user.otp_token == otp and (timezone.now() - user.otp_created_at).seconds < 300:
        return True
    return False



class TokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self,user,timestamp):
        return (
        str(user.pk) + str(timestamp) 
        # text_type(user.profile.signup_confirmation)
        )

generate_token = TokenGenerator()



from django.core.mail import EmailMessage
import smtplib

def send_email(subject, email, body):
    try:
        message = body
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email="vickytaj6459@gmail.com",
            to=[email] if isinstance(email, str) else email
        )
        email.content_subtype = "html"
        email.send(fail_silently=False)
        return True
    except smtplib.SMTPException as e:
        print(f"❌ SMTP Error: {e}")
    except Exception as ex:
        print(f"❌ Other Error: {ex}")
    
    return False
