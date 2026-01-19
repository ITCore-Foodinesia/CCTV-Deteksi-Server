import React, { useState } from 'react';
import { Video, Wifi, ShieldCheck, WifiOff, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Header = ({ connected, status, onNavigate }) => {
  const { user, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  const isConnected = status === 'Connected';
  const wsConnected = connected;

  // Get user display info from Supabase user object
  const userEmail = user?.email || 'user@example.com';
  const userFullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  // Generate avatar seed from user id or email for consistent avatar
  const avatarSeed = user?.id || userEmail;

  const handleLogout = async () => {
    setIsSigningOut(true);
    const result = await signOut();
    
    if (result.success) {
      // Navigate to landing page after logout
      if (onNavigate) {
        onNavigate('landing');
      }
    } else {
      console.error('Logout failed:', result.error);
      // Still navigate even if there's an error (session might already be invalid)
      if (onNavigate) {
        onNavigate('landing');
      }
    }
    setIsSigningOut(false);
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
              <img 
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`} 
                alt="User avatar" 
              />
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
              <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-800 truncate">{userFullName}</p>
                  <p className="text-xs text-gray-500 truncate">{userEmail}</p>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isSigningOut}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isSigningOut ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                      Signing out...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 text-gray-400" />
                      Sign Out
                    </>
                  )}
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
