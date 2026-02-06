import React from 'react';
import { Link } from 'react-router-dom';
import { Camera, ShieldCheck, Box } from 'lucide-react';
import { THEME } from '../../constants/theme';

/**
 * Auth Layout Component
 * Shared wrapper for Login/Signup/Forgot Password pages
 */
const AuthLayout = ({ children, title, subtitle, visualIcon }) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-0">
      <div className="w-full max-w-6xl h-auto lg:h-[800px] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row animate-in fade-in duration-500">
        
        {/* Left Side: Visual (Hidden on mobile/tablet) */}
        <div className="hidden lg:flex lg:w-1/2 bg-[#F5F7F2] relative flex-col justify-between p-12 overflow-hidden">
          {/* Abstract Shapes */}
          <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] bg-[#a3e635]/20 rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-blue-400/10 rounded-full blur-[80px]" />

          {/* Logo */}
          <Link 
            to="/"
            className="relative z-10 flex items-center gap-2 w-fit"
          >
            <div className="w-10 h-10 rounded-xl bg-[#a3e635] flex items-center justify-center shadow-md">
              <Camera className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-gray-800">
              Gudang<span className="text-[#65a30d]">AI</span>
            </span>
          </Link>

          {/* Central Illustration */}
          <div className="relative z-10 flex-1 flex items-center justify-center">
            <div className="w-full max-w-md aspect-square relative">
              {/* Decorative Elements */}
              <div className={`${THEME.glass} rounded-2xl p-6 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full shadow-2xl border border-white/80`}>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-lime-100 flex items-center justify-center text-lime-600">
                    {visualIcon || <ShieldCheck size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800">System Status</h3>
                    <p className="text-xs text-gray-500">All systems operational</p>
                  </div>
                  <div className="ml-auto">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 bg-gray-100 rounded-full w-3/4"></div>
                  <div className="h-2 bg-gray-100 rounded-full w-1/2"></div>
                  <div className="h-2 bg-gray-100 rounded-full w-5/6"></div>
                </div>
                
                {/* Floating Badge */}
                <div className="absolute -right-8 top-10 bg-white p-3 rounded-xl shadow-lg animate-bounce duration-[3000ms]">
                  <div className="flex items-center gap-2">
                    <Box size={16} className="text-blue-500" />
                    <span className="text-xs font-bold text-gray-700">Inventory +12%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quote */}
          <div className="relative z-10">
            <p className="text-gray-600 italic">
              "Gudang AI has completely transformed how we monitor our logistics fleet."
            </p>
            <p className="text-gray-900 font-bold mt-2 text-sm">
              - PT Logistik Indonesia
            </p>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-16 bg-white flex flex-col justify-center relative">
          <div className="max-w-md mx-auto w-full">
            {/* Mobile Header (Only visible on smaller screens) */}
            <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
              <Link 
                to="/"
                className="flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-[#a3e635] flex items-center justify-center">
                  <Camera className="text-white w-5 h-5" />
                </div>
                <span className="text-lg font-bold text-gray-800">
                  Gudang<span className="text-[#65a30d]">AI</span>
                </span>
              </Link>
            </div>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-2">{title}</h2>
              <p className="text-gray-500">{subtitle}</p>
            </div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
