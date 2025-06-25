'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Car, Menu, X, User, LogOut } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent, AnimatePresence } from 'framer-motion';
import type { FC, ReactNode } from 'react';

// Type definitions
interface UserType {
  id: number;
  username: string;
  email: string;
}

interface NavLinkProps {
  href: string;
  children: ReactNode;
  currentPath: string;
  onClick?: () => void;
}

interface AuthSectionProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: UserType | null;
  onLogout: () => void;
  pathname: string;
  variant: 'desktop' | 'mobile';
}

// Sub-component for the site logo
const Logo: FC = () => (
  <Link href="/" className="group z-50">
    <motion.div
      className="flex items-center gap-2"
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
    >
      <Car className="text-[#E0E1DD] transition-colors duration-200 group-hover:text-white" size={28} />
      <span className="text-xl font-bold tracking-tight text-transparent bg-gradient-to-br from-[#E0E1DD] to-white bg-clip-text transition-colors duration-200 group-hover:text-white">
        cars-price-predictor
      </span>
    </motion.div>
  </Link>
);

// Sub-component for a single navigation link
const NavLink: FC<NavLinkProps> = ({ href, children, currentPath, onClick }) => (
  <Link
    href={href}
    onClick={onClick}
    className={`relative text-base font-medium transition-colors ${
      currentPath === href ? 'text-white' : 'text-[#A9B8CE] hover:text-white'
    }`}
  >
    {children}
    {currentPath === href && (
      <motion.div
        className="absolute -bottom-1.5 left-0 right-0 h-0.5 bg-white rounded-full"
        layoutId="underline"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      />
    )}
  </Link>
);

// Sub-component for the authentication section, handling both desktop and mobile variants
const AuthSection: FC<AuthSectionProps> = ({ isLoading, isAuthenticated, user, onLogout, pathname, variant }) => {
  const isDesktop = variant === 'desktop';

  if (isLoading) {
    return <div className={`rounded-lg bg-white/10 animate-pulse ${isDesktop ? 'h-9 w-36' : 'h-12 w-48'}`}></div>;
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center ${isDesktop ? 'gap-4' : 'flex-col gap-6'}`}>
        <div className={`flex items-center ${isDesktop ? 'gap-2' : 'gap-3'} text-white font-medium`}>
          <User size={isDesktop ? 18 : 22} />
          <span className={isDesktop ? '' : 'text-2xl font-bold'}>{user.username}</span>
        </div>
        <motion.button
          onClick={onLogout}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`flex items-center justify-center gap-2 cursor-pointer rounded-lg border backdrop-blur-sm transition-colors ${isDesktop ? 'border-white/20 px-4 py-2 text-sm bg-white/10' : 'w-48 border-white/20 px-5 py-3 text-lg bg-white/10'} text-[#E0E1DD] hover:bg-red-500/20 hover:border-red-500/50`}
        >
          <LogOut size={isDesktop ? 16 : 20} />
          <span>Logout</span>
        </motion.button>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${isDesktop ? 'gap-3' : 'flex-col gap-6'}`}>
      <Link href="/login">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`cursor-pointer rounded-lg border backdrop-blur-sm transition-colors ${isDesktop ? `border-white/20 px-4 py-2 text-sm ${pathname === '/login' ? 'bg-white/20' : 'bg-white/10'}` : `w-48 border-white/20 px-5 py-3 text-lg ${pathname === '/login' ? 'bg-white/20' : 'bg-white/10'}`} text-[#E0E1DD] hover:bg-white/20`}
        >
          Login
        </motion.button>
      </Link>
      <Link href="/register">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`cursor-pointer rounded-lg border-transparent backdrop-blur-sm transition-colors ${isDesktop ? 'px-4 py-2 text-sm' : 'w-48 px-5 py-3 text-lg'} text-[#0D1B2A] ${pathname === '/register' ? 'bg-white' : 'bg-[#E0E1DD] bg-opacity-80 hover:bg-opacity-100'}`}
        >
          Register
        </motion.button>
      </Link>
    </div>
  );
};

// Main Header Component
const Header: FC = () => {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => {
    const previous = scrollY.getPrevious();
    if (previous !== undefined && latest > previous && latest > 150) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    if (isOpen) setIsOpen(false);
  });

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleMobileLogout = async () => {
    await handleLogout();
    setIsOpen(false);
  };

  const toggleMenu = () => setIsOpen(!isOpen);

  const navItems = [
    { name: 'Home', href: '/' },
    { name: 'Predict', href: '/predict' },
    ...(isAuthenticated ? [{ name: 'History', href: '/history' }] : []),
  ];

  return (
    <motion.header
      variants={{ visible: { y: 0 }, hidden: { y: '-100%' } }}
      animate={hidden ? 'hidden' : 'visible'}
      transition={{ duration: 0.35, ease: 'easeInOut' }}
      className="sticky top-0 z-50 w-full bg-transparent backdrop-blur-lg shadow-lg shadow-black/20 border border-white/20"
    >
      <nav className="container mx-auto px-2 sm:px-4 lg:px-6 py-3 flex justify-between items-center">
        <Logo />

        <div className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <NavLink key={item.name} href={item.href} currentPath={pathname}>
              {item.name}
            </NavLink>
          ))}
          <div className="w-px h-6 bg-[#415A77]"></div>
          <AuthSection {...{ isLoading, isAuthenticated, user, onLogout: handleLogout, pathname, variant: 'desktop' }} />
        </div>

        <div className="md:hidden z-50">
          <motion.button onClick={toggleMenu} whileTap={{ scale: 0.95 }}>
            <AnimatePresence initial={false} mode="wait">
              <motion.div
                key={isOpen ? 'x' : 'menu'}
                initial={{ rotate: 45, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -45, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {isOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
              </motion.div>
            </AnimatePresence>
          </motion.button>
        </div>

        <AnimatePresence>
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
              <AuthSection {...{ isLoading, isAuthenticated, user, onLogout: handleMobileLogout, pathname, variant: 'mobile' }} />
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </motion.header>
  );
};

export default Header;
