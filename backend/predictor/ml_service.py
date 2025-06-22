import os 
import joblib
import pandas as pd 
import numpy as np 
from typing import Dict, Any, Optional
from logging import getLogger
from cars_price_predictor.settings import ML_MODEL_PATH

logger = getLogger(__name__)

class MLModel:
    _instance: Optional['MLModel'] = None
    _model: Any = None

    def __new__(cls) -> 'MLModel':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        if not hasattr(self, "_initialized"):
            self._load_model()
            self._initialized = True
        
    def _load_model(self) -> None:
        try:
            model_path = ML_MODEL_PATH
        
            if not os.path.exists(model_path):
                raise FileNotFoundError(f"Model file not found at {model_path}")
        
            logger.info(f"Loading model from {model_path}")
            self._model = joblib.load(model_path)
            logger.info(f"Model loaded successfully: {type(self._model).__name__}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}", exc_info=True)
            self._model = None
            raise
    
    def predict(self, input_data: Dict[str, Any]) -> float:
        if not input_data:
            raise ValueError("Input data cannot be empty")
            
        if self._model is None:
            raise ValueError("Model is not loaded")
            
        try:
            logger.info("Making prediction", extra={"input_data": input_data})
            df = pd.DataFrame([input_data])
            prediction = self._model.predict(df)[0]
            price = np.floor(np.expm1(prediction))
            
            logger.info("Prediction successful", 
                       extra={"input": input_data, "predicted_price": price})
            return price

        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}", 
                        exc_info=True,
                        extra={"input_data": input_data})
            raise

def get_price_prediction(input_data: Dict[str, Any]) -> float:
    ml_model = MLModel()
    return ml_model.predict(input_data)