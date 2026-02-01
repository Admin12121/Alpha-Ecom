import os
from pathlib import Path
from datetime import timedelta
from decouple import config
import logging

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = config('SECRET_KEY')

DEBUG = True

ALLOWED_HOSTS = ['*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third-party apps
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    # Local apps
    'account',
    'product',
    'sales',
    'layout',
    'booking',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'corsheaders.middleware.CorsMiddleware',
]

ROOT_URLCONF = 'server.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "templates"],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'server.wsgi.application'

AUTH_USER_MODEL = 'account.User'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.mysql',
#         'NAME': config('DB_name'),
#         'USER': config('DB_user'),
#         'PASSWORD': config('DB_password'),
#         'HOST': config('DB_Host'),
#         'PORT': '3306',
# }}

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True

STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static') 

MEDIA_URL ='/media/'
MEDIA_ROOT = os.path.join(BASE_DIR,"media")

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST')
EMAIL_USE_TLS = True
EMAIL_PORT = 587
EMAIL_USE_SSL = False
EMAIL_HOST_USER = config('EMAIL_HOST_USER')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD')

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=7),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=10),
    'ROTATE_REFRESH_TOKENS' : True,
    'BLACKLIST_AFTER_ROTATION' : True,

    'SIGNING_KEY': config('JWT_SECRET'),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'USER_ID_FIELD': 'id',
    'LEAK_PROOF': True,

    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'JTI_CLAIM': 'jti',
}

CORS_ALLOW_ALL_ORIGINS = True
# SECURE_SSL_REDIRECT = True
# CSRF_COOKIE_SECURE = True
# SESSION_COOKIE_SECURE = True

PASSWORD_RESET_TIMEOUT=300          # 300 Sec = 5 Min

FILE_UPLOAD_HANDLERS = [
    'django.core.files.uploadhandler.TemporaryFileUploadHandler',
]


class CustomFormatter(logging.Formatter):
    def format(self, record):
        if not hasattr(record, 'user'):
            record.user = 'AnonymousUser'
        return super().format(record)

# LOGGING = {
#     'version': 1,
#     'disable_existing_loggers': True,
#     'formatters': {
#         'verbose': {
#             '()': CustomFormatter,
#             'format': '%(asctime)s - %(name)s - %(levelname)s - %(user)s - %(message)s',
#             'datefmt': '%Y-%m-%d %H:%M:%S',
#         },
#     },
#     'handlers': {
#         'rotating_file': {
#             'level': 'DEBUG',
#             'class': 'logging.handlers.TimedRotatingFileHandler',
#             'filename': os.path.join(BASE_DIR, 'logs/django.log'),
#             'when': 'midnight',
#             'interval': 30,
#             'backupCount': 12, 
#             'formatter': 'verbose',
#         },
#     },
#     'loggers': {
#         'products': {
#             'handlers': ['rotating_file'],
#             'level': 'DEBUG',
#             'propagate': False,
#         },
#         'sales': {
#             'handlers': ['rotating_file'],
#             'level': 'DEBUG',
#             'propagate': False,
#         },
#         'django': {
#             'handlers': [],
#             'level': 'ERROR',  
#             'propagate': False,  
#         },
#         'django.request': {
#             'handlers': [],
#             'level': 'ERROR',  
#             'propagate': False,
#         },
#         'django.server': {
#             'handlers': [],
#             'level': 'ERROR', 
#             'propagate': False,
#         },
#         'django.db.backends': {
#             'handlers': [],
#             'level': 'ERROR',  
#             'propagate': False,
#         },
#         'django.security': {
#             'handlers': [],
#             'level': 'ERROR', 
#             'propagate': False,
#         },
#     },
# }