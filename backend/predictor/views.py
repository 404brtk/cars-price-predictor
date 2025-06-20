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
    CustomTokenObtainPairSerializer
)



logger = logging.getLogger(__name__)

# helper functions for cookie management
def set_auth_cookies(response, access_token, refresh_token):
    access_token_lifetime = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME']
    refresh_token_lifetime = settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
    cookie_path = getattr(settings, 'JWT_COOKIE_PATH', '/api/')
    cookie_secure = getattr(settings, 'JWT_COOKIE_SECURE', not settings.DEBUG)
    cookie_httponly = getattr(settings, 'JWT_COOKIE_HTTPONLY', True)
    cookie_samesite = getattr(settings, 'JWT_COOKIE_SAMESITE', 'Lax')
    access_token_cookie_name = getattr(settings, 'ACCESS_TOKEN_COOKIE_NAME', 'access_token')
    refresh_token_cookie_name = getattr(settings, 'REFRESH_TOKEN_COOKIE_NAME', 'refresh_token')

    response.set_cookie(
        key=access_token_cookie_name,
        value=access_token,
        expires=timezone.now() + access_token_lifetime,
        secure=cookie_secure,
        httponly=cookie_httponly,
        samesite=cookie_samesite,
        path=cookie_path
    )
    if refresh_token: # refresh token might not always be set (e.g. if not rotated)
        response.set_cookie(
            key=refresh_token_cookie_name,
            value=refresh_token,
            expires=timezone.now() + refresh_token_lifetime,
            secure=cookie_secure,
            httponly=cookie_httponly,
            samesite=cookie_samesite,
            path=cookie_path # possible improvement: change it later to /api/token/refresh for example so it's not accessible from any endpoint
        )

