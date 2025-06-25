import { Control, useController } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { InputContainer } from './InputContainer';
import { FormData } from '@/lib/schema';

export const FormattedNumberField = ({ control, name, label, placeholder, error }: { control: Control<FormData>; name: 'mileage' | 'engine_capacity' | 'power'; label: string; placeholder: string; error?: string; }) => {
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
