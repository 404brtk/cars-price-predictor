import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { useFormContext, Controller } from 'react-hook-form';

interface AuthInputFieldProps extends Omit<HTMLMotionProps<'input'>, 'name'> {
  name: string;
  label: string;
  id: string;
}

const AuthInputField: React.FC<AuthInputFieldProps> = ({ name, id, label, ...props }) => {
  const { control, formState: { errors } } = useFormContext();
  const error = errors[name]?.message as string | undefined;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-[#778DA9]">{label}</label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <motion.input
            id={id}
            {...field}
            {...props}
            whileFocus={{ scale: 1.02, boxShadow: '0 0 8px rgb(119, 141, 169, 0.5)' }}
            className={`w-full bg-white/5 border rounded-lg px-4 py-3 focus:ring-2 focus:outline-none transition-shadow duration-200 text-white backdrop-blur-xl ${
              error
                ? 'border-red-500/50 focus:ring-red-500/70'
                : 'border-white/20 focus:ring-[#778DA9]'
            }`}
          />
        )}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
};

export default AuthInputField;
