/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Noto Sans JP', 'Inter', 'sans-serif'],
        bebas: ['var(--font-bebas-neue)', 'Bebas Neue', 'sans-serif'],
        inter: ['var(--font-inter)', 'Inter', 'sans-serif'],
        noto: ['var(--font-noto)', 'Noto Sans JP', 'sans-serif'],
      },
      animation: {
        'ray-pulse': 'ray-pulse 8s ease-in-out infinite',
        'orb-pulse': 'orb-pulse 8s ease-in-out infinite',
        'orb-pulse-center': 'orb-pulse-center 8s ease-in-out infinite',
        'ticker-scroll': 'ticker-scroll 25s linear infinite',
      },
      keyframes: {
        'ray-pulse': {
          '0%, 100%': { opacity: '0.1', height: '30vmax' },
          '50%': { opacity: '0.4', height: '50vmax' },
        },
        'orb-pulse': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.3)', opacity: '0.8' },
        },
        'orb-pulse-center': {
          '0%, 100%': {
            transform: 'translate(-50%, -50%) scale(1)',
            opacity: '0.5',
          },
          '50%': {
            transform: 'translate(-50%, -50%) scale(1.3)',
            opacity: '0.8',
          },
        },
        'ticker-scroll': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      transitionDuration: {
        '400': '400ms',
      },
      boxShadow: {
        'glow-cyan': '0 0 50px rgba(6, 182, 212, 0.7), 0 0 100px rgba(6, 182, 212, 0.3)',
        'glow-dark': '0 0 20px rgba(15, 23, 42, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-gradient': 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%)',
      },
    },
  },
  plugins: [],
}
