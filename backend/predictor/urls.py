from django.urls import path
from .views import (
    RegisterView, 
    LogoutView, 
    ApiRootView, 
    PredictPriceView, 
    PredictionHistoryView, 
    DropdownOptionsView, 
    BrandModelMappingView,
    CustomTokenObtainPairView,
    CustomTokenRefreshView,
    UserDetailView
)

urlpatterns = [
    # root
    path('', ApiRootView.as_view(), name='api_root'),
    
    # auth
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('users/me/', UserDetailView.as_view(), name='user_detail'),
    
    # predictions
    path('predict/', PredictPriceView.as_view(), name='predict'),
    path('predictions/', PredictionHistoryView.as_view(), name='prediction_history'),
    path('dropdown_options/', DropdownOptionsView.as_view(), name='dropdown_options'),
    path('brand_model_mapping/', BrandModelMappingView.as_view(), name='brand_model_mapping'),
]