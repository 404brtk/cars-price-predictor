'use client';

import { Control, Controller } from 'react-hook-form';
import { InputContainer } from './InputContainer';
import { NumberInput } from './NumberInput';
import { PredictionFormData } from '@/lib/schema';

type FormattedNumberFieldProps = {
  control: Control<PredictionFormData>;
  name: 'mileage' | 'engine_capacity' | 'power';
  label: string;
  placeholder: string;
  error?: string;
};

export const FormattedNumberField = ({
  control,
  name,
  label,
  placeholder,
  error,
}: FormattedNumberFieldProps) => {
  const allowDecimals = name === 'engine_capacity';

  return (
    <div className="space-y-2">
      <label htmlFor={name} className="text-sm font-medium text-[#778DA9]">{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <InputContainer error={!!error}>
            <NumberInput
              id={name}
              placeholder={placeholder}
              allowDecimals={allowDecimals}
              {...field}
            />
          </InputContainer>
        )}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};
