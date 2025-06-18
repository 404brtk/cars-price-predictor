'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { LogIn } from 'lucide-react';

interface MotionInputProps {
  id: string;
  type: string;
  placeholder: string;
  label: string;
}

const MotionInput = ({ id, type, placeholder, label }: MotionInputProps) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-[#778DA9]">{label}</label>
    <motion.input
      id={id}
      type={type}
      placeholder={placeholder}
      whileFocus={{ scale: 1.02, boxShadow: '0 0 8px rgb(119, 141, 169, 0.5)' }}
      className="w-full bg-[#0D1B2A] border border-[#415A77] rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#778DA9] focus:outline-none transition-shadow duration-200 text-[#E0E1DD]"
    />
  </div>
);

const LoginPage = () => {
  return (
    <div className="min-h-[calc(100vh-200px)] w-full flex items-center justify-center py-12 bg-grid-[#1B263B]/[0.2]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="bg-[#1B263B] rounded-2xl shadow-2xl p-8 border border-[#415A77]/50">
          <h2 className="text-3xl font-bold text-center mb-8 text-[#E0E1DD]">Login</h2>
          <form className="space-y-6">
            <MotionInput id="email" type="email" placeholder="you@example.com" label="Email" />
            <MotionInput id="password" type="password" placeholder="••••••••" label="Password" />
            
            <motion.button 
              type="submit" 
              whileHover={{ scale: 1.03, boxShadow: '0px 5px 15px rgba(224, 225, 221, 0.2)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-[#E0E1DD] text-[#0D1B2A] font-bold py-3 rounded-lg flex items-center justify-center space-x-2">
              <LogIn size={20} />
              <span>Login</span>
            </motion.button>
          </form>
          <p className="text-center text-sm text-[#778DA9] mt-6">
            Don't have an account?{' '}
            <Link href="/register" className="font-medium text-[#E0E1DD] hover:underline">
              Register
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
