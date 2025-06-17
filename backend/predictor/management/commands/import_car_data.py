import pandas as pd
from django.core.management.base import BaseCommand
from django.conf import settings
from predictor.models import CarListing
import os

class Command(BaseCommand):
    help = 'Import car data from a CSV file into the database'

    def handle(self, *args, **options):
        csv_path = settings.DATA_PATH

        if not os.path.exists(csv_path):
            self.stdout.write(self.style.ERROR(f'File not found at: {csv_path}'))
            return

        self.stdout.write(self.style.SUCCESS(f'Starting data import from {csv_path}'))

        self.stdout.write('Clearing existing car listings...')
        CarListing.objects.all().delete()

        try:
            df = pd.read_csv(csv_path)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error reading CSV file: {e}'))
            return

        # These are the columns your CarListing model expects.
        required_columns = [
            'brand', 'car_model', 'year_of_production', 'mileage', 'fuel_type',
            'transmission', 'body', 'engine_capacity', 'power',
            'number_of_doors', 'color', 'price'
        ]

        # Check for missing columns
        missing_cols = set(required_columns) - set(df.columns)
        if missing_cols:
            self.stdout.write(self.style.ERROR(
                f"Missing required columns in CSV: {', '.join(missing_cols)}"
            ))
            return

        # Filter dataframe to only include required columns
        df = df[required_columns]

        car_listings = [
            CarListing(**row)
            for row in df.to_dict(orient='records')
        ]

        CarListing.objects.bulk_create(car_listings)

        self.stdout.write(self.style.SUCCESS(f'Successfully imported {len(car_listings)} car listings.'))
