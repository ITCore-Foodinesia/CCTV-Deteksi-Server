/**
 * MobileDrawer Component
 * Slide-in overlay drawer for mobile navigation
 */

import React, { useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { NAVIGATION } from '../../constants/navigation';

const MobileDrawer = ({ open, onClose, currentPage, onNavigate }) => {
  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const handleNavigate = (page) => {
    onNavigate(page);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-out">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#84CC16] text-white shadow-sm text-lg">
              🏭
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">GUDANG DRIVER</div>
              <div className="text-xs text-gray-500">Admin Panel</div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-xl p-2 hover:bg-gray-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
          {NAVIGATION.map((group) => (
            <div key={group.group}>
              {/* Group Label */}
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {group.label}
                {group.group !== 'main' && (
                  <span className="ml-1 text-[10px] text-gray-300 normal-case">(Coming Soon)</span>
                )}
              </div>

              {/* Group Items */}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.page;
                  const isDisabled = !item.enabled;

                  return (
                    <button
                      key={item.key}
                      onClick={() => item.enabled && handleNavigate(item.page)}
                      disabled={isDisabled}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        transition-all duration-200
                        ${item.indent ? 'pl-6' : ''}
                        ${isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isDisabled
                            ? 'text-gray-400 cursor-not-allowed opacity-60'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-emerald-600' : ''}`} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {isDisabled && (
                        <Lock className="h-3.5 w-3.5 text-gray-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
            <span>System Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileDrawer;
