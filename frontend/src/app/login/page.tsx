'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LogIn, LoaderCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const MotionInput = ({ id, type, placeholder, label, value, onChange, required = false }: { id: string; type: string; placeholder: string; label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean }) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-[#778DA9]">{label}</label>
    <motion.input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      whileFocus={{ scale: 1.02, boxShadow: '0 0 8px rgb(119, 141, 169, 0.5)' }}
      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#778DA9] focus:outline-none transition-shadow duration-200 text-white backdrop-blur-xl"
    />
  </div>
);

export default function LoginPage() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await api.post('/login/', {
        username,
        password,
      });
      router.push('/predict');
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err.response && err.response.data && err.response.data.detail) {
        setError(err.response.data.detail);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
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
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-[#778DA9]">
          Welcome Back
        </h1>
        <p className="max-w-md mx-auto text-lg text-[#778DA9]">
          Sign in to access your account and start predicting.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6 text-left">
          <MotionInput 
            id="username" 
            type="text" 
            placeholder="your_username" 
            label="Username" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <MotionInput 
            id="password" 
            type="password" 
            placeholder="••••••••" 
            label="Password" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <motion.button
            type="submit"
            onMouseMove={handleMouseMove}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isLoading}
            className="relative overflow-hidden flex items-center justify-center gap-2 w-full px-8 py-4
            text-white font-bold rounded-full border border-white/20
            bg-white/10 backdrop-blur-xl shadow-md hover:shadow-lg
            transition-all duration-300 cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              className="absolute w-40 h-40 -translate-x-1/2 -translate-y-1/2 
                     bg-white/10 rounded-full pointer-events-none blur-2xl 
                     opacity-50 transition-opacity duration-300"
              style={{
                left: coords.x,
                top: coords.y,
              }}
            />
            <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 opacity-10 pointer-events-none rounded-full"></span>
            {isLoading ? (
              <>
                <LoaderCircle size={20} className="animate-spin relative z-10" />
                <span className="relative z-10">Logging in...</span>
              </>
            ) : (
              <>
                <span className="relative z-10">Login</span>
                <LogIn size={20} className="relative z-10" />
              </>
            )}
          </motion.button>
        </form>
        <p className="text-center text-sm text-[#778DA9]">
          Don't have an account?{' '}
          <Link href="/register" className="font-medium text-white hover:underline">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
