'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller, Control, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, ComboboxButton } from '@headlessui/react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { getDropdownOptions, getBrandModelMapping, predictPrice, DropdownOptions, BrandModelMapping, Prediction } from '../api/services';
import { cn } from '@/lib/utils';

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

// Form Schema Definition with Zod
const createFormSchema = (dropdowns: DropdownOptions | null) => z.object({
  brand: z.string().min(1, 'Brand is required.'),
  car_model: z.string().min(1, 'Car model is required.'),
  year_of_production: z.number()
    .min(dropdowns?.year_of_production?.min ?? 1960, `Year must be at least ${dropdowns?.year_of_production?.min ?? 1960}.`)
    .max(new Date().getFullYear(), `Year cannot be after ${new Date().getFullYear()}.`),
  mileage: z.number().positive('Mileage is required.'),
  fuel_type: z.string().min(1, 'Fuel type is required.'),
  transmission: z.string().min(1, 'Transmission is required.'),
  body: z.string().min(1, 'Body type is required.'),
  engine_capacity: z.number().min(0.1, 'Engine capacity is required.').max(20, 'Engine capacity seems too high.'),
  power: z.number().min(10, 'Power seems too low.').max(1000, 'Power seems too high.'),
  number_of_doors: z.number()
    .min(dropdowns?.number_of_doors?.min ?? 2, `Must have at least ${dropdowns?.number_of_doors?.min ?? 2} doors.`)
    .max(dropdowns?.number_of_doors?.max ?? 7, `Cannot have more than ${dropdowns?.number_of_doors?.max ?? 7} doors.`),
  color: z.string().min(1, 'Color is required.'),
});

type FormData = z.infer<ReturnType<typeof createFormSchema>>;

// --- REUSABLE COMPONENTS ---

const InputContainer = ({ error, children }: { error?: boolean; children: React.ReactNode }) => (
  <div
    className={cn(
      "relative w-full bg-white/5 rounded-lg backdrop-blur-xl transition-all duration-300 border",
      error
        ? "border-red-500/50 hover:border-red-500/70 focus-within:border-red-500/90 focus-within:shadow-[0_0_12px_rgba(239,68,68,0.5)]"
        : "border-white/20 hover:border-white/40 focus-within:border-[#778DA9] focus-within:shadow-[0_0_12px_rgba(119,141,169,0.5)]"
    )}
  >
    {children}
  </div>
);

const FormattedNumberField = ({ control, name, label, placeholder, error }: { control: Control<FormData>; name: 'mileage' | 'engine_capacity' | 'power'; label: string; placeholder: string; error?: string; }) => {
  const { field } = useController({ name, control });
  const [displayValue, setDisplayValue] = useState(field.value && field.value > 0 ? String(field.value) : '');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawValue = e.target.value;

    if (name === 'engine_capacity') {
      rawValue = rawValue.replace(/,/g, '.');
    }
    if (name === 'mileage') {
      rawValue = rawValue.replace(/\s/g, '');
    }
    if (rawValue.length > 1 && rawValue.startsWith('0') && !rawValue.startsWith('0.')) {
      rawValue = rawValue.substring(1);
    }

    const isValid = name === 'mileage' ? /^\d*$/.test(rawValue) : /^\d*\.?\d*$/.test(rawValue);

    if (isValid) {
      if (name === 'mileage' && rawValue) {
        setDisplayValue(new Intl.NumberFormat('sv-SE').format(Number(rawValue)));
      } else {
        setDisplayValue(rawValue);
      }
      field.onChange(rawValue === '' ? 0 : parseFloat(rawValue));
    }
  };

  useEffect(() => {
    const formValue = field.value;
    if (formValue && formValue > 0) {
      if (name === 'mileage') {
        setDisplayValue(new Intl.NumberFormat('sv-SE').format(formValue));
      } else {
        setDisplayValue(String(formValue));
      }
    } else {
      setDisplayValue('');
    }
  }, [field.value, name]);

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-[#778DA9]">{label}</label>
      <InputContainer error={!!error}>
        <input
          id={name}
          type="text"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleInputChange}
          onBlur={field.onBlur}
          ref={field.ref}
          className="w-full px-4 py-3 bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
        />
      </InputContainer>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

