'use client';

import React from 'react';
import { NumberInput } from './NumberInput';

interface FilterInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FilterInput = ({ label, type, value, onChange, ...props }: FilterInputProps) => {
  const handleNumberChange = (numericValue: number | string) => {
    if (onChange) {
      // Create a synthetic event to match the expected signature for the parent form handler
      const event = {
        target: { value: String(numericValue) },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium text-[#778DA9] mb-2 block">{label}</label>
      {type === 'number' ? (
        <NumberInput
          value={String(value || '')}
          onChange={handleNumberChange}
          allowDecimals={false}
          outputEmptyAs='empty-string' // Ensure empty input is not treated as 0
          className="w-full px-3 py-2 bg-white/5 rounded-md border border-white/20 focus:border-[#778DA9] focus:ring-2 focus:ring-[#778DA9]/50 focus:outline-none transition-colors placeholder-gray-500"
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={onChange}
          className="w-full px-3 py-2 bg-white/5 rounded-md border border-white/20 focus:border-[#778DA9] focus:ring-2 focus:ring-[#778DA9]/50 focus:outline-none transition-colors placeholder-gray-500"
          {...props}
        />
      )}
    </div>
  );
};

export default FilterInput;
