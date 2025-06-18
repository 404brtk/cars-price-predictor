'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-[#E0E1DD] text-[#0D1B2A] font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <span>Get Started</span>
            <ArrowRight size={20} />
          </motion.button>
        </Link>
      </motion.div>
    </div>
  );
}
