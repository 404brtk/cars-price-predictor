'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useForm, Controller, Control, useController } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, ChevronsUpDown, Check, Loader2, X } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from 'cmdk';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { getDropdownOptions, getBrandModelMapping, predictPrice, DropdownOptions, BrandModelMapping, Prediction } from '../api/services';
import { cn } from '@/lib/utils';

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
      <motion.input
        id={name}
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={field.onBlur}
        ref={field.ref}
        whileFocus={{ scale: 1.02, boxShadow: '0 0 8px rgb(119, 141, 169, 0.5)' }}
        className={cn("w-full bg-white/5 border rounded-lg px-4 py-3 focus:ring-2 focus:outline-none transition-shadow duration-200 text-white backdrop-blur-xl", error ? "border-red-500/50 focus:ring-red-500" : "border-white/20 focus:ring-[#778DA9]")}
      />
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

const Combobox = ({ label, options, value, onChange, placeholder, error, disabled = false }: { label: string; options: string[]; value: string; onChange: (value: string) => void; placeholder: string; error?: string; disabled?: boolean; }) => {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Sync input value if the external value changes (e.g., form reset)
    if (value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  const handleSelect = (option: string) => {
    onChange(option);
    setInputValue(option);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setInputValue("");
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    // Use a short timeout to allow click events on popover items to register before the blur event resolves.
    setTimeout(() => {
      // If focus has moved to an element within the popover, do not resolve.
      if (popoverContentRef.current?.contains(document.activeElement)) {
        return;
      }

      // Find the best match for the current input, preferring a starts-with match.
      const bestMatch = options.find(opt => opt.toLowerCase().startsWith(inputValue.toLowerCase())) || options.find(opt => opt.toLowerCase().includes(inputValue.toLowerCase()));

      if (bestMatch) {
        // If a good match is found, commit it.
        onChange(bestMatch);
        setInputValue(bestMatch);
      } else {
        // Otherwise, revert to the last valid value.
        setInputValue(value);
      }
      setOpen(false);
    }, 150);
  };

  const filteredOptions = useMemo(() => {
    if (!inputValue || inputValue === value) {
      return options;
    }
    return options.filter(option =>
      option.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [options, inputValue, value]);

  return (
    <div className="space-y-2">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #4A5568; border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #718096; }
      `}</style>

      <label className="text-base font-medium text-gray-300">{label}</label>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <div className="relative">
          <Popover.Anchor asChild>
            <div className={cn(
              "flex items-center w-full bg-white/5 border rounded-lg focus-within:ring-2 transition-shadow duration-200 backdrop-blur-xl h-12",
              error ? "border-red-500/50 focus-within:ring-red-500" : "border-white/20 focus-within:ring-[#778DA9]",
              disabled && "opacity-50 cursor-not-allowed"
            )}>
              <input
                ref={inputRef}
                type="text"
                role="combobox"
                aria-expanded={open}
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
                disabled={disabled}
                className="w-full h-full bg-transparent px-4 text-base text-white placeholder-gray-400 focus:outline-none"
              />
              <div className="flex items-center pr-3">
                {inputValue && (
                  <button type="button" onClick={handleClear} className="p-1 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10">
                    <X size={18} />
                  </button>
                )}
                <ChevronsUpDown className="h-5 w-5 shrink-0 opacity-50 text-gray-400 ml-1" />
              </div>
            </div>
          </Popover.Anchor>
        </div>
        <Popover.Content ref={popoverContentRef} className="w-[--radix-popover-trigger-width] p-0 mt-1.5" style={{ zIndex: 1000 }}>
          {open && (
            <Command className="bg-gradient-to-b from-gray-900/95 to-black/95 backdrop-blur-xl border border-gray-700 rounded-lg shadow-2xl">
              <CommandList>
                {filteredOptions.length === 0 && <CommandEmpty className="py-4 text-center text-base text-gray-400">No results found.</CommandEmpty>}
                <CommandGroup className="max-h-64 overflow-y-auto custom-scrollbar">
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => handleSelect(option)}
                      className="flex items-center justify-between px-4 py-3 text-base text-gray-200 aria-selected:bg-white/10 cursor-pointer hover:bg-white/5 transition-colors"
                    >
                      <span>{option}</span>
                      {value.toLowerCase() === option.toLowerCase() && (
                        <Check className="h-5 w-5 text-emerald-400" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          )}
        </Popover.Content>
      </Popover.Root>
      {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
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

  // Effect for Brand -> Model dependency
  useEffect(() => {
    // This effect runs when the brand changes. It resets the car model if the
    // currently selected model does not belong to the new brand.
    // It avoids resetting the model if the brand change was triggered by a model selection.
    if (selectedBrand && modelToBrand[selectedModel?.toLowerCase() ?? ''] !== selectedBrand) {
      setValue('car_model', '');
    }
  }, [selectedBrand, selectedModel, modelToBrand, setValue]);

  // Effect for Model -> Brand dependency
  useEffect(() => {
    if (selectedModel) {
      const brand = modelToBrand[selectedModel.toLowerCase()];
      if (brand && brand !== selectedBrand) {
        setValue('brand', brand);
      }
    }
  }, [selectedModel, modelToBrand, setValue, selectedBrand]);


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
            <Controller name="brand" control={control} render={({ field }) => (
              <Combobox
                label="Brand"
                options={dropdowns?.brand || []}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select Brand"
                error={errors.brand?.message}
              />
            )} />
            <Controller name="car_model" control={control} render={({ field }) => (
              <Combobox
                label="Car Model"
                options={currentModels}
                value={field.value}
                onChange={field.onChange}
                placeholder="Select Model"
                error={errors.car_model?.message}
              />
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <SliderField control={control} name="year_of_production" label="Year Of Production" min={dropdowns?.year_of_production?.min || 1980} max={dropdowns?.year_of_production?.max || new Date().getFullYear()} step={1} error={errors.year_of_production?.message} />
             <SliderField control={control} name="number_of_doors" label="Number Of Doors" min={dropdowns?.number_of_doors?.min || 2} max={dropdowns?.number_of_doors?.max || 7} step={1} error={errors.number_of_doors?.message} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormattedNumberField control={control} name="mileage" label="Mileage [km]" placeholder="e.g., 50000" error={errors.mileage?.message} />
            <FormattedNumberField control={control} name="engine_capacity" label="Engine Capacity [dm³]" placeholder="e.g., 1.8" error={errors.engine_capacity?.message} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormattedNumberField control={control} name="power" label="Power [HP]" placeholder="e.g., 140" error={errors.power?.message} />
            <Controller name="fuel_type" control={control} render={({ field }) => (
              <Combobox label="Fuel Type" options={dropdowns?.fuel_type || []} value={field.value} onChange={field.onChange} placeholder="Select Fuel Type" error={errors.fuel_type?.message} />
            )} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Controller name="transmission" control={control} render={({ field }) => (
              <Combobox label="Transmission" options={dropdowns?.transmission || []} value={field.value} onChange={field.onChange} placeholder="Select Transmission" error={errors.transmission?.message} />
            )} />
            <Controller name="body" control={control} render={({ field }) => (
              <Combobox label="Body Type" options={dropdowns?.body || []} value={field.value} onChange={field.onChange} placeholder="Select Body Type" error={errors.body?.message} />
            )} />
          </div>
          
          <Controller name="color" control={control} render={({ field }) => (
              <Combobox label="Color" options={dropdowns?.color || []} value={field.value} onChange={field.onChange} placeholder="Select Color" error={errors.color?.message} />
          )} />

          <motion.button
            type="submit"
            disabled={isLoading}
            whileHover={{ scale: isLoading ? 1 : 1.05 }}
            whileTap={{ scale: isLoading ? 1 : 0.95 }}
            className="relative overflow-hidden flex items-center justify-center gap-2 w-full px-8 py-4 text-white font-bold rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2" />
                Predicting...
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