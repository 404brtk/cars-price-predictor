# 🚗 cars-price-predictor

This project is a full-stack web application designed to predict the price of used cars based on their features. It features a Next.js frontend, a Django REST framework backend, and a machine learning model trained with CatBoost.

## Machine Learning Model

The machine learning component of this project involved several key stages, all documented within the Jupyter notebooks in the `/notebook` directory. The process included:

- **Web Scraping**: The initial dataset was gathered by scraping data from the web.
- **Exploratory Data Analysis & Data Cleaning**: The data underwent a thorough analysis and cleaning process to handle inconsistencies and missing values.
- **Feature Engineering**: Relevant features were selected and transformed to prepare the data for the modeling phase.
- **Model Development, Hyperparameter Tuning, and Evaluation**: Various model architectures were explored, their hyperparameters were tuned, and the models were evaluated to select the best performer. The final model (CatBoost) was trained and serialized for use in the Django backend to make predictions.

## Features

- **Price Prediction**: Predicts used car prices using a trained machine learning model.
- **Interactive UI**: A user-friendly interface to input car details and get price predictions.
- **RESTful API**: A robust backend API to handle prediction requests and data management.
- **User Authentication**: Secure user registration and login functionality.
- **Prediction History**: Logged-in users can view their past predictions.

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, Axios, Zod, Framer Motion, Lucide React, Cookies Next
- **Backend**: Django, Django REST Framework, Python, Gunicorn
- **Machine Learning**: CatBoost, Scikit-learn, SciPy, Pandas, NumPy, Matplotlib, Seaborn, Joblib
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose

## Project Structure

```
. 
├── backend/           # Django backend source code
├── frontend/          # Next.js frontend source code
├── notebook/          # Notebook for data processing, model training, and evaluation
├── docker-compose.yml # Docker Compose configuration
└── README.md          # Documentation
```

## Getting Started

### Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Node.js](https://nodejs.org/en/) (for local frontend development)
- [Python](https://www.python.org/downloads/) (for local backend development)

### Setup & Installation (Docker)

This is the recommended way to run the project for a production-like environment.

1.  **Clone the repository:**

    - **HTTPS:**
      ```bash
      git clone https://github.com/404brtk/cars-price-predictor.git
      ```
    - **SSH:**
      ```bash
      git clone git@github.com:404brtk/cars-price-predictor.git
      ```

    Then navigate into the project directory:
    ```bash
    cd cars-price-predictor
    ```

2.  **Configure Environment Variables:**

    -   **Backend:** Create a `.env` file inside the `backend` directory by copying the example file.
        ```bash
        cp backend/.env.example backend/.env
        ```
      Update the `backend/.env` file with the appropriate configuration values for your environment.

    -   **Frontend:** Create a `.env` file inside the `frontend` directory.
        ```bash
        cp frontend/.env.example frontend/.env
        ```
      Update the `frontend/.env` file with the appropriate configuration values for your environment.

3.  **Build and Run with Docker Compose:**
    ```bash
    docker-compose up --build
    ```

4.  **Access the application:**
    -   Frontend: [http://localhost:3000](http://localhost:3000)
    -   Backend API: [http://localhost:8000](http://localhost:8000)

### Local Development

Follow these steps if you prefer to run the frontend and backend services separately without Docker.

#### Backend

1.  **Navigate to the backend directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment:**
    ```bash
    python -m venv venv
    venv\Scripts\activate # Windows 
    source venv/bin/activate # Linux/Mac
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run database migrations:**
    ```bash
    python manage.py migrate
    ```

5.  **Import car data:**
    ```bash
    python manage.py import_car_data
    ```

6.  **Run the development server:**
    ```bash
    python manage.py runserver
    ```

#### Frontend

1.  **Navigate to the frontend directory:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```