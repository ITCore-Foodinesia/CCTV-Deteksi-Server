import React, { useState } from 'react';
import { Video, Wifi, ShieldCheck, WifiOff, LogOut, ChevronDown } from 'lucide-react';

const Header = ({ connected, status, onNavigate }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const isConnected = status === 'Connected';
  const wsConnected = connected;

  const handleLogout = () => {
    // In production, clear auth tokens here
    if (onNavigate) {
      onNavigate('landing');
    }
  };

  return (
    <header className="flex justify-between items-center mb-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-lime-400 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-lime-300/50">
          <Video className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 leading-none">Gudang AI Monitor</h1>
          <p className="text-xs text-gray-500 font-medium mt-1 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {isConnected ? 'System Online' : 'System Offline'} • CCTV Gate 1
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center bg-white/60 px-4 py-2 rounded-2xl border border-white/60 gap-3 text-xs font-bold text-gray-500">
          <span className="flex items-center gap-1">
            {wsConnected ? (
              <><Wifi className="w-3 h-3 text-green-500" /> WebSocket: Connected</>
            ) : (
              <><WifiOff className="w-3 h-3 text-red-500" /> WebSocket: Disconnected</>
            )}
          </span>
          <span className="h-3 w-px bg-gray-300"></span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-blue-500" /> AI Model: YOLOv8-Pro
          </span>
        </div>
        
        {/* User Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 hover:bg-white/50 rounded-full p-1 transition-colors"
            aria-label="User menu"
            aria-expanded={showDropdown}
          >
            <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" />
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 hidden md:block transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
          
          {/* Dropdown Menu */}
          {showDropdown && (
            <>
              {/* Backdrop to close dropdown */}
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800">Admin User</p>
                  <p className="text-xs text-gray-500">admin@gudang.ai</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4 text-gray-400" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
