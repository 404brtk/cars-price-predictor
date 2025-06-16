from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Prediction

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email', 'first_name', 'last_name')
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
            'email': {'required': True}
        }

    def validate(self, attrs):
        # ensure both password fields match
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields do not match."})
        
        # check if username is unique
        if User.objects.filter(username=attrs['username']).exists():
            raise serializers.ValidationError({"username": "An account with this username already exists."}) 
        
        # check if email is unique
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "An account with this email already exists."})
        
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2', None)
        user = User.objects.create(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user




class PredictionInputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = [
            'brand', 'car_model', 'year_of_production', 'mileage',
            'fuel_type', 'transmission', 'body', 'engine_capacity',
            'power', 'number_of_doors', 'color'
        ]

class GuestPredictionOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = [
            'brand', 'car_model', 'year_of_production', 'mileage',
            'fuel_type', 'transmission', 'body', 'engine_capacity',
            'power', 'number_of_doors', 'color', 'predicted_price', 'timestamp'
        ]
        read_only_fields = ['predicted_price', 'timestamp']


class PredictionOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = '__all__'
        read_only_fields = ['id', 'user', 'predicted_price', 'timestamp']


