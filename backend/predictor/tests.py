import json
from unittest.mock import patch
from django.contrib.auth.models import User
from django.urls import reverse
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework import status
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta

from .models import CarListing, Prediction


class UserAuthTests(APITestCase):
    """
    Tests for user registration, login, logout, and token management.
    """
    @classmethod
    def setUpTestData(cls):
        # Create a user to test against for duplicates and for login tests
        cls.existing_user = User.objects.create_user(username='existinguser', email='existing@example.com', password='password123')

    def setUp(self):
        self.register_url = reverse('register')
        self.login_url = reverse('login')
        self.logout_url = reverse('logout')
        self.user_detail_url = reverse('user_detail')
        self.refresh_url = reverse('token_refresh')

        self.new_user_data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'newpassword123',
            'password2': 'newpassword123',
        }

    def test_user_registration_success(self):
        """Ensure new users can register successfully."""
        response = self.client.post(self.register_url, self.new_user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())

    def test_user_registration_mismatched_passwords(self):
        """Ensure registration fails if passwords do not match."""
        data = self.new_user_data.copy()
        data['password2'] = 'wrongpassword'
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_user_registration_duplicate_username(self):
        """Ensure registration fails with a duplicate username."""
        data = self.new_user_data.copy()
        data['username'] = 'existinguser'  # Use the existing username
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_user_registration_duplicate_email(self):
        """Ensure registration fails with a duplicate email."""
        data = self.new_user_data.copy()
        data['email'] = 'existing@example.com'  # Use the existing email
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_user_login_and_cookie_setting(self):
        """Ensure user can log in and auth cookies are set."""
        login_data = {'username': 'existinguser', 'password': 'password123'}
        response = self.client.post(self.login_url, login_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', response.cookies)
        self.assertIn('refresh_token', response.cookies)
        self.assertEqual(response.data['user']['username'], 'existinguser')

    def test_user_logout_and_cookie_clearing(self):
        """Ensure user can log out and auth cookies are cleared."""
        self.client.force_authenticate(user=self.existing_user)

        # Simulate login to get cookies
        login_data = {'username': 'existinguser', 'password': 'password123'}
        login_response = self.client.post(self.login_url, login_data, format='json')
        self.client.cookies = login_response.cookies

        response = self.client.post(self.logout_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.cookies['access_token'].value, '')
        self.assertEqual(response.cookies['refresh_token'].value, '')

    def test_access_protected_endpoint_with_token(self):
        """Ensure authenticated users can access protected views."""
        self.client.force_authenticate(user=self.existing_user)

        response = self.client.get(self.user_detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'existinguser')

    def test_access_protected_endpoint_without_token(self):
        """Ensure unauthenticated users are denied access."""
        response = self.client.get(self.user_detail_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh(self):
        """Ensure a valid refresh token can be used to get a new access token."""
        login_data = {'username': 'existinguser', 'password': 'password123'}
        login_response = self.client.post(self.login_url, login_data, format='json')
        
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn('refresh_token', self.client.cookies)

        # The test client automatically handles cookies, so the refresh token
        # will be sent with the next request.
        refresh_response = self.client.post(self.refresh_url)

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn('access_token', refresh_response.cookies)
        self.assertNotEqual(
            login_response.cookies['access_token'].value,
            refresh_response.cookies['access_token'].value
        )
        self.assertEqual(refresh_response.data['user']['username'], 'existinguser')


@patch('predictor.views.get_price_prediction', return_value=15000.0)
class PredictionAPITests(APITestCase):
    """
    Tests for the price prediction API endpoints.
    Mocks the ML service to isolate API logic.
    """

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='testuser', password='testpassword123')
        cls.predict_url = reverse('predict')
        cls.prediction_data = {
            'brand': 'Audi',
            'car_model': 'A5',
            'year_of_production': 2020,
            'mileage': 50000,
            'fuel_type': 'Petrol',
            'transmission': 'Automatic',
            'body': 'Sedan',
            'engine_capacity': 2.0,
            'power': 150,
            'number_of_doors': 5,
            'color': 'Black',
        }

    def test_guest_prediction(self, mock_get_price):
        """Ensure guests can get predictions without creating a record."""
        response = self.client.post(self.predict_url, self.prediction_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['predicted_price'], 15000.0)
        self.assertNotIn('id', response.data) # Guest predictions are not saved
        self.assertEqual(Prediction.objects.count(), 0)
        mock_get_price.assert_called_once()

    def test_authenticated_user_prediction(self, mock_get_price):
        """Ensure authenticated users get predictions and a record is created."""
        self.client.force_authenticate(user=self.user)
        response = self.client.post(self.predict_url, self.prediction_data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['predicted_price'], 15000.0)
        self.assertEqual(response.data['user'], self.user.id)
        self.assertEqual(Prediction.objects.count(), 1)
        self.assertEqual(Prediction.objects.first().user, self.user)
        mock_get_price.assert_called_once()

    def test_prediction_invalid_data_year(self, mock_get_price):
        """Ensure the API handles invalid year."""
        data = self.prediction_data.copy()
        data['year_of_production'] = 1800  # Invalid year
        response = self.client.post(self.predict_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('year_of_production', response.data)
        mock_get_price.assert_not_called()

    def test_prediction_invalid_data_mileage(self, mock_get_price):
        """Ensure the API handles invalid mileage."""
        data = self.prediction_data.copy()
        data['mileage'] = -100  # Invalid mileage
        response = self.client.post(self.predict_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('mileage', response.data)
        mock_get_price.assert_not_called()

    def test_prediction_missing_required_field(self, mock_get_price):
        """Ensure the API handles missing required fields."""
        data = self.prediction_data.copy()
        del data['brand']  # 'brand' is a required field
        response = self.client.post(self.predict_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('brand', response.data)
        mock_get_price.assert_not_called()

    def test_prediction_with_extra_field(self, mock_get_price):
        """Ensure the API rejects requests with unknown fields."""
        data = self.prediction_data.copy()
        data['extra_field'] = 'some_value'
        response = self.client.post(self.predict_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('extra_field', response.data)
        mock_get_price.assert_not_called()


class DataAPITests(APITestCase):
    """
    Tests for endpoints that provide data for UI elements (dropdowns, etc.).
    """

    @classmethod
    def setUpTestData(cls):
        CarListing.objects.create(
            brand='Audi', car_model='A4', year_of_production=2018, mileage=50000,
            fuel_type='Diesel', transmission='Automatic', body='Sedan', engine_capacity=2.0,
            power=190, number_of_doors=5, color='Black', price=25000
        )
        CarListing.objects.create(
            brand='BMW', car_model='X5', year_of_production=2020, mileage=20000,
            fuel_type='Petrol', transmission='Automatic', body='SUV', engine_capacity=3.0,
            power=340, number_of_doors=5, color='White', price=60000
        )
        cls.dropdown_url = reverse('dropdown_options')
        cls.mapping_url = reverse('brand_model_mapping')

    def test_dropdown_options_endpoint(self):
        """Ensure dropdown options are correctly fetched and structured."""
        response = self.client.get(self.dropdown_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('brand', response.data)
        self.assertIn('year_of_production', response.data)
        self.assertEqual(response.data['brand'], ['Audi', 'BMW'])
        self.assertEqual(response.data['year_of_production']['min'], 2018)

    def test_brand_model_mapping_endpoint(self):
        """Ensure the brand-to-model mapping is correct."""
        response = self.client.get(self.mapping_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Audi', response.data)
        self.assertEqual(response.data['Audi'], ['A4'])
        self.assertIn('BMW', response.data)
        self.assertEqual(response.data['BMW'], ['X5'])


class PredictionHistoryTests(APITestCase):
    """
    Tests for the prediction history endpoint, including filtering and pagination.
    """

    @classmethod
    def setUpTestData(cls):
        cls.user = User.objects.create_user(username='historyuser', password='password')
        now = timezone.now()
        Prediction.objects.create(
            user=cls.user, brand='Audi', car_model='A4', year_of_production=2018, mileage=10000,
            fuel_type='Diesel', transmission='Automatic', body='Sedan', engine_capacity=2.0,
            power=190, number_of_doors=5, color='Black', predicted_price=25000,
            timestamp=now - timedelta(days=10)
        )
        Prediction.objects.create(
            user=cls.user, brand='BMW', car_model='X5', year_of_production=2020, mileage=20000,
            fuel_type='Petrol', transmission='Automatic', body='SUV', engine_capacity=3.0,
            power=340, number_of_doors=5, color='White', predicted_price=60000,
            timestamp=now - timedelta(days=5)
        )
        cls.history_url = reverse('prediction_history')

    def setUp(self):
        self.client.force_authenticate(user=self.user)

    def test_get_prediction_history(self):
        """Ensure a user can retrieve their prediction history."""
        response = self.client.get(self.history_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 2)

    def test_prediction_history_unauthenticated(self):
        """Ensure unauthenticated users cannot access history."""
        self.client.logout()
        response = self.client.get(self.history_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_prediction_history_filtering_by_brand(self):
        """Test filtering history by brand."""
        response = self.client.get(self.history_url, {'brand': 'Audi'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 1)
        self.assertEqual(response.data['results'][0]['brand'], 'Audi')

    def test_prediction_history_pagination(self):
        """Test pagination of history results."""
        response = self.client.get(self.history_url, {'page_size': 1, 'page': 2})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['current_page'], 2)
        self.assertEqual(response.data['results'][0]['brand'], 'Audi') # Ordered by -timestamp


class DataAPITestsEmptyDB(APITestCase):
    """
    Tests data endpoints with an empty database to ensure they handle it gracefully.
    """
    def setUp(self):
        cache.clear()
        self.dropdown_url = reverse('dropdown_options')
        self.mapping_url = reverse('brand_model_mapping')

    def test_dropdown_options_empty_db(self):
        """Ensure dropdown options endpoint returns a valid, empty structure."""
        response = self.client.get(self.dropdown_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check for correct structure with empty or null values
        self.assertEqual(response.data['brand'], [])
        self.assertEqual(response.data['car_model'], [])
        self.assertEqual(response.data['fuel_type'], [])
        self.assertEqual(response.data['transmission'], [])
        self.assertEqual(response.data['body'], [])
        self.assertEqual(response.data['color'], [])
        self.assertIsNone(response.data['year_of_production']['min'])
        self.assertIsNone(response.data['year_of_production']['max'])
        self.assertIsNone(response.data['number_of_doors']['min'])
        self.assertIsNone(response.data['number_of_doors']['max'])

    def test_brand_model_mapping_empty_db(self):
        """Ensure brand-model mapping endpoint returns an empty object."""
        response = self.client.get(self.mapping_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data, {})
