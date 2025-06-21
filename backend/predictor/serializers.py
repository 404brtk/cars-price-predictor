from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from .models import Prediction
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer as BaseTokenObtainPairSerializer, TokenRefreshSerializer as BaseTokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

class UserDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class CustomTokenObtainPairSerializer(BaseTokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # add custom claims to the token payload.
        token['username'] = user.username
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)

        user_serializer = UserDetailSerializer(self.user, context=self.context)
        data['user'] = user_serializer.data
        return data


class CustomTokenRefreshSerializer(BaseTokenRefreshSerializer):

    def validate(self, attrs):
        data = super().validate(attrs)

        refresh = RefreshToken(attrs['refresh'])
        user_id = refresh.get('user_id')

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError('No user found for this token.')
        user_serializer = UserDetailSerializer(user, context=self.context)
        data['user'] = user_serializer.data

        return data


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ('username', 'password', 'password2', 'email')
        extra_kwargs = {
            'email': {'required': True}
        }

    def validate(self, attrs):
        # check for unknown fields
        allowed_fields = set(self.Meta.fields)
        received_fields = set(self.initial_data.keys())
        unknown_fields = received_fields - allowed_fields
        if unknown_fields:
            raise serializers.ValidationError({field: "This field is not allowed." for field in unknown_fields})

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
        )
        user.set_password(validated_data['password'])
        user.save()
        return user


class PredictionInputSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        # check for unknown fields
        allowed_fields = set(self.Meta.fields)
        received_fields = set(self.initial_data.keys())
        unknown_fields = received_fields - allowed_fields
        if unknown_fields:
            raise serializers.ValidationError({field: "This field is not allowed." for field in unknown_fields})
        return attrs

    class Meta:
        model = Prediction
        fields = [
            'brand', 'car_model', 'year_of_production', 'mileage',
            'fuel_type', 'transmission', 'body', 'engine_capacity',
            'power', 'number_of_doors', 'color'
        ]


class PredictionOutputSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prediction
        fields = '__all__'
        read_only_fields = ['id', 'user', 'predicted_price', 'timestamp']


