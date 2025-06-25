'use client';

import { Github } from 'lucide-react';
import { motion } from 'framer-motion';

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full py-6 border-t border-white/25 bg-transparent font-sans">
      <div className="w-full px-8 md:px-20 flex flex-col md:flex-row justify-between items-center bg-gradient-to-br from-white to-[#778DA9] text-transparent bg-clip-text text-sm md:text-base">
        
        {/* left side */}
        <p className="text-center md:text-left w-full md:w-auto">
          &copy; {year} <span className="font-semibold">cars-price-predictor</span>. All rights reserved.
        </p>

        {/* right side */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-end">
          <p className="text-center">
            Made by{' '}
            <a 
              href="https://github.com/404brtk" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-semibold hover:underline hover:text-[#E0E1DD]"
            >
              404brtk
            </a>
          </p>
          <motion.a 
            href="https://github.com/404brtk/used-cars-price-predictor" 
            target="_blank" 
            rel="noopener noreferrer"
            aria-label="GitHub Repository"
            whileHover={{ scale: 1.15 }}
            transition={{ duration: 0.2 }}
            className="text-[#778DA9] hover:text-[#E0E1DD]"
          >
            <Github size={24} />
          </motion.a>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
