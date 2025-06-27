import api from '@/lib/api';

// Type definitions for the API responses

export interface DropdownOptions {
  brand: string[];
  car_model: string[];
  year_of_production: {
    min: number;
    max: number;
  };
  fuel_type: string[];
  transmission: string[];
  body: string[];
  number_of_doors: {
    min: number;
    max: number;
  };
  color: string[];  
}

export interface BrandModelMapping {
  [brand: string]: string[];
}

export interface PredictionPayload {
  brand: string;
  car_model: string;
  year_of_production: number;
  mileage: number;
  fuel_type: string;
  transmission: string;
  body: string;
  engine_capacity: number;
  power: number;
  number_of_doors: number;
  color: string;
}

/**
 * Represents a single car price prediction record.
 * The `id` and `user` fields are optional as they are not present for guest predictions.
 */
export interface Prediction {
  user?: number;
  id?: number;
  brand: string;
  car_model: string;
  year_of_production: number;
  mileage: number;
  fuel_type: string;
  transmission: string;
  body: string;
  engine_capacity: number;
  power: number;
  number_of_doors: number;
  color: string;
  predicted_price: number;
  timestamp: string;
}

/**
 * Represents the paginated response for the prediction history endpoint.
 */
export interface PaginatedPredictions {
  count: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  sort: string;
  filters: Record<string, string | number>;
  results: Prediction[];
}

export interface HistoryQueryParams {
  page?: number;
  page_size?: number;
  sort?: string;
  brand?: string;
  car_model?: string;
  start_date?: string;
  end_date?: string;
  min_price?: number;
  max_price?: number;
}

// API service functions

/**
 * Fetches dropdown options for various car attributes.
 */
export const getDropdownOptions = async (): Promise<DropdownOptions> => {
  try {
    const response = await api.get<DropdownOptions>('/dropdown_options/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch dropdown options:', error);
    throw error;
  }
};

/**
 * Fetches the mapping of car brands to their models.
 */
export const getBrandModelMapping = async (): Promise<BrandModelMapping> => {
  try {
    const response = await api.get<BrandModelMapping>('/brand_model_mapping/');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch brand-model mapping:', error);
    throw error;
  }
};

/**
 * Sends car data to the prediction endpoint.
 * @param data - The car data for prediction.
 * @returns The prediction result.
 */
export const predictPrice = async (data: PredictionPayload): Promise<Prediction> => {
  try {
    const response = await api.post<Prediction>('/predict/', data);
    return response.data;
  } catch (error) {
    console.error('Failed to get prediction:', error);
    throw error;
  }
};

/**
 * Fetches the user's prediction history.
 * @param params - Query parameters for pagination, sorting, and filtering.
 * @returns A paginated list of predictions.
 */
export const getPredictionHistory = async (params: HistoryQueryParams): Promise<PaginatedPredictions> => {
  try {
    const response = await api.get<PaginatedPredictions>('/predictions/', { params });
    return response.data;
  } catch (error) {
    console.error('Failed to fetch prediction history:', error);
    throw error;
  }
};

