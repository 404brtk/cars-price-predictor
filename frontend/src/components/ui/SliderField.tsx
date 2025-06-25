import { Control, useController } from 'react-hook-form';
import * as SliderPrimitive from '@radix-ui/react-slider';
import { FormData } from '@/lib/schema';

export const SliderField = ({ control, name, label, min, max, step, error }: { control: Control<FormData>; name: 'year_of_production' | 'number_of_doors'; label: string; min: number; max: number; step: number; error?: string; }) => {
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