def clear_auth_cookies(response):
    cookie_path = getattr(settings, 'JWT_COOKIE_PATH', '/api/')
    access_token_cookie_name = getattr(settings, 'ACCESS_TOKEN_COOKIE_NAME', 'access_token')
    refresh_token_cookie_name = getattr(settings, 'REFRESH_TOKEN_COOKIE_NAME', 'refresh_token')
    response.delete_cookie(
        key=access_token_cookie_name,
        path=cookie_path
    )
    response.delete_cookie(
        key=refresh_token_cookie_name,
        path=cookie_path
    )


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except TokenError as e:
            logger.warning(f"Token generation failed during login: {str(e)}")
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
        except serializers.ValidationError as e:
            # ensure error details are properly formatted for the response
            error_detail = e.detail
            if isinstance(error_detail, list) and error_detail:
                error_detail = error_detail[0] # take the first error message if it's a list
            elif isinstance(error_detail, dict) and 'detail' in error_detail:
                 error_detail = error_detail['detail']

            logger.warning(f"Login validation error: {error_detail}")
            return Response({"detail": error_detail if isinstance(error_detail, str) else "Invalid credentials."}, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        access_token = validated_data.get('access')
        refresh_token = validated_data.get('refresh')
        user_data = validated_data.get('user') # this comes from CustomTokenObtainPairSerializer

        if not access_token or not refresh_token:
            logger.error("Tokens not found in validated_data after successful login.")
            return Response(
                {"detail": "Login failed; could not generate tokens."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # prepare response: by default, return user data from the serializer
        # if no specific user_data is prepared by serializer, a generic success message can be used.
        response_data = user_data if user_data else {"detail": "Login successful."}
        response = Response(response_data, status=status.HTTP_200_OK)
        
        set_auth_cookies(response, access_token, refresh_token)
        
        username_for_log = request.data.get('username', 'N/A') # get username for logging
        logger.info(f"User '{username_for_log}' logged in successfully.")
        return response


class CustomTokenRefreshView(BaseTokenRefreshView):
    def post(self, request, *args, **kwargs):
        refresh_token_cookie_name = getattr(settings, 'REFRESH_TOKEN_COOKIE_NAME', 'refresh_token')
        refresh_token_value = request.COOKIES.get(refresh_token_cookie_name)

        if not refresh_token_value:
            logger.warning("Token refresh attempt without a refresh token cookie.")
            return Response(
                {"detail": "Refresh token not found in cookie."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )

        # the parent TokenRefreshView expects the refresh token in request.data
        # we need to temporarily place it there if it's coming from a cookie.
        mutable_data = request.data.copy() # make it mutable if it's a QueryDict
        mutable_data['refresh'] = refresh_token_value
        
        # create a new request object with the modified data, or modify request.data directly if safe
        # for simplicity, I'll modify request.data if it's a standard DRF Request object's data dict
        original_data = request.data
        request._data = mutable_data # temporarily override request.data

        try:
            response = super().post(request, *args, **kwargs)
        except TokenError as e:
            logger.warning(f"Token refresh failed: {str(e)}")
            # ensure cookies are cleared if refresh token is invalid/blacklisted by the server
            # as the client might still have it.
            error_response = Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)
            if "blacklisted" in str(e).lower() or "invalid" in str(e).lower():
                 clear_auth_cookies(error_response) # clear cookies if token is definitively bad
            return error_response
        except Exception as e:
            logger.error(f"Unexpected error during token refresh: {str(e)}", exc_info=True)
            return Response(
                {"detail": "An unexpected error occurred during token refresh."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        finally:
            request._data = original_data # restore original request.data

        if response.status_code == status.HTTP_200_OK:
            access_token = response.data.get('access')
            # SIMPLE_JWT may or may not return a new refresh token depending on ROTATE_REFRESH_TOKENS
            new_refresh_token = response.data.get('refresh') 

            if not access_token:
                logger.error("New access token not found in refresh response.")
                # this case should ideally not happen if super().post() was successful (200 OK)
                return Response(
                    {"detail": "Failed to refresh token; new access token not provided."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # prepare a new response that doesn't include tokens in the body
            # the user is already authenticated if they are refreshing, so no user data needed here.
            final_response = Response({"detail": "Access token refreshed successfully."}, status=status.HTTP_200_OK)
            set_auth_cookies(final_response, access_token, new_refresh_token) # new_refresh_token can be None
            
            logger.info(f"Access token refreshed successfully for user {request.user.username if request.user and request.user.is_authenticated else 'Unknown'}.")
            return final_response
        else:
            # if super().post() did not return 200 OK, it might have already set an error response.
            # we should clear cookies if the refresh attempt failed definitively due to an invalid token.
            # for example, if the refresh token itself was invalid, simplejwt might return 401.
            if response.status_code == status.HTTP_401_UNAUTHORIZED:
                logger.warning(f"Token refresh returned {response.status_code} for user {request.user.username if request.user and request.user.is_authenticated else 'Unknown'}. Clearing cookies.")
                clear_auth_cookies(response) # modify the original error response to clear cookies
            return response



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
    
    Query Parameters:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 10, max: 100)
    - sort: Field to sort by (default: -timestamp)
            Options: timestamp, -timestamp, predicted_price, -predicted_price
    - start_date: Filter predictions after this date (YYYY-MM-DD)
    - end_date: Filter predictions before this date (YYYY-MM-DD)
    - min_price: Minimum predicted price
    - max_price: Maximum predicted price
    - brand: Filter by car brand (case-insensitive)
    - car_model: Filter by car model (case-insensitive)
    """
    permission_classes = [IsAuthenticated]
    default_page_size = 10
    max_page_size = 100

    def get_queryset(self, request):
        queryset = Prediction.objects.filter(user=request.user)
        
        # date range filtering
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        if start_date:
            try:
                start = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__gte=start)
            except ValueError:
                raise serializers.ValidationError({"start_date": "Invalid format. Use YYYY-MM-DD."})
                
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__lte=end)
            except ValueError:
                raise serializers.ValidationError({"end_date": "Invalid format. Use YYYY-MM-DD."})
        
        # price range filtering
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        
        if min_price:
            try:
                queryset = queryset.filter(predicted_price__gte=float(min_price))
            except (ValueError, TypeError):
                raise serializers.ValidationError({"min_price": "Invalid format. Must be a number."})
                
        if max_price:
            try:
                queryset = queryset.filter(predicted_price__lte=float(max_price))
            except (ValueError, TypeError):
                raise serializers.ValidationError({"max_price": "Invalid format. Must be a number."})
        
        # text search filtering
        brand = request.query_params.get('brand')
        if brand:
            queryset = queryset.filter(brand__iexact=brand)
            
        car_model = request.query_params.get('car_model')
        if car_model:
            queryset = queryset.filter(car_model__icontains=car_model)
            
        return queryset

    def get_paginated_response(self, queryset, request):
        # get pagination parameters
        try:
            page_size = int(request.query_params.get('page_size', self.default_page_size))
        except (ValueError, TypeError):
            raise serializers.ValidationError({"page_size": "Invalid format. Must be an integer."})

        if page_size > self.max_page_size:
            page_size = self.max_page_size

        paginator = Paginator(queryset, page_size)
        
        page_number_str = request.query_params.get('page', '1')
        try:
            page_number = int(page_number_str)
            predictions = paginator.page(page_number)
        except (ValueError, TypeError):
            raise serializers.ValidationError({"page": "Invalid format. Must be an integer."})
        except EmptyPage:
            # if page is out of range, return a specific error
            raise serializers.ValidationError({"page": f"Page {page_number_str} is out of range. Last page is {paginator.num_pages}."})

        serializer = PredictionOutputSerializer(predictions, many=True)
        
        return {
            'count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page_number,
            'page_size': page_size,
            'results': serializer.data
        }

    def get(self, request):
        try:
            # get and validate sort parameter
            sort = request.query_params.get('sort')
            valid_sort_fields = {
                'timestamp', '-timestamp', 
                'predicted_price', '-predicted_price'
            }
            
            # get filtered queryset
            queryset = self.get_queryset(request)
            
            # apply sorting only if sort parameter is provided and valid
            if sort and sort in valid_sort_fields:
                queryset = queryset.order_by(sort)
                response_data = self.get_paginated_response(queryset, request)
                response_data['sort'] = sort
            else:
                response_data = self.get_paginated_response(queryset, request)
            
            # add filter metadata
            response_data['filters'] = {
                key: request.query_params.get(key)
                for key in ['start_date', 'end_date', 'min_price', 'max_price', 'brand', 'car_model']
                if key in request.query_params
            }

            return Response(response_data, status=status.HTTP_200_OK)

        except serializers.ValidationError as e:
            logger.warning(f"Invalid query parameter in prediction history: {e.detail}")
            raise e
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