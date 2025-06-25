import { Control, useController } from 'react-hook-form';
import { useState, useMemo } from 'react';
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions, ComboboxButton } from '@headlessui/react';
import { Loader2, Check, ChevronsUpDown } from 'lucide-react';
import { InputContainer } from './InputContainer';
import { FormData } from '@/lib/schema';
import { cn } from '@/lib/utils';

type ComboBoxFieldProps = {
  control: Control<FormData>;
  name: keyof FormData;
  label: string;
  options: readonly string[];
  placeholder: string;
  disabled?: boolean;
  loading?: boolean;
};

export const ComboBoxField = ({
  control,
  name,
  label,
  options,
  placeholder,
  disabled = false,
  loading = false,
}: ComboBoxFieldProps) => {
  const { field, fieldState: { error } } = useController({ name, control });

  const [query, setQuery] = useState('');

  const filteredOptions = useMemo(() => {
    const results = query === ''
      ? options
      : options.filter(option =>
          option.toLowerCase().includes(query.toLowerCase())
        );
    return results.slice(0, 100);
  }, [options, query]);

  return (
    <div className="space-y-2">
      <label htmlFor={`${name}-combobox`} className="text-sm font-medium text-[#778DA9]">{label}</label>
      <Combobox
        immediate
        value={String(field.value ?? '')}
        onChange={field.onChange}
        onClose={() => setQuery('')}
        disabled={disabled || loading}
      >
        <div className="relative">
          <InputContainer error={!!error}>
            <ComboboxInput
              id={`${name}-combobox`}
              className="w-full px-4 py-3 pr-10 bg-transparent text-white placeholder:text-gray-500 focus:outline-none"
              displayValue={(value) => String(value ?? '')}
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
          <ComboboxOptions
              anchor={{ to: 'bottom start', gap: '0.25rem' }}
              className="w-[var(--input-width)] rounded-md bg-black/50 backdrop-blur-lg text-base shadow-lg ring-1 ring-white/10 focus:outline-none sm:text-sm z-10"
            >
              <div className="custom-scrollbar max-h-60 overflow-auto py-1">
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
              </div>
          </ComboboxOptions>
        </div>
      </Combobox>
      {error && <p className="text-xs text-red-400 mt-1">{error.message}</p>}
    </div>
  );
};
