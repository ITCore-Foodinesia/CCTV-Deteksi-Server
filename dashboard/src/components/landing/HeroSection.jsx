import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Truck } from 'lucide-react';
import { THEME } from '../../constants/theme';

/**
 * Hero Section Component
 * Main landing page hero with visual demonstration
 */
const HeroSection = () => {
  return (
    <header className="pt-32 pb-20 px-6 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-20 right-[-10%] w-[500px] h-[500px] bg-[#a3e635]/20 rounded-full blur-[100px] -z-10" />
      <div className="absolute bottom-0 left-[-5%] w-[300px] h-[300px] bg-blue-400/10 rounded-full blur-[80px] -z-10" />

      <div className="container mx-auto grid lg:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <div className="space-y-8 animate-in slide-in-from-left-10 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 border border-lime-200 text-lime-700 font-medium text-sm backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-lime-500"></span>
            </span>
            Now with YOLOv8 Object Detection
          </div>
          
          <h1 className="text-5xl lg:text-6xl font-extrabold text-gray-900 leading-[1.1]">
            The Eye of Your <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#65a30d] to-[#a3e635]">
              Smart Warehouse
            </span>
          </h1>
          
          <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
            Transform standard CCTV into an AI-powered analytics engine. Monitor inventory, track trucks, and secure your facility in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Link 
              to="/signup"
              className={`${THEME.colors.primary} ${THEME.colors.primaryHover} px-8 py-4 rounded-xl text-gray-900 font-bold shadow-xl shadow-lime-300/40 hover:-translate-y-1 transition-all text-center`}
            >
              Get Started Free
            </Link>
            <button className="px-8 py-4 rounded-xl bg-white text-gray-700 font-bold border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center justify-center gap-2">
              <Activity className="w-5 h-5 text-gray-400" />
              Live Demo
            </button>
          </div>
          
          {/* Mini Stats */}
          <div className="pt-8 flex items-center gap-8 border-t border-gray-200/60">
            <div>
              <p className="text-2xl font-bold text-gray-900">99.9%</p>
              <p className="text-sm text-gray-500">Uptime</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">50+</p>
              <p className="text-sm text-gray-500">Warehouses</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">10k+</p>
              <p className="text-sm text-gray-500">Daily Detections</p>
            </div>
          </div>
        </div>

        {/* Hero Visual */}
        <div className="relative animate-in slide-in-from-right-10 duration-1000">
          <div className={`${THEME.glass} p-4 rounded-3xl relative z-10`}>
            {/* Fake Dashboard UI */}
            <div className="bg-gray-900 rounded-2xl overflow-hidden aspect-video relative group">
              {/* Overlay UI */}
              <div className="absolute top-4 left-4 z-20 flex gap-2">
                <span className="bg-red-500/90 text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" /> LIVE
                </span>
                <span className="bg-black/50 backdrop-blur-md text-white text-xs px-2 py-1 rounded-md font-mono">
                  CAM-01: LOADING DOCK
                </span>
              </div>
              
              {/* Bounding Boxes Visualization */}
              <div className="absolute top-1/2 left-1/3 w-24 h-32 border-2 border-[#a3e635] rounded-sm bg-[#a3e635]/10 flex items-start justify-center">
                <span className="bg-[#a3e635] text-black text-[10px] font-bold px-1 absolute -top-4 left-[-2px]">Person 98%</span>
              </div>
              <div className="absolute bottom-1/4 right-1/4 w-40 h-24 border-2 border-blue-500 rounded-sm bg-blue-500/10">
                 <span className="bg-blue-500 text-white text-[10px] font-bold px-1 absolute -top-4 left-[-2px]">Box 92%</span>
              </div>

              {/* Grid Lines for style */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
              
              {/* Bottom Bar */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-4 flex justify-between items-center">
                <div className="flex gap-4 text-xs text-gray-300 font-mono">
                  <span>IN: 142</span>
                  <span>OUT: 89</span>
                  <span className="text-[#a3e635]">FPS: 30</span>
                </div>
                <Activity className="text-[#a3e635] w-5 h-5" />
              </div>
            </div>
          </div>
          
          {/* Decoration Card */}
          <div className={`absolute -bottom-6 -left-6 ${THEME.glass} p-4 rounded-2xl z-20 w-48 animate-bounce delay-700 duration-[3000ms]`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500">Vehicle Detected</p>
                <p className="text-sm font-bold text-gray-800">B 1234 CD</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeroSection;
