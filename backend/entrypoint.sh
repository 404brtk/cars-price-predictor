#!/usr/bin/env bash

# Exit immediately if a command exits with a non-zero status
set -e

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Apply database migrations
echo "Applying database migrations..."
python manage.py migrate --noinput

# Import car data
echo "Importing car data..."
python manage.py import_car_data

# Start Gunicorn
echo "Starting Gunicorn..."
exec gunicorn \
    --bind 0.0.0.0:8000 \
    --workers 3 \
    --worker-class gthread \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --worker-tmp-dir /dev/shm \
    cars_price_predictor.wsgi:application