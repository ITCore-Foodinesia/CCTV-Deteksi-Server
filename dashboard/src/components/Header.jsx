import React from 'react';
import { Video, Wifi, ShieldCheck, WifiOff } from 'lucide-react';

const Header = ({ connected, status }) => {
  const isConnected = status === 'Connected';
  const wsConnected = connected;

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
        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden border-2 border-white shadow-sm">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="User" />
        </div>
      </div>
    </header>
  );
};

export default Header;
