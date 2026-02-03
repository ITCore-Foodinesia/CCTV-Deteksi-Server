/**
 * Sidebar Component (React Router Version)
 * Fixed sidebar for desktop navigation with grouped menu items
 * Uses React Router's Link and useLocation for navigation
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { NAVIGATION } from '../constants/navigation';

const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white">
      {/* Logo/Brand */}
      <div className="px-4 py-4 border-b border-gray-100">
        <Link to="/app/dashboard" className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#84CC16] text-white shadow-sm text-lg">
            🏭
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">GUDANG DRIVER</div>
            <div className="text-xs text-gray-500">Admin Panel</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        {NAVIGATION.map((group) => (
          <div key={group.group}>
            {/* Group Label */}
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {group.label}
              {!group.enabled && (
                <span className="ml-1 text-[10px] text-gray-300 normal-case">(Coming Soon)</span>
              )}
            </div>

            {/* Group Items */}
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                const isDisabled = !item.enabled;

                if (isDisabled) {
                  // Disabled item - render as div with lock icon
                  return (
                    <div
                      key={item.key}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        text-gray-400 cursor-not-allowed opacity-60
                        ${item.indent ? 'pl-6' : ''}
                      `}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="flex-1 text-left">{item.label}</span>
                      <Lock className="h-3.5 w-3.5 text-gray-300" />
                    </div>
                  );
                }

                // Enabled item - render as Link
                return (
                  <Link
                    key={item.key}
                    to={item.path}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-200
                      ${item.indent ? 'pl-6' : ''}
                      ${isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : ''}`} />
                    <span className="flex-1 text-left">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
          <span>System Online</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
