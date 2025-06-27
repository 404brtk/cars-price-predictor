# Stage 1: Builder
# Base image: Python 3.13 slim version for a minimal footprint
FROM python:3.13-slim AS builder

# Set the working directory inside the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first to leverage Docker cache
COPY requirements.txt .

# Upgrade pip to latest version
RUN pip install --upgrade pip && \
# Install Python dependencies without storing pip cache
    pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime
FROM python:3.13-slim AS runner

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1

WORKDIR /app

# Copy installed Python packages
COPY --from=builder /install /usr/local

# Copy source code
COPY . .

# Create and switch to a non-root user
RUN useradd -m myuser && chown -R myuser:myuser /app
USER myuser

# Make the entrypoint script executable
RUN chmod +x /app/entrypoint.sh

# Document that the container listens on port 8000
EXPOSE 8000

# Command to run the application
CMD ["/app/entrypoint.sh"]
