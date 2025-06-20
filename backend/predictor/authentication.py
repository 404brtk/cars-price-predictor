from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import logging

logger = logging.getLogger(__name__)

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        access_token_cookie_name = getattr(settings, 'ACCESS_TOKEN_COOKIE_NAME', 'access_token')
        raw_token = request.COOKIES.get(access_token_cookie_name)
        
        if raw_token is None:
            return None # no token found in cookie, authentication fails

        # if token is found, proceed with standard validation
        try:
            validated_token = self.get_validated_token(raw_token)
        except (InvalidToken, TokenError) as e:
            # specific JWT exceptions from simplejwt
            logger.warning(f"Cookie JWT Authentication: Invalid or expired token. Error: {str(e)}")
            return None # authentication with this method fails
        except Exception as e:
            # catch any other unexpected errors during token validation
            logger.error(f"Cookie JWT Authentication: Unexpected error validating token. Error: {str(e)}", exc_info=True)
            return None # authentication with this method fails
            
        return self.get_user(validated_token), validated_token
