from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.models import User
from .models import Prediction

class PredictionAdmin(admin.ModelAdmin):
    list_display = ('brand', 'car_model', 'year_of_production', 'predicted_price', 'user', 'timestamp')
    list_filter = ('brand', 'fuel_type', 'transmission', 'body', 'number_of_doors', 'color')
    search_fields = ('brand', 'car_model', 'user__username')
    readonly_fields = ('timestamp',)
    list_per_page = 25
    
    fieldsets = (
        ('Car Information', {
            'fields': ('brand', 'car_model', 'year_of_production', 'mileage', 'engine_capacity', 'power')
        }),
        ('Specifications', {
            'fields': ('fuel_type', 'transmission', 'body', 'number_of_doors', 'color')
        }),
        ('Prediction Data', {
            'fields': ('predicted_price', 'user', 'timestamp')
        }),
    )
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user=request.user)

# register the admin class with the associated model
admin.site.register(Prediction, PredictionAdmin)

# unregister the default User admin and register a custom one if needed
admin.site.unregister(User)

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'is_staff')
    list_filter = ('is_staff', 'is_superuser', 'is_active', 'groups')
    search_fields = ('username', 'first_name', 'last_name', 'email')
