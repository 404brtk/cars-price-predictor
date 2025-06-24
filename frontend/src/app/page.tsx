'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    buttonRef.current.style.setProperty('--x', `${x}px`);
    buttonRef.current.style.setProperty('--y', `${y}px`);
  };

  return (
    <div className="flex flex-col items-center justify-center text-center min-h-[calc(100vh-200px)] px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut' }}
        className="space-y-6"
      >
        <h1 className="text-5xl md:text-7xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-br from-white to-[#778DA9]">
          cars-price-predictor
        </h1>
        <p className="max-w-2xl mx-auto text-lg text-[#778DA9]">
          Our machine learning model was trained on thousands of car listings to accurately predict market values.
          Simply enter your car's details, and our AI will estimate its market price.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: 'easeInOut', delay: 0.2 }}
        className="mt-10"
      >
        <Link href="/predict">
          <motion.button
            ref={buttonRef}
            onMouseMove={handleMouseMove}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative overflow-hidden flex items-center justify-center gap-2 px-8 py-4
            text-white font-bold rounded-full border border-white/20
            bg-white/10 backdrop-blur-xl shadow-md hover:shadow-lg
            transition-all duration-300 cursor-pointer group"
          >
            {/* gradient spot that follows the mouse */}
            <span
              className="absolute w-40 h-40 -translate-x-1/2 -translate-y-1/2 
                     bg-white/10 rounded-full pointer-events-none blur-2xl 
                     opacity-50 transition-opacity duration-300"
              style={{
                left: 'var(--x)',
                top: 'var(--y)',
              }}
            />
            {/* soft sheen overlay */}
            <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 opacity-10 pointer-events-none rounded-full"></span>
            <span className="relative z-10">Start Predicting</span>
            <ArrowRight size={35} className="relative z-10" />
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
