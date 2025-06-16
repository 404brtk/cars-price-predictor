from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import status
from .models import Prediction
from .ml_service import get_price_prediction
from cars_price_predictor.settings import DATA_PATH
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.utils import timezone
from django.core.cache import cache
import logging
import os
import pandas as pd
from .serializers import (
    UserSerializer,
    PredictionInputSerializer,
    GuestPredictionOutputSerializer,
    PredictionOutputSerializer,
)


logger = logging.getLogger(__name__)


class ApiRootView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request, format=None):
        available_endpoints = {
            'register': '/api/register/',
            'login': '/api/login/',
            'token_refresh': '/api/token/refresh/',
            'logout': '/api/logout/',
            'predict': '/api/predict/',
            'predict_guest': '/api/predict/guest/',
            'prediction_history': '/api/predictions/',
            'dropdown_options': '/api/dropdown_options/',
            'brand_model_mapping': '/api/brand_model_mapping/',
        }
        return Response({
            'status': 'ok',
            'message': 'Used Cars Price Predictor API',
            'endpoints': available_endpoints,
        })


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, format=None):
        serializer = UserSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(
                {"error": "Invalid token or no refresh token provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

class PredictPriceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, format=None):
        serializer = PredictionInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            input_data = serializer.validated_data
            predicted_price = get_price_prediction(input_data)
            
            # create and save prediction to database
            prediction = Prediction.objects.create(
                user=request.user,
                predicted_price=predicted_price,
                **input_data
            )
            
            output_serializer = PredictionOutputSerializer(prediction)
            return Response(output_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}", exc_info=True)
            return Response(
                {"error": "Error processing your request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GuestPredictPriceView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = PredictionInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            input_data = serializer.validated_data
            predicted_price = get_price_prediction(input_data)
            
            # return the prediction without saving to database
            result = {
                'predicted_price': predicted_price,
                'timestamp': timezone.now().isoformat(),
                **input_data
            }
            return Response(result, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Guest prediction failed: {str(e)}", exc_info=True)
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
    - model: Filter by car model (case-insensitive)
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
                pass
                
        if end_date:
            try:
                end = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(timestamp__date__lte=end)
            except ValueError:
                pass
        
        # price range filtering
        min_price = request.query_params.get('min_price')
        max_price = request.query_params.get('max_price')
        
        if min_price:
            try:
                queryset = queryset.filter(predicted_price__gte=float(min_price))
            except (ValueError, TypeError):
                pass
                
        if max_price:
            try:
                queryset = queryset.filter(predicted_price__lte=float(max_price))
            except (ValueError, TypeError):
                pass
        
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
            page_size = min(
                int(request.query_params.get('page_size', self.default_page_size)),
                self.max_page_size
            )
        except (ValueError, TypeError):
            page_size = self.default_page_size

        paginator = Paginator(queryset, page_size)
        
        try:
            page = int(request.query_params.get('page', 1))
            predictions = paginator.page(page)
        except (PageNotAnInteger, EmptyPage):
            page = 1
            predictions = paginator.page(1)

        serializer = PredictionOutputSerializer(predictions, many=True)
        
        return {
            'count': paginator.count,
            'total_pages': paginator.num_pages,
            'current_page': page,
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

        return Response(response_data)

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
            csv_path = DATA_PATH
            if not os.path.exists(csv_path):
                logger.error(f"CSV file not found at {csv_path}")
                raise FileNotFoundError("Configuration error: Data file not found")
            
            # load data from cache if available
            cache_key = 'dropdown_options'
            cached_data = cache.get(cache_key)
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)
            
            # load data from csv
            df = pd.read_csv(csv_path)
            
            required_columns = [
                'brand', 'car_model', 'year_of_production', 
                'fuel_type', 'transmission', 'body', 
                'number_of_doors', 'color'
            ]
            
            missing_columns = [col for col in required_columns if col not in df.columns]
            if missing_columns:
                raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
            
            unique_options = {
                'brand': sorted(df['brand'].dropna().unique().tolist()),
                'car_model': sorted(df['car_model'].dropna().unique().tolist()),
                'year_of_production': {
                    'min': int(df['year_of_production'].min()),
                    'max': int(df['year_of_production'].max())
                },
                'fuel_type': sorted(df['fuel_type'].dropna().unique().tolist()),
                'transmission': sorted(df['transmission'].dropna().unique().tolist()),
                'body': sorted(df['body'].dropna().unique().tolist()),
                'number_of_doors': {
                    'min': int(df['number_of_doors'].min()),
                    'max': int(df['number_of_doors'].max())
                },
                'color': sorted(df['color'].dropna().unique().tolist()),
            }
            
            # save in cache for 1 hour
            cache.set(cache_key, unique_options, timeout=3600)
            
            return Response(unique_options, status=status.HTTP_200_OK)
            
        except FileNotFoundError as e:
            logger.error(f"File not found: {str(e)}")
            return Response(
                {"error": "Configuration error: Data file not found"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
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
            csv_path = DATA_PATH
            if not os.path.exists(csv_path):
                logger.error(f"CSV file not found at {csv_path}")
                raise FileNotFoundError("Configuration error: Data file not found")
                
            cache_key = 'brand_model_mapping'
            cached_data = cache.get(cache_key)
            
            if cached_data:
                return Response(cached_data, status=status.HTTP_200_OK)
            '''
            # get unique brand-model pairs from database
            brand_model_pairs = (
                Prediction.objects
                .values_list('brand', 'car_model')
                .distinct()
                .order_by('brand', 'car_model')
            )
            '''
            df = pd.read_csv(csv_path)
            brand_model_pairs = df[['brand', 'car_model']].drop_duplicates().values.tolist()
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