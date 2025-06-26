'use client';

import React from 'react';

interface FilterInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const FilterInput = ({ label, type, value, onChange, ...props }: FilterInputProps) => {
  const isFormattedNumberInput = type === 'number';

  const formatNumber = (numStr: string) => {
    // Remove non-digit characters to correctly parse the number
    const number = parseInt(numStr.replace(/\s/g, ''), 10);
    return isNaN(number) ? '' : new Intl.NumberFormat('sv-SE').format(number);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFormattedNumberInput) {
      // Get raw value and remove thousand separators
      let rawValue = e.target.value.replace(/\s/g, '');

      // Remove leading zero if not the only digit
      if (rawValue.length > 1 && rawValue.startsWith('0')) {
        rawValue = rawValue.substring(1);
      }

      // Only allow digits
      if (/^\d*$/.test(rawValue)) {
        // Create a synthetic event with the raw numeric value for the parent handler
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: rawValue,
          },
        };
        if (onChange) {
          onChange(syntheticEvent);
        }
      }
    } else {
      // For other input types, pass the event directly
      if (onChange) {
        onChange(e);
      }
    }
  };

  // Format the value from state for display in the input
  const displayValue = isFormattedNumberInput && typeof value === 'string' && value
    ? formatNumber(value)
    : value;

  return (
    <div>
      <label className="text-sm font-medium text-[#778DA9] mb-2 block">{label}</label>
      <input
        {...props}
        type={isFormattedNumberInput ? 'text' : type} // Use 'text' to allow for formatted spaces
        inputMode={isFormattedNumberInput ? 'numeric' : undefined}
        value={displayValue || ''}
        onChange={handleInputChange}
        className="w-full px-3 py-2 bg-white/5 rounded-md border border-white/20 focus:border-[#778DA9] focus:ring-2 focus:ring-[#778DA9]/50 focus:outline-none transition-colors placeholder-gray-500"
      />
    </div>
  );
};

export default FilterInput;
