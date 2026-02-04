/**
 * Theme Constants for GudangAI Monitor
 * Centralized design tokens for consistent styling
 * 
 * Usage:
 * import { THEME, BORDER_RADIUS, SPACING } from '@/constants/theme';
 */

/**
 * Border Radius Tokens
 * Standardized radii for consistent rounded corners across the app
 * 
 * Usage in Tailwind: rounded-${token}
 * - sm: Small elements like badges, chips
 * - md: Buttons, inputs
 * - lg: Cards, modals
 * - xl: Large cards, panels
 * - 2xl: Dashboard sections
 * - 3xl: Major containers
 * - full: Circles, pills
 */
export const BORDER_RADIUS = {
  none: 'rounded-none',    // 0px
  sm: 'rounded-sm',        // 2px
  md: 'rounded-md',        // 6px
  lg: 'rounded-lg',        // 8px
  xl: 'rounded-xl',        // 12px
  '2xl': 'rounded-2xl',    // 16px
  '3xl': 'rounded-3xl',    // 24px
  full: 'rounded-full',    // 9999px
  
  // Component-specific tokens (semantic)
  button: 'rounded-xl',
  input: 'rounded-xl',
  card: 'rounded-2xl',
  modal: 'rounded-2xl',
  badge: 'rounded-full',
  avatar: 'rounded-full',
  chip: 'rounded-lg',
  tooltip: 'rounded-lg',
};

/**
 * Spacing Tokens
 * Consistent spacing scale based on 4px grid
 */
export const SPACING = {
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  '3xl': '4rem',   // 64px
};

/**
 * Typography Tokens
 * Minimum font size is 12px (text-xs) for WCAG compliance
 */
export const TYPOGRAPHY = {
  // Font sizes (minimum 12px)
  xs: 'text-xs',           // 12px - minimum readable
  sm: 'text-sm',           // 14px - body small
  base: 'text-base',       // 16px - body default
  lg: 'text-lg',           // 18px - large body
  xl: 'text-xl',           // 20px - heading small
  '2xl': 'text-2xl',       // 24px - heading medium
  '3xl': 'text-3xl',       // 30px - heading large
  '4xl': 'text-4xl',       // 36px - display
  
  // Font weights
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
  black: 'font-black',
};

/**
 * Color Palette
 */
export const COLORS = {
  // Primary brand colors
  primary: {
    50: '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',
    500: '#84cc16', // Main primary
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#3f6212',
    900: '#365314',
  },
  
  // Neutral/Gray
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Semantic colors
  success: '#10b981',  // Emerald-500
  warning: '#f59e0b',  // Amber-500
  error: '#ef4444',    // Red-500
  info: '#3b82f6',     // Blue-500
  
  // Background
  background: '#F5F7F2',
  backgroundLight: '#F9FAFB',
  
  // Dark theme base
  dark: '#1A2E35',
};

/**
 * Status Badge Classes
 * Pre-defined status colors for Tailwind (no dynamic class construction)
 */
export const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  pending: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  suspended: 'bg-red-100 text-red-800 ring-1 ring-red-200',
  inactive: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
  online: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  offline: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
  loading: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
  unloading: 'bg-orange-100 text-orange-800 ring-1 ring-orange-200',
  completed: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
  cancelled: 'bg-gray-100 text-gray-800 ring-1 ring-gray-200',
  waiting: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
};

/**
 * Dock Status Colors
 */
export const DOCK_STATUS_COLORS = {
  available: 'border-emerald-500 bg-emerald-50 text-emerald-900',
  loading: 'border-orange-500 bg-orange-50 text-orange-900',
  unloading: 'border-orange-500 bg-orange-50 text-orange-900',
  maintenance: 'border-red-500 bg-red-50 text-red-900',
  reserved: 'border-blue-500 bg-blue-50 text-blue-900',
  closed: 'border-gray-500 bg-gray-50 text-gray-900',
};

/**
 * Focus Ring Classes
 * Consistent focus states for accessibility
 */
export const FOCUS_STYLES = {
  ring: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-offset-2',
  ringInset: 'focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-500 focus-visible:ring-inset',
  border: 'focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20',
};

/**
 * Shadow Tokens
 */
export const SHADOWS = {
  sm: 'shadow-sm',
  md: 'shadow-md',
  lg: 'shadow-lg',
  xl: 'shadow-xl',
  glass: 'shadow-xl',
  none: 'shadow-none',
};

/**
 * Main THEME object (legacy support)
 * Combines all tokens for backward compatibility
 */
export const THEME = {
  colors: {
    // Existing colors (keep for backward compat)
    bg: 'bg-[#F5F7F2]',
    primary: 'bg-[#a3e635]',
    primaryHover: 'hover:bg-[#84cc16]',
    primaryText: 'text-gray-800',
    secondaryText: 'text-gray-500',
    accentBlue: 'text-[#3b82f6]',
    accentEmerald: 'text-[#10b981]',
    accentRose: 'text-[#f43f5e]',

    // New theme additions
    dark: '#1A2E35',
    primaryLime: '#84CC16',
    primaryLimeDark: '#4D7C0F',
    accent: '#10B981',
    bgLight: '#F9FAFB',
  },

  // Dock status colors
  dockStatus: DOCK_STATUS_COLORS,

  // Border radius
  radius: BORDER_RADIUS,

  // Focus styles
  focus: FOCUS_STYLES,

  // Component styles
  glass: 'bg-white/60 backdrop-blur-md border border-white/60 shadow-xl',
  glassCard: 'bg-white/70 backdrop-blur-lg border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300',
  input: 'w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/50 focus:outline-none transition-all placeholder-gray-400 text-gray-800',
  button: 'w-full py-3 px-6 rounded-xl font-semibold shadow-lg shadow-lime-300/50 transition-all active:scale-95 flex items-center justify-center gap-2',

  // Layout styles
  sidebar: 'hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white',
  topHeader: 'sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur',
  mainContent: 'flex-1 p-4 lg:p-6',
};

export default THEME;
