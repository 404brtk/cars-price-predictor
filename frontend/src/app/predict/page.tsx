'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

const MotionInput = ({ id, type, placeholder, label }: { id: string; type: string; placeholder: string; label: string }) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-[#778DA9]">{label}</label>
    <motion.input
      id={id}
      type={type}
      placeholder={placeholder}
      whileFocus={{ scale: 1.02, boxShadow: '0 0 8px rgb(119, 141, 169, 0.5)' }}
      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#778DA9] focus:outline-none transition-shadow duration-200 text-white backdrop-blur-xl"
    />
  </div>
);

const MotionSelect = ({ id, label, children }: { id: string; label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label htmlFor={id} className="text-sm font-medium text-[#778DA9]">{label}</label>
    <motion.select
      id={id}
      whileFocus={{ scale: 1.02, boxShadow: '0 0 8px rgb(119, 141, 169, 0.5)' }}
      className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 focus:ring-2 focus:ring-[#778DA9] focus:outline-none transition-shadow duration-200 text-white appearance-none backdrop-blur-xl"
    >
      {children}
    </motion.select>
  </div>
);

export default function PredictPage() {
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };
  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-200px)] px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="space-y-6 w-full max-w-3xl"
      >
        <h1 className="text-4xl md:text-5xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-[#778DA9]">
          Predict Car Price
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-[#778DA9]">
          Fill in the details below to get a market value prediction for your car.
        </p>

        <form className="space-y-6 text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MotionInput id="brand" type="text" placeholder="e.g., Ford" label="Brand" />
            <MotionInput id="car_model" type="text" placeholder="e.g., Focus" label="Car Model" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MotionInput id="year_of_production" type="number" placeholder="e.g., 2018" label="Year Of Production" />
            <MotionInput id="mileage" type="number" placeholder="e.g., 50000" label="Mileage [km]" />
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
            <MotionInput id="engine_capacity" type="number" placeholder="e.g., 1596" label="Engine Capacity [dm³]" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MotionInput id="power" type="number" placeholder="e.g., 125" label="Power [HP]" />
            <MotionInput id="number_of_doors" type="number" placeholder="e.g., 5" label="Number Of Doors" />
          </div>
          <MotionInput id="color" type="text" placeholder="e.g., Blue" label="Color" />

          <motion.button
            type="submit"
            onMouseMove={handleMouseMove}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative overflow-hidden flex items-center justify-center gap-2 w-full px-8 py-4
            text-white font-bold rounded-full border border-white/20
            bg-white/10 backdrop-blur-xl shadow-md hover:shadow-lg
            transition-all duration-300 cursor-pointer group"
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
            <span className="relative z-10">Predict Price</span>
            <Zap size={20} className="relative z-10" />
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
