from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


class CarListing(models.Model):
    """
    Represents a car listing from the dataset.
    This model stores the raw data used for training the prediction model
    and for populating dropdowns in the UI.
    """
    brand = models.CharField(max_length=100)
    car_model = models.CharField(max_length=100)
    year_of_production = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2100)])
    mileage = models.IntegerField(validators=[MinValueValidator(0)]) # [km]
    fuel_type = models.CharField(max_length=50)
    transmission = models.CharField(max_length=50)
    body = models.CharField(max_length=50)
    engine_capacity = models.FloatField(validators=[MinValueValidator(0.0)]) # [dm3]
    power = models.FloatField(validators=[MinValueValidator(0.0)]) # [hp]
    number_of_doors = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    color = models.CharField(max_length=50)
    price = models.FloatField()

    def __str__(self):
        return f"{self.brand} {self.car_model} ({self.year_of_production})"


class Prediction(models.Model):
    """
    Represents a price prediction made by a user.
    This model stores the inputs provided by the user and the resulting
    predicted price.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)  # null if guest
    brand = models.CharField(max_length=100)
    car_model = models.CharField(max_length=100)
    year_of_production = models.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2100)])
    mileage = models.IntegerField(validators=[MinValueValidator(0)]) # [km]
    fuel_type = models.CharField(max_length=50)
    transmission = models.CharField(max_length=50)
    body = models.CharField(max_length=50)
    engine_capacity = models.FloatField(validators=[MinValueValidator(0.0)]) # [dm3]
    power = models.FloatField(validators=[MinValueValidator(0.0)]) # [hp]
    number_of_doors = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(10)])
    color = models.CharField(max_length=50)
    predicted_price = models.FloatField(null=True, blank=True)  # filled after prediction
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.brand} {self.car_model} ({self.year_of_production}) - {self.predicted_price}"

    class Meta:
        ordering = ['-timestamp']    