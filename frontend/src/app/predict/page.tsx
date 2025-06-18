'use client';

import React from 'react';

import { motion } from 'framer-motion';
import { Car } from 'lucide-react';

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

interface MotionSelectProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

const MotionSelect = ({ id, label, children }: MotionSelectProps) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-[#778DA9]">{label}</label>
    <motion.select
      id={id}
      whileFocus={{ scale: 1.02, boxShadow: '0 0 8px rgb(119, 141, 169, 0.5)' }}
      className="w-full bg-[#0D1B2A] border border-[#415A77] rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#778DA9] focus:outline-none transition-shadow duration-200 text-[#E0E1DD] appearance-none"
    >
      {children}
    </motion.select>
  </div>
);

const PredictPage = () => {
  return (
    <div className="min-h-[calc(100vh-200px)] w-full flex items-center justify-center py-12 bg-grid-[#1B263B]/[0.2]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-3xl mx-auto"
      >
        <div className="bg-[#1B263B] rounded-2xl shadow-2xl p-8 md:p-12 border border-[#415A77]/50">
          <h2 className="text-3xl font-bold text-center mb-8 text-[#E0E1DD]">Get a Price Prediction</h2>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionInput id="brand" type="text" placeholder="e.g., Ford" label="Brand" />
              <MotionInput id="car_model" type="text" placeholder="e.g., Focus" label="Model" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionInput id="year_of_production" type="number" placeholder="e.g., 2018" label="Year" />
              <MotionInput id="mileage" type="number" placeholder="e.g., 50000" label="Mileage (km)" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionSelect id="fuel_type" label="Fuel Type">
                <option>Petrol</option>
                <option>Diesel</option>
                <option>LPG</option>
                <option>Hybrid</option>
                <option>Electric</option>
              </MotionSelect>
              <MotionSelect id="transmission" label="Transmission">
                <option>Manual</option>
                <option>Automatic</option>
              </MotionSelect>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionInput id="body" type="text" placeholder="e.g., Sedan" label="Body Type" />
              <MotionInput id="engine_capacity" type="number" placeholder="e.g., 1596" label="Engine (cc)" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MotionInput id="power" type="number" placeholder="e.g., 125" label="Power (HP)" />
              <MotionInput id="number_of_doors" type="number" placeholder="e.g., 5" label="Doors" />
            </div>
            <MotionInput id="color" type="text" placeholder="e.g., Blue" label="Color" />

            <motion.button 
              type="submit" 
              whileHover={{ scale: 1.03, boxShadow: '0px 5px 15px rgba(224, 225, 221, 0.2)' }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-[#E0E1DD] text-[#0D1B2A] font-bold py-4 rounded-lg flex items-center justify-center space-x-2">
              <Car size={20} />
              <span>Predict Price</span>
            </motion.button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default PredictPage;
