'use client';

import React, { useState, useEffect, forwardRef } from 'react';

// --- UTILITY FUNCTIONS ---
const formatInteger = (numStr: string): string => {
  const number = parseInt(numStr.replace(/\s/g, ''), 10);
  return isNaN(number) ? '' : new Intl.NumberFormat('sv-SE').format(number);
};

const parseFormattedValue = (value: string, allowDecimals: boolean): string => {
  let rawValue = value;
  if (allowDecimals) {
    rawValue = rawValue.replace(/,/g, '.');
  } else {
    rawValue = rawValue.replace(/\s/g, '');
  }

  if (rawValue.length > 1 && rawValue.startsWith('0') && !rawValue.startsWith('0.')) {
    return rawValue.substring(1);
  }

  const isValid = allowDecimals ? /^\d*\.?\d*$/.test(rawValue) : /^\d*$/.test(rawValue);
  return isValid ? rawValue : '';
};

// --- COMPONENT PROPS ---
interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: string | number;
  onChange: (value: number | string) => void;
  allowDecimals?: boolean;
  outputEmptyAs?: 'zero' | 'empty-string';
}

// --- MAIN COMPONENT ---
export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>((
  { value, onChange, allowDecimals = false, outputEmptyAs = 'zero', ...props },
  ref
) => {
  const [displayValue, setDisplayValue] = useState('');

  // Effect to format the value from the parent state for display
  useEffect(() => {
    const stringValue = String(value || '');
    if (stringValue) {
      if (allowDecimals) {
        setDisplayValue(stringValue);
      } else {
        setDisplayValue(formatInteger(stringValue));
      }
    } else {
      setDisplayValue('');
    }
  }, [value, allowDecimals]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = parseFormattedValue(e.target.value, allowDecimals);

    if (parsedValue !== '' || e.target.value === '') {
      if (!allowDecimals && parsedValue) {
        setDisplayValue(formatInteger(parsedValue));
      } else {
        setDisplayValue(parsedValue);
      }

      // Notify parent with the correct value type
      if (parsedValue === '') {
        onChange(outputEmptyAs === 'zero' ? 0 : '');
      } else {
        if (allowDecimals) {
          onChange(parsedValue); // Pass string for decimals in progress
        } else {
          onChange(parseInt(parsedValue, 10));
        }
      }
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (allowDecimals) {
      const valueToParse = e.target.value;
      if (valueToParse) {
        onChange(parseFloat(valueToParse) || 0);
      } else {
        onChange(outputEmptyAs === 'zero' ? 0 : '');
      }
    }
    
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <input
      {...props}
      ref={ref}
      type="text" // Use text to allow for formatting characters
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      value={displayValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      className={props.className || "w-full px-4 py-3 bg-transparent text-white placeholder:text-gray-500 focus:outline-none"}
    />
  );
});

NumberInput.displayName = 'NumberInput';
