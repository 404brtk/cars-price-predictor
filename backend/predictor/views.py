from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView as BaseTokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework import status, serializers
from .models import Prediction, CarListing
from .ml_service import get_price_prediction
from django.db.models import Min, Max
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.utils import timezone
from django.core.cache import cache
from django.conf import settings
from datetime import datetime
import logging
from .serializers import (
    UserSerializer,
    PredictionInputSerializer,
    PredictionOutputSerializer,
    CustomTokenObtainPairSerializer,
    CustomTokenRefreshSerializer,
    UserDetailSerializer
)


logger = logging.getLogger(__name__)

# helper functions for cookie management
def set_auth_cookies(response, access_token, refresh_token):
    """
    Sets access and refresh tokens as HTTP-only cookies in the response.
    Configuration is sourced from Django settings for flexibility.
    """
    access_token_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    refresh_token_lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
    cookie_secure = getattr(settings, 'JWT_COOKIE_SECURE', not settings.DEBUG)
    cookie_httponly = getattr(settings, 'JWT_COOKIE_HTTPONLY', True)
    cookie_samesite = getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
    access_token_cookie_name = getattr(settings, 'ACCESS_TOKEN_COOKIE_NAME', 'access_token')
    refresh_token_cookie_name = getattr(settings, 'REFRESH_TOKEN_COOKIE_NAME', 'refresh_token')

    access_token_path = getattr(settings, 'JWT_ACCESS_TOKEN_COOKIE_PATH')
    refresh_token_path = getattr(settings, 'JWT_REFRESH_TOKEN_COOKIE_PATH')

    response.set_cookie(
        key=access_token_cookie_name,
        value=access_token,
        expires=timezone.now() + access_token_lifetime,
        secure=cookie_secure,
        httponly=cookie_httponly,
        samesite=cookie_samesite,
        path=access_token_path
    )
    if refresh_token:  # refresh token might not always be set (e.g. if not rotated)
        response.set_cookie(
            key=refresh_token_cookie_name,
            value=refresh_token,
            expires=timezone.now() + refresh_token_lifetime,
            secure=cookie_secure,
            httponly=cookie_httponly,
            samesite=cookie_samesite,
            path=refresh_token_path 
        )

def clear_auth_cookies(response):
    """
    Clears the access and refresh token cookies from the response.
    Uses paths from settings to ensure correct cookie deletion.
    """
    access_token_cookie_name = getattr(settings, 'ACCESS_TOKEN_COOKIE_NAME', 'access_token')
    refresh_token_cookie_name = getattr(settings, 'REFRESH_TOKEN_COOKIE_NAME', 'refresh_token')
    access_token_path = getattr(settings, 'JWT_ACCESS_TOKEN_COOKIE_PATH')
    refresh_token_path = getattr(settings, 'JWT_REFRESH_TOKEN_COOKIE_PATH')

    response.delete_cookie(
        key=access_token_cookie_name,
        path=access_token_path
    )
    response.delete_cookie(
        key=refresh_token_cookie_name,
        path=refresh_token_path
    )


