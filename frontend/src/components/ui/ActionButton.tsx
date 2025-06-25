'use client';

import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, LucideIcon } from 'lucide-react';

// Combine props from motion.button and standard button, but define our own children
type ButtonProps = React.ComponentProps<typeof motion.button>;

interface ActionButtonProps extends ButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  Icon?: LucideIcon;
  iconSize?: number;
  loadingText?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  children,
  isLoading = false,
  Icon,
  iconSize = 20,
  loadingText = "Please wait...",
  className,
  ...props
}) => {
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
    <motion.button
      ref={buttonRef}
      disabled={isLoading}
      onMouseMove={handleMouseMove}
      whileHover={{ scale: isLoading ? 1 : 1.05 }}
      whileTap={{ scale: isLoading ? 1 : 0.95 }}
      className={`relative overflow-hidden flex items-center justify-center gap-2 w-full mt-8 px-8 py-4 text-white font-bold rounded-full border border-white/20 bg-white/10 backdrop-blur-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer group disabled:opacity-60 disabled:cursor-not-allowed ${className || ''}`}
      {...props}
    >
      <span
        className="absolute w-40 h-40 -translate-x-1/2 -translate-y-1/2 
                   bg-white/10 rounded-full pointer-events-none blur-2xl 
                   opacity-0 group-hover:opacity-50 transition-opacity duration-300"
        style={{
          left: 'var(--x)',
          top: 'var(--y)',
        }}
      />
      <span className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/5 opacity-10 pointer-events-none rounded-full"></span>
      
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={isLoading ? 'loading' : 'ready'}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                <span>{loadingText}</span>
              </> 
            ) : (
              <>
                <span>{children}</span>
                {Icon && <Icon size={iconSize} />}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.button>
  );
};