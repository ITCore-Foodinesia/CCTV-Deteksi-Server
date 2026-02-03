/**
 * TopHeader Component (React Router Version)
 * Sticky header with mobile menu, connection status, notifications, and user profile
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, Bell, Wifi, WifiOff, User, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Connection Indicator - shows WebSocket connection status
 */
const ConnectionIndicator = ({ connected }) => (
  <div className={`
    flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium
    ${connected 
      ? 'bg-emerald-50 text-emerald-700' 
      : 'bg-red-50 text-red-700'
    }
  `}>
    {connected ? (
      <>
        <Wifi className="h-4 w-4" />
        <span className="hidden sm:inline">Connected</span>
      </>
    ) : (
      <>
        <WifiOff className="h-4 w-4" />
        <span className="hidden sm:inline">Disconnected</span>
      </>
    )}
  </div>
);

/**
 * Get page title from pathname
 */
const getPageTitle = (pathname) => {
  const titles = {
    '/app/dashboard': 'Dashboard',
    '/app/live-streaming': 'Live Streaming',
    '/app/drivers': 'Drivers',
    '/app/trucks': 'Trucks',
    '/app/docks': 'Docks',
    '/app/helpers': 'Helpers',
    '/app/loaders': 'Loaders',
    '/app/sessions': 'Loading Sessions',
    '/app/history': 'History',
    '/app/notifications': 'Notifications',
    '/app/cameras': 'Cameras',
    '/app/users': 'Users & Roles',
    '/app/settings': 'Settings',
    '/app/reports': 'Reports',
    '/app/analytics': 'Analytics',
  };
  return titles[pathname] || 'Dashboard';
};

const TopHeader = ({ connected, onMenuClick }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Mobile menu button */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden rounded-xl p-2 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </button>

        {/* Page Title (mobile) */}
        <h1 className="lg:hidden text-lg font-semibold text-gray-900">
          {pageTitle}
        </h1>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Connection status */}
        <ConnectionIndicator connected={connected} />

        {/* Notifications */}
        <button 
          className="relative rounded-xl p-2 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-gray-600" />
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            3
          </span>
        </button>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setProfileOpen(!profileOpen)}
            className="rounded-xl bg-[#1A2E35] px-3 py-2 text-sm font-semibold text-white hover:bg-[#243a42] transition-colors flex items-center gap-2"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">
              {user?.user_metadata?.full_name || user?.email || 'Admin Demo'}
            </span>
          </button>

          {/* Dropdown Menu */}
          {profileOpen && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setProfileOpen(false)}
              />
              
              {/* Menu */}
              <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-gray-200 bg-white p-2 shadow-lg z-20">
                <div className="px-3 py-2 border-b border-gray-100 mb-2">
                  <div className="text-sm font-semibold text-gray-900">
                    {user?.user_metadata?.full_name || 'Admin Demo'}
                  </div>
                  <div className="text-xs text-gray-500">
                    {user?.email || 'demo@gudangai.com'}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate('/app/settings');
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
