'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap } from 'lucide-react';

import { getDropdownOptions, getBrandModelMapping, predictPrice, DropdownOptions, BrandModelMapping, Prediction } from '../api/services';
import { PredictionFormData, PredictionSchema } from '@/lib/schema';
import { usePrevious } from '@/hooks/usePrevious';
import { ComboBoxField } from '@/components/ui/ComboBoxField';
import { FormattedNumberField } from '@/components/ui/FormattedNumberField';
import { SliderField } from '@/components/ui/SliderField';
import { ActionButton } from '@/components/ui/ActionButton';

// --- MAIN PAGE COMPONENT ---
export default function PredictPage() {
  const [dropdowns, setDropdowns] = useState<DropdownOptions | null>(null);
  const [brandModels, setBrandModels] = useState<BrandModelMapping | null>(null);
  const [modelToBrand, setModelToBrand] = useState<Record<string, string>>({});
  const [allModels, setAllModels] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const resolver: Resolver<PredictionFormData> = useMemo(() => zodResolver(PredictionSchema(dropdowns)), [dropdowns]);

  const { handleSubmit, control, watch, setValue, formState: { errors } } = useForm<PredictionFormData>({
    resolver,
    defaultValues: {
      brand: '',
      car_model: '',
      year_of_production: new Date().getFullYear(),
      mileage: 0,
      fuel_type: '',
      transmission: '',
      body: '',
      engine_capacity: 0,
      power: 0,
      number_of_doors: 5,
      color: '',
    }
  });

  const selectedBrand = watch('brand');
  const selectedModel = watch('car_model');
  const prevSelectedBrand = usePrevious(selectedBrand);

  useEffect(() => {
    async function fetchData() {
      try {
        const [dropdownData, brandModelData] = await Promise.all([
          getDropdownOptions(),
          getBrandModelMapping()
        ]);
        setDropdowns(dropdownData);

        if (dropdownData?.car_model) {
          setAllModels(dropdownData.car_model);
        }

        const reverseMapping: Record<string, string> = {};
        const cleanedBrandModels: BrandModelMapping = {};

        if (brandModelData) {
          for (const [brand, models] of Object.entries(brandModelData)) {
            const uniqueModels = [...new Set(models)];
            cleanedBrandModels[brand] = uniqueModels;
            for (const model of uniqueModels) {
              reverseMapping[model.toLowerCase()] = brand;
            }
          }
        }
        
        setBrandModels(cleanedBrandModels);
        setModelToBrand(reverseMapping);
      } catch (error) {
        console.error("Failed to fetch initial form data", error);
        setApiError("Could not load form options. Please refresh the page.");
      }
    }
    fetchData();
  }, []);

  // Effect to sync brand and model selections
  useEffect(() => {
    const brandForModel = selectedModel ? modelToBrand[selectedModel.toLowerCase()] : null;

    // Case 1: Brand is changed by the user. This has the highest priority.
    if (selectedBrand !== prevSelectedBrand && prevSelectedBrand !== undefined) {
      // If the new brand is not the one that would be auto-set by the current model,
      // it's a manual change, so we reset the model.
      if (selectedBrand !== brandForModel) {
        setValue('car_model', '');
      }
      // After handling a brand change, we stop to prevent the model-change logic below from running.
      return;
    }

    // Case 2: Model is changed by the user, and the brand needs to be updated.
    // This runs only if the brand did not just change.
    if (brandForModel && brandForModel !== selectedBrand) {
      setValue('brand', brandForModel);
    }
  }, [selectedBrand, selectedModel, prevSelectedBrand, modelToBrand, setValue]);


  const onSubmit = async (data: PredictionFormData) => {
    setIsLoading(true);
    setPrediction(null);
    setApiError(null);
    try {
      const result = await predictPrice(data);
      setPrediction(result);
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Prediction API error", error);
      setApiError("An error occurred while making the prediction. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const currentModels = selectedBrand && brandModels ? (brandModels[selectedBrand] || []).sort() : allModels;

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-200px)] px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="space-y-6 w-full max-w-3xl"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-[#778DA9]">
          Predict Car Price
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-[#778DA9]">
          Fill in the details below to get a market value prediction for your car.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ComboBoxField
              name="brand"
              control={control}
              label="Brand"
              options={dropdowns?.brand || []}
              placeholder="Select Brand"
              loading={!dropdowns}
            />
            <ComboBoxField
              name="car_model"
              control={control}
              label="Car Model"
              options={currentModels}
              placeholder="Select Model"
              loading={!brandModels}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <SliderField control={control} name="year_of_production" label="Year Of Production" min={dropdowns?.year_of_production?.min || 1980} max={dropdowns?.year_of_production?.max || new Date().getFullYear()} step={1} error={errors.year_of_production?.message} />
             <SliderField control={control} name="number_of_doors" label="Number Of Doors" min={dropdowns?.number_of_doors?.min || 2} max={dropdowns?.number_of_doors?.max || 7} step={1} error={errors.number_of_doors?.message} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormattedNumberField control={control} name="mileage" label="Mileage [km]" placeholder="e.g., 50 000" error={errors.mileage?.message} />
            <FormattedNumberField control={control} name="engine_capacity" label="Engine Capacity [dm³]" placeholder="e.g., 1.8" error={errors.engine_capacity?.message} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormattedNumberField control={control} name="power" label="Power [HP]" placeholder="e.g., 140" error={errors.power?.message} />
            <ComboBoxField
              name="fuel_type"
              control={control}
              label="Fuel Type"
              options={dropdowns?.fuel_type || []}
              placeholder="Select Fuel Type"
              loading={!dropdowns}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ComboBoxField
              name="transmission"
              control={control}
              label="Transmission"
              options={dropdowns?.transmission || []}
              placeholder="Select Transmission"
              loading={!dropdowns}
            />
            <ComboBoxField
              name="body"
              control={control}
              label="Body Type"
              options={dropdowns?.body || []}
              placeholder="Select Body Type"
              loading={!dropdowns}
            />
            <ComboBoxField
              name="color"
              control={control}
              label="Color"
              options={dropdowns?.color || []}
              placeholder="Select Color"
              loading={!dropdowns}
            />
          </div>

          <ActionButton
            type="submit"
            isLoading={isLoading}
            Icon={Zap}
            loadingText="Predicting..."
            className="mt-12"
          >
            Predict Price
          </ActionButton>
        </form>

        <AnimatePresence>
          {prediction !== null && (
            <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 p-6 bg-white/10 border border-white/20 rounded-lg backdrop-blur-xl"
            >
              <h3 className="text-xl font-bold text-white">Predicted Price:</h3>
              <p className="text-5xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-300 via-emerald-400 to-teal-500">
                {prediction.predicted_price.toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {apiError && (
             <motion.div
              ref={resultRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 p-4 bg-red-900/50 border border-red-500/50 rounded-lg"
            >
              <p className="text-red-300">{apiError}</p>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  );
}