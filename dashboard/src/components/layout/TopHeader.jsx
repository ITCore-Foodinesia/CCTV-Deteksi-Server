/**
 * TopHeader Component
 * Sticky header with mobile menu, connection status, notifications, and user profile
 */

import React from 'react';
import { Menu, Bell, Wifi, WifiOff } from 'lucide-react';

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

const TopHeader = ({ connected, onMenuClick, pageTitle = 'Dashboard' }) => {
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

        {/* Profile */}
        <button className="rounded-xl bg-[#1A2E35] px-3 py-2 text-sm font-semibold text-white hover:bg-[#243a42] transition-colors">
          <span className="hidden sm:inline">👤 Admin Demo</span>
          <span className="sm:hidden">👤</span>
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