def _handle_successful_auth(request, validated_data):
    """
    Handles the common logic for a successful authentication (login or refresh).
    Constructs the response, sets cookies, and logs the success.
    """
    access_token = validated_data.get('access')
    refresh_token = validated_data.get('refresh')
    user_data = validated_data.get('user')

    if not access_token or not user_data:
        logger.error("Access token or user_data not found in validated_data after successful auth.")
        return Response(
            {"detail": "Authentication failed; could not generate tokens or user data."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    response = Response({'user': user_data}, status=status.HTTP_200_OK)
    set_auth_cookies(response, access_token, refresh_token)
    
    # Determine username for logging, handling both login (user not yet on request) and refresh.
    username_for_log = user_data.get('username', 'N/A')
    logger.info(f"Authentication successful for user '{username_for_log}'.")
    return response


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            logger.warning(f"Token generation failed during login: {str(e)}")
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        return _handle_successful_auth(request, serializer.validated_data)


class CustomTokenRefreshView(BaseTokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer

    def post(self, request, *args, **kwargs):
        refresh_token_cookie_name = getattr(settings, 'REFRESH_TOKEN_COOKIE_NAME', 'refresh_token')
        refresh_token_value = request.COOKIES.get(refresh_token_cookie_name)

        if not refresh_token_value:
            return Response({"detail": "Refresh token not found in cookie."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = self.get_serializer(data={'refresh': refresh_token_value})

        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            logger.warning(f"Token refresh failed: {str(e)}")
            error_response = Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
            clear_auth_cookies(error_response)
            return error_response
        except Exception as e:
            logger.error(f"Unexpected error during token refresh validation: {str(e)}", exc_info=True)
            return Response({"detail": "An unexpected error occurred during token refresh."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return _handle_successful_auth(request, serializer.validated_data)



class ApiRootView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, format=None):
        available_endpoints = {
            'register': '/api/register/',
            'login': '/api/login/',
            'token_refresh': '/api/token/refresh/',
            'logout': '/api/logout/',
            'predict': '/api/predict/',
            'prediction_history': '/api/predictions/',
            'dropdown_options': '/api/dropdown_options/',
            'brand_model_mapping': '/api/brand_model_mapping/',
        }
        return Response(available_endpoints, status=status.HTTP_200_OK)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        serializer = UserSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except serializers.ValidationError as e:
            logger.warning(f"User registration failed: {e.detail}")
            raise e


class UserDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        response = Response({"detail": "Logout successful."}, status=status.HTTP_200_OK)
        
        refresh_token_cookie_name = getattr(settings, 'REFRESH_TOKEN_COOKIE_NAME', 'refresh_token')
        refresh_token_value = request.COOKIES.get(refresh_token_cookie_name)

        if refresh_token_value:
            try:
                token = RefreshToken(refresh_token_value)
                token.blacklist()
                logger.info(f"User {request.user.username} logged out successfully and token blacklisted.")
            except TokenError as e:
                logger.warning(f"Token error during logout for user {request.user.username if request.user else 'Unknown'}: {str(e)}. Proceeding to clear cookies.")
            except Exception as e:
                logger.error(f"Unexpected error during token blacklisting for user {request.user.username if request.user else 'Unknown'} logout: {str(e)}", exc_info=True)
        else:
            logger.warning(f"Logout attempt by user {request.user.username if request.user else 'Unknown'} without a refresh token cookie.")

        clear_auth_cookies(response)
        return response

class PredictPriceView(APIView):
    permission_classes = [AllowAny]  # allow both guest and authenticated users

    def post(self, request, format=None):
        try:
            serializer = PredictionInputSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            input_data = serializer.validated_data
            predicted_price = get_price_prediction(input_data)

            if request.user.is_authenticated:
                # for authenticated users, create and save prediction
                prediction = Prediction.objects.create(
                    user=request.user,
                    predicted_price=predicted_price,
                    **input_data
                )
                output_serializer = PredictionOutputSerializer(prediction)
                return Response(output_serializer.data, status=status.HTTP_201_CREATED)
            else:
                # for guest users, return prediction without saving
                result = {
                    'predicted_price': predicted_price,
                    'timestamp': timezone.now().isoformat(),
                    **input_data
                }
                return Response(result, status=status.HTTP_200_OK)

        except serializers.ValidationError as e:
            logger.warning(f"Prediction request failed validation: {e.detail}")
            raise e
        except ValueError as e:
            logger.warning(f"Validation error in prediction: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}", exc_info=True)
            return Response(
                {"error": "Error processing your request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PredictionHistoryView(APIView):
    """
    API view for retrieving user's prediction history.
    Supports pagination, sorting, and filtering by various criteria.
    """
    permission_classes = [IsAuthenticated]
    default_page_size = 10
    max_page_size = 100

    def _get_filters_from_params(self, params):
        """
        Parses, validates, and converts query parameters into a dictionary of ORM filters.
        Raises a ValidationError if any parameter is invalid.
        """
        filters = {}
        errors = {}

        # Date range validation
        start_date_str = params.get('start_date')
        if start_date_str:
            try:
                filters['timestamp__date__gte'] = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                errors['start_date'] = "Invalid format. Use YYYY-MM-DD."

        end_date_str = params.get('end_date')
        if end_date_str:
            try:
                filters['timestamp__date__lte'] = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                errors['end_date'] = "Invalid format. Use YYYY-MM-DD."

        # Price range validation
        min_price_str = params.get('min_price')
        if min_price_str:
            try:
                filters['predicted_price__gte'] = float(min_price_str)
            except (ValueError, TypeError):
                errors['min_price'] = "Invalid format. Must be a number."

        max_price_str = params.get('max_price')
        if max_price_str:
            try:
                filters['predicted_price__lte'] = float(max_price_str)
            except (ValueError, TypeError):
                errors['max_price'] = "Invalid format. Must be a number."

        # Text search filters (no validation needed)
        if 'brand' in params:
            filters['brand__iexact'] = params.get('brand')
        if 'car_model' in params:
            filters['car_model__icontains'] = params.get('car_model')

        if errors:
            raise serializers.ValidationError(errors)

        return filters

    def get(self, request):
        """
        Handles GET requests to retrieve a paginated, filtered, and sorted list
        of the user's prediction history.
        """
        try:
            params = request.query_params
            errors = {}

            # Validate pagination parameters
            try:
                page_size = int(params.get('page_size', self.default_page_size))
                if page_size <= 0:
                    errors['page_size'] = "Page size must be a positive integer."
                elif page_size > self.max_page_size:
                    page_size = self.max_page_size
            except (ValueError, TypeError):
                errors['page_size'] = "Invalid format. Must be an integer."

            try:
                page_number = int(params.get('page', '1'))
                if page_number <= 0:
                    errors['page'] = "Page number must be a positive integer."
            except (ValueError, TypeError):
                errors['page'] = "Invalid format. Must be an integer."

            # Validate sort parameter
            sort = params.get('sort', '-timestamp')
            valid_sort_fields = {'timestamp', '-timestamp', 'predicted_price', '-predicted_price'}
            if sort not in valid_sort_fields:
                errors['sort'] = f"Invalid sort field. Use one of: {', '.join(valid_sort_fields)}."

            # Get and validate field filters
            try:
                filters = self._get_filters_from_params(params)
            except serializers.ValidationError as e:
                errors.update(e.detail)

            if errors:
                raise serializers.ValidationError(errors)

            # Build and filter queryset
            queryset = Prediction.objects.filter(user=request.user, **filters).order_by(sort)

            # Paginate the queryset
            paginator = Paginator(queryset, page_size)
            try:
                predictions_page = paginator.page(page_number)
            except EmptyPage:
                raise serializers.ValidationError({"page": f"Page {page_number} is out of range. Last page is {paginator.num_pages}."})

            # Serialize and build the final response
            serializer = PredictionOutputSerializer(predictions_page, many=True)
            response_data = {
                'count': paginator.count,
                'total_pages': paginator.num_pages,
                'current_page': page_number,
                'page_size': page_size,
                'sort': sort,
                'filters': {
                    key: params.get(key)
                    for key in ['start_date', 'end_date', 'min_price', 'max_price', 'brand', 'car_model']
                    if key in params
                },
                'results': serializer.data
            }
            return Response(response_data, status=status.HTTP_200_OK)

        except serializers.ValidationError as e:
            logger.warning(f"Invalid query parameter in prediction history: {e.detail}")
            return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in PredictionHistoryView: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while fetching predictions"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class DropdownOptionsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            # load cached data if available
            cache_key = 'dropdown_options'
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            # fetch distinct values from the CarListing model
            brands = sorted(CarListing.objects.values_list('brand', flat=True).distinct())
            car_models = sorted(CarListing.objects.values_list('car_model', flat=True).distinct())
            fuel_types = sorted(CarListing.objects.values_list('fuel_type', flat=True).distinct())
            transmissions = sorted(CarListing.objects.values_list('transmission', flat=True).distinct())
            bodies = sorted(CarListing.objects.values_list('body', flat=True).distinct())
            colors = sorted(CarListing.objects.values_list('color', flat=True).distinct())

            # fetch min/max values
            year_range = CarListing.objects.aggregate(min=Min('year_of_production'), max=Max('year_of_production'))
            doors_range = CarListing.objects.aggregate(min=Min('number_of_doors'), max=Max('number_of_doors'))

            unique_options = {
                'brand': brands,
                'car_model': car_models,
                'year_of_production': {
                    'min': year_range['min'],
                    'max': year_range['max']
                },
                'fuel_type': fuel_types,
                'transmission': transmissions,
                'body': bodies,
                'number_of_doors': {
                    'min': doors_range['min'],
                    'max': doors_range['max']
                },
                'color': colors,
            }

            # save in cache for 1 hour
            cache.set(cache_key, unique_options, timeout=3600)

            return Response(unique_options, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error retrieving dropdown options: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while retrieving filter options"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BrandModelMappingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            # load cached data if available
            cache_key = 'brand_model_mapping'
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)

            # get unique brand-model pairs from the database
            brand_model_pairs = (
                CarListing.objects
                .values_list('brand', 'car_model')
                .distinct()
                .order_by('brand', 'car_model')
            )

            # transform data to format {brand: [models]}
            mapping = {}
            for brand, model in brand_model_pairs:
                if brand and model:  # ignore empty values
                    if brand not in mapping:
                        mapping[brand] = []
                    mapping[brand].append(model)

            # sort models for each brand
            for brand in mapping:
                mapping[brand].sort()

            # save in cache for 24 hours (rarely changes)
            cache.set(cache_key, mapping, timeout=86400)

            return Response(mapping, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error retrieving brand-model mapping: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while retrieving brand-model mapping"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )