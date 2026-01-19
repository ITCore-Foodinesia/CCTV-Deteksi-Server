import React, { useState, useEffect } from 'react';
import { Camera, Menu, X } from 'lucide-react';
import { THEME } from '../../constants/theme';

/**
 * Navigation Bar Component
 * Responsive navbar with mobile menu and scroll effects
 */
const Navbar = ({ onNavigate, currentPage }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (page) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/80 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <div 
          onClick={() => handleNavClick('landing')}
          className="flex items-center gap-2 cursor-pointer group"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleNavClick('landing')}
        >
          <div className="w-10 h-10 rounded-xl bg-[#a3e635] flex items-center justify-center shadow-lg shadow-lime-300/50 group-hover:scale-105 transition-transform">
            <Camera className="text-white w-6 h-6" />
          </div>
          <span className="text-xl font-bold text-gray-800 tracking-tight">
            Gudang<span className="text-[#65a30d]">AI</span>
          </span>
        </div>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <a 
            href="#features" 
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Features
          </a>
          <a 
            href="#pricing" 
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Pricing
          </a>
          <a 
            href="#reviews" 
            className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Reviews
          </a>
          
          <button 
            onClick={() => handleNavClick('login')}
            className={`${THEME.colors.primary} ${THEME.colors.primaryHover} text-gray-900 px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-lime-300/40 transition-transform hover:-translate-y-0.5`}
          >
            Login
          </button>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden text-gray-800 p-2"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-100 p-6 flex flex-col gap-4 shadow-xl animate-in slide-in-from-top-5">
          <a 
            href="#features" 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="text-gray-600 py-2 font-medium"
          >
            Features
          </a>
          <a 
            href="#pricing" 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="text-gray-600 py-2 font-medium"
          >
            Pricing
          </a>
          <a 
            href="#reviews" 
            onClick={() => setIsMobileMenuOpen(false)} 
            className="text-gray-600 py-2 font-medium"
          >
            Reviews
          </a>
          
          <button 
            onClick={() => handleNavClick('login')}
            className={`${THEME.colors.primary} w-full py-3 rounded-xl font-bold shadow-md text-gray-900`}
          >
            Login
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
