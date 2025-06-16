from django.db import models
from django.contrib.auth.models import User

class Prediction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)  # null if guest
    brand = models.CharField(max_length=100)
    car_model = models.CharField(max_length=100)
    year_of_production = models.IntegerField(min_value=1900, max_value=2100)
    mileage = models.IntegerField(min_value=0) # [km]
    fuel_type = models.CharField(max_length=50)
    transmission = models.CharField(max_length=50)
    body = models.CharField(max_length=50)  
    engine_capacity = models.FloatField(min_value=0.0) # [dm3]
    power = models.IntegerField(min_value=0) # [hp]
    number_of_doors = models.IntegerField(min_value=1, max_value=10)
    color = models.CharField(max_length=50)
    predicted_price = models.FloatField(null=True, blank=True)  # filled after prediction
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.brand} {self.car_model} ({self.year_of_production}) - {self.predicted_price}"
    
    class Meta:
        ordering = ['-timestamp']
    