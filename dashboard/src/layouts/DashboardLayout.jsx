/**
 * DashboardLayout Component
 * Main layout for authenticated dashboard pages using React Router
 * Uses Outlet for nested route rendering
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import MobileDrawer from './MobileDrawer';

const DashboardLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { connected } = useWebSocket();

  return (
    <div className="flex min-h-screen bg-[#F9FAFB]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Drawer */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopHeader
          connected={connected}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        
        {/* Content - React Router Outlet */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