const SliderField = ({ control, name, label, min, max, step, error }: { control: Control<FormData>; name: 'year_of_production' | 'number_of_doors'; label: string; min: number; max: number; step: number; error?: string; }) => {
  const { field } = useController({ name, control });

  return (
    <div className="space-y-2 pt-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-[#778DA9]">{label}</label>
        <span className="text-sm text-white font-mono bg-white/10 px-2 py-1 rounded">{field.value}</span>
      </div>
      <SliderPrimitive.Root
        value={[field.value]}
        onValueChange={(value) => field.onChange(value[0])}
        min={min}
        max={max}
        step={step}
        className="relative flex items-center select-none touch-none w-full h-5 cursor-pointer"
      >
        <SliderPrimitive.Track className="bg-white/10 relative grow rounded-full h-1.5">
          <SliderPrimitive.Range className="absolute bg-[#778DA9] rounded-full h-full" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block w-5 h-5 bg-white rounded-full shadow-lg focus:outline-none focus:ring-2 focus:ring-[#778DA9] focus:ring-offset-2 focus:ring-offset-[#0D1B2A]" />
      </SliderPrimitive.Root>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

const AutocompleteField = ({
  control,
  name,
  label,
  options,
  placeholder,
  disabled = false,
  loading = false,
}: {
  control: Control<FormData>;
  name: keyof FormData;
  label: string;
  options: readonly string[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
}) => {
  const { field, fieldState: { error } } = useController({ name, control });
  const [query, setQuery] = useState('');

  const filteredOptions = query === ''
      ? options
      : options.filter(option =>
          option.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <div className="space-y-2">
      <label htmlFor={`${name}-combobox`} className="text-sm font-medium text-[#778DA9]">{label}</label>
      <Combobox value={field.value as string || ''} onChange={field.onChange} disabled={disabled || loading}>
        <div className="relative">
          <InputContainer error={!!error}>
            <ComboboxInput
              id={`${name}-combobox`}
              className="w-full px-4 py-3 pr-10 bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
              onChange={(event) => setQuery(event.target.value)}
              onBlur={field.onBlur}
              placeholder={placeholder}
              autoComplete='off'
            />
            <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-4">
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin text-[#778DA9]" />
              ) : (
                <ChevronsUpDown
                  className="h-5 w-5 text-[#778DA9]"
                  aria-hidden="true"
                />
              )}
            </ComboboxButton>
          </InputContainer>
          <ComboboxOptions className="custom-scrollbar absolute mt-2 max-h-60 w-full overflow-auto rounded-md bg-black/50 backdrop-blur-lg py-1 text-base shadow-lg ring-1 ring-white/10 focus:outline-none sm:text-sm z-10">
            {filteredOptions.length === 0 && query !== '' ? (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-400">
                Nothing found.
              </div>
            ) : (
              filteredOptions.map((option) => (
                <ComboboxOption
                  key={option}
                  className={({ active }) =>
                    cn(
                      'relative cursor-default select-none py-2 pl-10 pr-4',
                      active ? 'bg-[#778DA9]/30 text-white' : 'text-gray-300'
                    )
                  }
                  value={option}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={cn('block truncate', selected ? 'font-medium' : 'font-normal')}> 
                        {option}
                      </span>
                      {selected ? (
                        <span
                          className={cn('absolute inset-y-0 left-0 flex items-center pl-3', active ? 'text-white' : 'text-[#778DA9]')}>
                          <Check className="h-5 w-5" aria-hidden="true" />
                        </span>
                      ) : null}
                    </>
                  )}
                </ComboboxOption>
              ))
            )}
          </ComboboxOptions>
        </div>
      </Combobox>
      {error && <p className="text-xs text-red-400 mt-1">{error.message}</p>}
    </div>
  );
};

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
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    buttonRef.current.style.setProperty('--x', `${x}px`);
    buttonRef.current.style.setProperty('--y', `${y}px`);
  };

  const resolver = useMemo(() => zodResolver(createFormSchema(dropdowns)), [dropdowns]);

  const { handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
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

        
        const reverseMapping: Record<string, string> = {};
        const allModelsList: string[] = [];

        if (brandModelData) {
            Object.entries(brandModelData).forEach(([brand, models]) => {
              const uniqueModels = [...new Set(models)];
              brandModelData[brand] = uniqueModels; // Update mapping with unique models
              uniqueModels.forEach(model => {
                reverseMapping[model.toLowerCase()] = brand;
                allModelsList.push(model);
              });
            });
        }
        
        setBrandModels(brandModelData);
        setModelToBrand(reverseMapping);
        setAllModels([...new Set(allModelsList)].sort());
      } catch (error) {
        console.error("Failed to fetch initial form data", error);
        setApiError("Could not load form options. Please refresh the page.");
      }
    }
    fetchData();
  }, []);

  // Effect to sync brand and model selections
  useEffect(() => {
    // Case 1: Brand was cleared by the user (transitioned from a value to no value).
    if (prevSelectedBrand && !selectedBrand) {
      setValue('car_model', '', { shouldValidate: true });
      return; // Prioritize this action and stop further processing in this effect.
    }

    // Case 2: A model is selected. Update the brand to match if it's incorrect.
    if (selectedModel) {
      const brandForModel = modelToBrand[selectedModel.toLowerCase()];
      if (brandForModel && brandForModel !== selectedBrand) {
        setValue('brand', brandForModel, { shouldValidate: true });
        return; // Prioritize model-driven brand changes.
      }
    }

    // Case 3: A brand is selected, and the current model is now inconsistent.
    if (selectedBrand && selectedModel) {
      const brandForModel = modelToBrand[selectedModel.toLowerCase()];
      if (brandForModel !== selectedBrand) {
        setValue('car_model', '', { shouldValidate: true });
      }
    }
  }, [selectedBrand, selectedModel, prevSelectedBrand, modelToBrand, setValue]);


  const onSubmit = async (data: FormData) => {
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
            <AutocompleteField
              name="brand"
              control={control}
              label="Brand"
              options={dropdowns?.brand || []}
              placeholder="Select Brand"
              loading={!dropdowns}
            />
            <AutocompleteField
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
            <AutocompleteField
              name="fuel_type"
              control={control}
              label="Fuel Type"
              options={dropdowns?.fuel_type || []}
              placeholder="Select Fuel Type"
              loading={!dropdowns}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <AutocompleteField
              name="transmission"
              control={control}
              label="Transmission"
              options={dropdowns?.transmission || []}
              placeholder="Select Transmission"
              loading={!dropdowns}
            />
            <AutocompleteField
              name="body"
              control={control}
              label="Body Type"
              options={dropdowns?.body || []}
              placeholder="Select Body Type"
              loading={!dropdowns}
            />
            <AutocompleteField
              name="color"
              control={control}
              label="Color"
              options={dropdowns?.color || []}
              placeholder="Select Color"
              loading={!dropdowns}
            />
          </div>

          <motion.button
            ref={buttonRef}
            type="submit"
            disabled={isLoading}
            onMouseMove={handleMouseMove}
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.95 }}
            className="relative overflow-hidden flex items-center justify-center gap-2 w-full mt-12 px-8 py-4 text-white font-bold rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span
              className="absolute w-40 h-40 -translate-x-1/2 -translate-y-1/2 
                     bg-white/10 rounded-full pointer-events-none blur-2xl 
                     opacity-0 group-hover:opacity-50 transition-opacity duration-300"
              style={{
                left: 'var(--x)',
                top: 'var(--y)',
              }}
            />
            <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 opacity-10 pointer-events-none rounded-full"></span>
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 relative z-10" />
                <span className="relative z-10">Predicting...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">Predict Price</span>
                <Zap size={20} className="relative z-10" />
              </>
            )}
          </motion.button>
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