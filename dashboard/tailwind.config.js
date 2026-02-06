/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Custom animations for landing page effects
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-from-left': {
          '0%': { transform: 'translateX(-2.5rem)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(2.5rem)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-1.25rem)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'zoom-in': {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in-left': 'slide-in-from-left 0.7s ease-out',
        'slide-in-right': 'slide-in-from-right 1s ease-out',
        'slide-in-top': 'slide-in-from-top 0.5s ease-out',
        'zoom-in': 'zoom-in 0.5s ease-out',
      },
    },
  },
  plugins: [
    // Plugin for animate-in utility class
    function({ addUtilities, theme }) {
      addUtilities({
        '.animate-in': {
          animationFillMode: 'both',
        },
        '.fade-in': {
          animation: theme('animation.fade-in'),
        },
        '.slide-in-from-left-10': {
          animation: theme('animation.slide-in-left'),
        },
        '.slide-in-from-right-10': {
          animation: theme('animation.slide-in-right'),
        },
        '.slide-in-from-top-5': {
          animation: theme('animation.slide-in-top'),
        },
        '.zoom-in-95': {
          animation: theme('animation.zoom-in'),
        },
      });
    },
  ],
}
