/**
 * Theme Constants for GudangAI Monitor
 * Centralized design tokens for consistent styling
 */

export const THEME = {
  colors: {
    // Existing colors (keep)
    bg: 'bg-[#F5F7F2]',
    primary: 'bg-[#a3e635]', // Lime-400
    primaryHover: 'hover:bg-[#84cc16]', // Lime-500
    primaryText: 'text-gray-800',
    secondaryText: 'text-gray-500',
    accentBlue: 'text-[#3b82f6]',
    accentEmerald: 'text-[#10b981]',
    accentRose: 'text-[#f43f5e]',

    // New theme additions (Industrial-Professional)
    dark: '#1A2E35',
    primaryLime: '#84CC16',
    primaryLimeDark: '#4D7C0F',
    accent: '#10B981',
    bgLight: '#F9FAFB',
  },

  // Status colors for dock cards
  dockStatus: {
    available: 'border-emerald-500 bg-emerald-50 text-emerald-900',
    loading: 'border-orange-500 bg-orange-50 text-orange-900',
    maintenance: 'border-red-500 bg-red-50 text-red-900',
    reserved: 'border-blue-500 bg-blue-50 text-blue-900',
    closed: 'border-gray-500 bg-gray-50 text-gray-900',
  },

  // Existing styles (keep)
  glass: 'bg-white/60 backdrop-blur-md border border-white/60 shadow-xl',
  glassCard: 'bg-white/70 backdrop-blur-lg border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300',
  input: 'w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/50 focus:outline-none transition-all placeholder-gray-400 text-gray-800',
  button: 'w-full py-3 px-6 rounded-xl font-semibold shadow-lg shadow-lime-300/50 transition-all active:scale-95 flex items-center justify-center gap-2',

  // New layout styles
  sidebar: 'hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white',
  topHeader: 'sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur',
  mainContent: 'flex-1 p-4 lg:p-6',
};

export default THEME;
