/**
 * DashboardShell Component
 * Main layout wrapper for authenticated dashboard pages
 * Combines Sidebar, TopHeader, MobileDrawer, and content area
 */

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import MobileDrawer from './MobileDrawer';

/**
 * Get page title from page key
 */
const getPageTitle = (currentPage) => {
  const titles = {
    'dashboard-overview': 'Dashboard',
    'live-streaming': 'Live Streaming',
    'drivers': 'Drivers',
    'trucks': 'Trucks',
    'docks': 'Docks',
    'helpers': 'Helpers',
    'loaders': 'Loaders',
    'sessions': 'Loading Sessions',
    'history': 'History',
    'notifications': 'Notifications',
    'cameras': 'Cameras',
    'users': 'Users & Roles',
    'settings': 'Settings',
    'reports': 'Reports',
    'analytics': 'Analytics',
  };
  return titles[currentPage] || 'Dashboard';
};

const DashboardShell = ({ children, currentPage, onNavigate, connected = false }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Desktop Sidebar */}
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={onNavigate} 
      />

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        currentPage={currentPage}
        onNavigate={onNavigate}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          connected={connected}
          onMenuClick={() => setMobileMenuOpen(true)}
          pageTitle={getPageTitle(currentPage)}
        />
        
        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
