'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Car, Menu, X } from 'lucide-react';
import { motion, useScroll } from 'framer-motion';

const navItems = [
  { name: 'Home', href: '/' },
  { name: 'Predict', href: '/predict' },
];


const Header = () => {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);

  const { scrollY } = useScroll();

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      const previous = scrollY.getPrevious();
      if (previous !== undefined && latest > previous && latest > 150) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      if (isOpen) {
        setIsOpen(false);
      }
    });
  
    return () => unsubscribe();
  }, [scrollY, isOpen]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <motion.header
      variants={{
        visible: { y: 0 },
        hidden: { y: '-100%' },
      }}
      animate={hidden ? 'hidden' : 'visible'}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-lg shadow-lg shadow-black/20 border border-white/20"
    >
      <nav className="max-w-screen-xl mx-auto px-4 md:px-8 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 z-50">
          <Car className="text-[#E0E1DD]" size={28} />
          <span className="text-xl font-bold text-[#E0E1DD] tracking-tight">cars-price-predictor</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`relative text-base font-medium transition-colors ${
                pathname === item.href
                  ? 'text-white'
                  : 'text-[#A9B8CE] hover:text-white'
              }`}
            >
              {item.name}
              {pathname === item.href && (
                <motion.div
                  className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-white rounded-full"
                  layoutId="underline"
                  initial={false}
                />
              )}
            </Link>
          ))}
          <div className="w-px h-6 bg-[#415A77]"></div>
          <div className="flex items-center gap-3">
             <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-[#778DA9] text-[#E0E1DD] bg-transparent hover:bg-[#778DA9] hover:text-[#0D1B2A] transition-colors"
              >
                Login
              </motion.button>
            </Link>
            <Link href="/register">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-[#E0E1DD] text-[#0D1B2A] hover:bg-opacity-90 transition-colors"
              >
                Register
              </motion.button>
            </Link>
          </div>
        </div>

        <div className="md:hidden z-50">
          <motion.button onClick={toggleMenu} whileTap={{ scale: 0.95 }}>
            {isOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
          </motion.button>
        </div>

        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 bg-[#0D1B2A]/95 backdrop-blur-xl z-40 flex flex-col items-center justify-center space-y-8"
          >
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={toggleMenu}
                className="text-3xl font-bold text-white"
              >
                {item.name}
              </Link>
            ))}
            <div className="w-24 h-px bg-[#415A77]"></div>
            <div className="flex flex-col items-center space-y-4">
               <Link href="/login" onClick={toggleMenu}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-48 px-5 py-3 text-lg bg-transparent border border-[#778DA9] text-[#E0E1DD] rounded-lg hover:bg-[#778DA9] hover:text-[#0D1B2A] transition-colors"
                >
                  Login
                </motion.button>
              </Link>
              <Link href="/register" onClick={toggleMenu}>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-48 px-5 py-3 text-lg bg-[#E0E1DD] text-[#0D1B2A] rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  Register
                </motion.button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>
    </motion.header>
  );
};

export default Header;
