/**
 * Sidebar Component (React Router Version)
 * Fixed sidebar for desktop navigation with grouped menu items
 * Uses React Router's Link and useLocation for navigation
 * 
 * Accessibility:
 * - Proper ARIA labels and roles
 * - Keyboard navigation support
 * - Visible focus states
 * - Screen reader announcements for active items
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock, Warehouse } from 'lucide-react';
import { NAVIGATION } from '../constants/navigation';

// Constants for strings (prevents hardcoding)
const STRINGS = {
  brandName: 'GUDANG DRIVER',
  brandSubtitle: 'Admin Panel',
  systemOnline: 'System Online',
  comingSoon: '(Coming Soon)',
  lockedItem: 'Fitur ini belum tersedia',
};

/**
 * Logo component with proper SVG instead of emoji
 */
const BrandLogo = () => (
  <div 
    className="grid h-10 w-10 place-items-center rounded-2xl bg-[#84CC16] text-white shadow-sm"
    aria-hidden="true"
  >
    <Warehouse className="h-5 w-5" />
  </div>
);

/**
 * Navigation Item for disabled/locked features
 */
const DisabledNavItem = ({ item }) => {
  const Icon = item.icon;
  
  return (
    <div
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        text-gray-400 cursor-not-allowed opacity-60
        ${item.indent ? 'pl-6' : ''}
      `}
      role="menuitem"
      aria-disabled="true"
      aria-label={`${item.label} - ${STRINGS.lockedItem}`}
      title={STRINGS.lockedItem}
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span className="flex-1 text-left">{item.label}</span>
      <Lock className="h-3.5 w-3.5 text-gray-300" aria-hidden="true" />
    </div>
  );
};

/**
 * Navigation Item for enabled/active features
 */
const EnabledNavItem = ({ item, isActive }) => {
  const Icon = item.icon;
  
  return (
    <Link
      to={item.path}
      className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
        transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2
        ${item.indent ? 'pl-6' : ''}
        ${isActive
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }
      `}
      role="menuitem"
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon 
        className={`h-5 w-5 ${isActive ? 'text-emerald-600' : ''}`} 
        aria-hidden="true" 
      />
      <span className="flex-1 text-left">{item.label}</span>
    </Link>
  );
};

/**
 * Navigation Group with accessible structure
 */
const NavGroup = ({ group, location }) => (
  <div role="group" aria-labelledby={`nav-group-${group.group}`}>
    {/* Group Label */}
    <div 
      id={`nav-group-${group.group}`}
      className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider"
    >
      {group.label}
      {!group.enabled && (
        <span className="ml-1 text-xs text-gray-300 normal-case">
          {STRINGS.comingSoon}
        </span>
      )}
    </div>

    {/* Group Items */}
    <div className="space-y-1" role="menu">
      {group.items.map((item) => {
        const isActive = location.pathname === item.path;
        const isDisabled = !item.enabled;

        if (isDisabled) {
          return <DisabledNavItem key={item.key} item={item} />;
        }

        return (
          <EnabledNavItem 
            key={item.key} 
            item={item} 
            isActive={isActive} 
          />
        );
      })}
    </div>
  </div>
);

/**
 * System Status Indicator
 */
const SystemStatus = () => (
  <div className="flex items-center gap-2 text-xs text-gray-400">
    <span 
      className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" 
      aria-hidden="true"
    />
    <span>{STRINGS.systemOnline}</span>
  </div>
);

/**
 * Main Sidebar Component
 */
const Sidebar = () => {
  const location = useLocation();

  return (
    <aside 
      className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo/Brand */}
      <div className="px-4 py-4 border-b border-gray-100">
        <Link
          to="/dashboard"
          className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2 rounded-xl"
          aria-label={`${STRINGS.brandName} - Go to dashboard`}
        >
          <BrandLogo />
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {STRINGS.brandName}
            </div>
            <div className="text-xs text-gray-500">
              {STRINGS.brandSubtitle}
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav 
        className="flex-1 overflow-y-auto px-2 py-4 space-y-6"
        aria-label="Sidebar navigation"
      >
        {NAVIGATION.map((group) => (
          <NavGroup 
            key={group.group} 
            group={group} 
            location={location} 
          />
        ))}
      </nav>

      {/* Footer */}
      <div 
        className="px-4 py-3 border-t border-gray-100"
        role="status"
        aria-live="polite"
      >
        <SystemStatus />
      </div>
    </aside>
  );
};

export default Sidebar;
