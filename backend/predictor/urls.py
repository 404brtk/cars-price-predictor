from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, 
    LogoutView, 
    ApiRootView, 
    PredictPriceView, 
    GuestPredictPriceView, 
    PredictionHistoryView, 
    DropdownOptionsView, 
    BrandModelMappingView
)

urlpatterns = [
    # root
    path('', ApiRootView.as_view(), name='api_root'),
    
    # auth
    path('api/register/', RegisterView.as_view(), name='register'),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/logout/', LogoutView.as_view(), name='logout'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # predictions
    path('api/predict/', PredictPriceView.as_view(), name='predict'),
    path('api/predict/guest/', GuestPredictPriceView.as_view(), name='predict_guest'),
    path('api/predictions/', PredictionHistoryView.as_view(), name='prediction_history'),
    path('api/dropdown_options/', DropdownOptionsView.as_view(), name='dropdown_options'),
    path('api/brand_model_mapping/', BrandModelMappingView.as_view(), name='brand_model_mapping'),
]