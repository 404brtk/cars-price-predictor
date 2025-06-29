'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { UserPlus, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';

import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { RegisterSchema, RegisterFormData } from '@/lib/schema';
import AuthInputField from '@/components/ui/AuthInputField';
import { ActionButton } from '@/components/ui/ActionButton';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [apiError, setApiError] = useState<string | null>(null);

  const methods = useForm<RegisterFormData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { username: '', email: '', password: '', password2: '' },
  });

  const { handleSubmit, formState: { isSubmitting } } = methods;

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  if (isAuthLoading || isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-200px)] px-4">
        <LoaderCircle size={48} className="animate-spin text-[#778DA9]" />
      </div>
    );
  }



  const onSubmit = async (data: RegisterFormData) => {
    setApiError(null);
    try {
      await api.post('/register/', data);
      sessionStorage.setItem('registrationSuccess', 'true');
      router.push('/login');
    } catch (err) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      if (err instanceof AxiosError && err.response?.data) {
        const errorData = err.response.data as Record<string, string[]>;
        const errorMessages = Object.values(errorData).flat();
        if (errorMessages.length > 0) {
          errorMessage = errorMessages[0];
        }
      }
      setApiError(errorMessage);
      console.error('Registration failed:', err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-200px)] px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="space-y-6 w-full max-w-md mt-10"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-[#778DA9]">
          Create Your Account
        </h1>
        <p className="max-w-md mx-auto text-lg text-[#778DA9]">
          Join now to predict car prices using our AI model <br />
          and save all your predictions!
        </p>

        <FormProvider {...methods}>
          <form className="space-y-6 text-left" onSubmit={handleSubmit(onSubmit)}>
            {apiError && <p className="text-red-400 text-center font-semibold">{apiError}</p>}
            <AuthInputField
              id="username"
              name="username"
              type="text"
              placeholder="your_username"
              label="Username"
            />
            <AuthInputField
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              label="Email"
            />
            <AuthInputField
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              label="Password"
            />
            <AuthInputField
              id="password2"
              name="password2"
              type="password"
              placeholder="••••••••"
              label="Confirm Password"
            />

            <ActionButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Creating Account..."
              Icon={UserPlus}
              className="w-full mt-4"
            >
              Create Account
            </ActionButton>

            <p className="text-center text-sm text-[#778DA9]">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-white hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </FormProvider>
      </motion.div>
    </div>
  );
}
