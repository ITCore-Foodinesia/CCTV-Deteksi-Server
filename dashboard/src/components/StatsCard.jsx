import React from 'react';

/**
 * Color class mappings for Tailwind
 * Dynamic class construction won't work with Tailwind's purge
 * So we define explicit mappings for text colors
 */
const ICON_TO_VALUE_COLOR = {
  'text-emerald-600': 'text-emerald-800',
  'text-rose-600': 'text-rose-800',
  'text-blue-600': 'text-blue-800',
  'text-amber-600': 'text-amber-800',
  'text-orange-600': 'text-orange-800',
  'text-purple-600': 'text-purple-800',
  'text-gray-600': 'text-gray-800',
  'text-sky-600': 'text-sky-800',
  'text-lime-600': 'text-lime-800',
  'text-cyan-600': 'text-cyan-800',
  'text-teal-600': 'text-teal-800',
  'text-indigo-600': 'text-indigo-800',
  'text-pink-600': 'text-pink-800',
  'text-red-600': 'text-red-800',
};

/**
 * StatsCard Component
 * 
 * Displays a statistics card with icon, label, value, and optional badge
 * Supports compact mode for smaller displays
 * 
 * @param {Object} props
 * @param {Component} props.icon - Lucide icon component
 * @param {string} props.label - Card label text
 * @param {string|number} props.value - Main value to display
 * @param {string} props.badge - Optional badge text
 * @param {string} props.bgColor - Background color class (e.g., 'bg-emerald-50')
 * @param {string} props.iconColor - Icon color class (e.g., 'text-emerald-600')
 * @param {string} props.badgeColor - Badge background color class
 * @param {boolean} props.compact - Use compact mode (default: false)
 * @param {boolean} props.isAnimated - Animate the icon (default: false)
 */
const StatsCard = ({ 
  icon: Icon, 
  label, 
  value, 
  badge, 
  bgColor, 
  iconColor, 
  badgeColor, 
  compact = false, 
  isAnimated = false 
}) => {
  // Get value color from mapping, fallback to icon color if not found
  const valueColor = ICON_TO_VALUE_COLOR[iconColor] || iconColor;

  return (
    <article
      className={`${bgColor} border ${compact ? 'p-3 rounded-xl' : 'p-4 rounded-3xl'} flex flex-col relative overflow-hidden group focus-within:ring-2 focus-within:ring-lime-500`}
      role="region"
      aria-labelledby={`stats-label-${label?.replace(/\s+/g, '-').toLowerCase()}`}
    >
      {/* Background decorative icon (hidden from screen readers) */}
      <div 
        className={`absolute right-0 top-0 ${compact ? 'p-2' : 'p-3'} opacity-10 group-hover:opacity-20 transition-opacity`}
        aria-hidden="true"
      >
        <Icon className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} ${iconColor} ${isAnimated ? 'animate-spin' : ''}`} />
      </div>

      {/* Primary icon (visible top left) */}
      <div 
        className={`${compact ? 'mb-1' : 'mb-2'}`} 
        aria-hidden="true"
      >
        <Icon className={`${compact ? 'w-5 h-5' : 'w-8 h-8'} ${iconColor} ${isAnimated ? 'animate-spin' : ''}`} />
      </div>

      {/* Label - min 12px font size */}
      <span 
        id={`stats-label-${label?.replace(/\s+/g, '-').toLowerCase()}`}
        className={`${compact ? 'text-xs' : 'text-xs'} font-bold ${iconColor} uppercase tracking-wider mb-1`}
      >
        {label}
      </span>

      {/* Value - main statistic */}
      <span 
        className={`${compact ? 'text-lg sm:text-xl' : 'text-3xl'} font-black ${valueColor} truncate`}
        aria-live="polite"
      >
        {value}
      </span>

      {/* Badge - status or additional info */}
      {badge && (
        <span 
          className={`${compact ? 'text-xs mt-1' : 'text-xs mt-2'} ${iconColor} ${badgeColor} self-start px-2 py-0.5 rounded-lg`}
          role="status"
        >
          {badge}
        </span>
      )}
    </article>
  );
};

export default StatsCard;
