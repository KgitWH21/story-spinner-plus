from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class SoftJWTAuthentication(JWTAuthentication):
    """
    Like JWTAuthentication but silently treats invalid/expired tokens as anonymous
    instead of raising 401. Lets AllowAny views remain public even when the client
    sends a stale token in localStorage.
    """
    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, TokenError):
            return None
