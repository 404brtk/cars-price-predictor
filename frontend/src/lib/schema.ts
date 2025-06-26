import * as z from 'zod';
import { DropdownOptions } from '@/app/api/services';

// Schema for the prediction form
export const createFormSchema = (dropdowns: DropdownOptions | null) => z.object({
  brand: z.string().nullable().transform(val => val ?? '').refine(val => val.length > 0, 'Brand is required.'),
  car_model: z.string().nullable().transform(val => val ?? '').refine(val => val.length > 0, 'Car model is required.'),
  year_of_production: z.number()
    .min(dropdowns?.year_of_production?.min ?? 1960, `Year must be at least ${dropdowns?.year_of_production?.min ?? 1960}.`)
    .max(new Date().getFullYear(), `Year cannot be after ${new Date().getFullYear()}.`),
  mileage: z.number().positive('Mileage is required.'),
  fuel_type: z.string().nullable().transform(val => val ?? '').refine(val => val.length > 0, 'Fuel type is required.'),
  transmission: z.string().nullable().transform(val => val ?? '').refine(val => val.length > 0, 'Transmission is required.'),
  body: z.string().nullable().transform(val => val ?? '').refine(val => val.length > 0, 'Body type is required.'),
  engine_capacity: z.number().min(0.1, 'Engine capacity is required.').max(20, 'Engine capacity seems too high.'),
  power: z.number().min(10, 'Power seems too low.').max(1000, 'Power seems too high.'),
  number_of_doors: z.number()
    .min(dropdowns?.number_of_doors?.min ?? 2, `Must have at least ${dropdowns?.number_of_doors?.min ?? 2} doors.`)
    .max(dropdowns?.number_of_doors?.max ?? 7, `Cannot have more than ${dropdowns?.number_of_doors?.max ?? 7} doors.`),
  color: z.string().nullable().transform(val => val ?? '').refine(val => val.length > 0, 'Color is required.'),
});

// Schema for the login form
export const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required.'),
  password: z.string().min(1, 'Password is required.'),
});

// Schema for the registration form
export const RegisterSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters long.'),
  email: z.string().email('Invalid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters long.'),
  password2: z.string(),
}).refine(data => data.password === data.password2, {
  message: "Passwords don't match",
  path: ['password2'], // path of error
});


// TypeScript types inferred from schemas
export type PredictionFormData = z.infer<ReturnType<typeof createFormSchema>>;
export type LoginFormData = z.infer<typeof LoginSchema>;
export type RegisterFormData = z.infer<typeof RegisterSchema>;