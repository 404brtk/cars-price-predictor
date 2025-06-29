'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LogIn, LoaderCircle, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';

import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { LoginSchema, LoginFormData } from '@/lib/schema';
import AuthInputField from '@/components/ui/AuthInputField';
import { ActionButton } from '@/components/ui/ActionButton';

export default function LoginPage() {
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();
  const { login, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('registrationSuccess') === 'true') {
      setIsRegistered(true);
      sessionStorage.removeItem('registrationSuccess');
    }
  }, []);

  const methods = useForm<LoginFormData>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { username: '', password: '' },
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



  const onSubmit = async (data: LoginFormData) => {
    setApiError(null);
    try {
      const response = await api.post('/login/', data);
      if (response.data && response.data.user) {
        login(response.data.user);
      } else {
        setApiError('Login failed: Invalid response from server.');
      }
    } catch (err) {
      console.error('Login failed:', err);
      if (err instanceof AxiosError && err.response?.data?.detail) {
        setApiError(err.response.data.detail);
      } else {
        setApiError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-200px)] px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="space-y-6 w-full max-w-md"
      >
        {isRegistered && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-green-900/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-lg flex items-center text-center mb-6"
            >
                <CheckCircle className="h-5 w-5 mr-3" />
                <span>Registration successful! You can now sign in.</span>
            </motion.div>
        )}
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-[#778DA9]">
          Welcome Back
        </h1>
        <p className="max-w-md mx-auto text-lg text-[#778DA9]">
          Sign in to access your account and start predicting.
        </p>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 text-left">
            <AuthInputField 
              id="username" 
              name="username"
              type="text" 
              placeholder="your_username" 
              label="Username" 
            />
            <AuthInputField 
              id="password" 
              name="password"
              type="password" 
              placeholder="••••••••" 
              label="Password" 
            />

            {apiError && <p className="text-red-400 text-sm text-center">{apiError}</p>}

            <ActionButton
              type="submit"
              isLoading={isSubmitting}
              loadingText="Signing In..."
              Icon={LogIn}
              className="w-full mt-4"
            >
              Sign In
            </ActionButton>

            <p className="text-center text-sm text-[#778DA9]">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-semibold text-white hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </FormProvider>
      </motion.div>
    </div>
  );
}
