from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, 
    LogoutView, 
    ApiRootView, 
    PredictPriceView, 
    PredictionHistoryView, 
    DropdownOptionsView, 
    BrandModelMappingView
)

urlpatterns = [
    # root
    path('', ApiRootView.as_view(), name='api_root'),
    
    # auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # predictions
    path('predict/', PredictPriceView.as_view(), name='predict'),
    path('predictions/', PredictionHistoryView.as_view(), name='prediction_history'),
    path('dropdown_options/', DropdownOptionsView.as_view(), name='dropdown_options'),
    path('brand_model_mapping/', BrandModelMappingView.as_view(), name='brand_model_mapping'),
]