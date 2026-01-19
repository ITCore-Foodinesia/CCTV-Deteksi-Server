/**
 * Theme Constants for GudangAI Monitor
 * Centralized design tokens for consistent styling
 */

export const THEME = {
  colors: {
    bg: 'bg-[#F5F7F2]',
    primary: 'bg-[#a3e635]', // Lime-400
    primaryHover: 'hover:bg-[#84cc16]', // Lime-500
    primaryText: 'text-gray-800',
    secondaryText: 'text-gray-500',
    accentBlue: 'text-[#3b82f6]',
    accentEmerald: 'text-[#10b981]',
    accentRose: 'text-[#f43f5e]',
  },
  glass: 'bg-white/60 backdrop-blur-md border border-white/60 shadow-xl',
  glassCard: 'bg-white/70 backdrop-blur-lg border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300',
  input: 'w-full px-4 py-3 rounded-xl bg-white/50 border border-gray-200 focus:border-[#a3e635] focus:ring-2 focus:ring-[#a3e635]/50 focus:outline-none transition-all placeholder-gray-400 text-gray-800',
  button: 'w-full py-3 px-6 rounded-xl font-semibold shadow-lg shadow-lime-300/50 transition-all active:scale-95 flex items-center justify-center gap-2',
};

export default THEME;
