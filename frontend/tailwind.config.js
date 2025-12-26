/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Spotify-inspired dark palette
        background: {
          DEFAULT: '#121212',
          elevated: '#181818',
          highlight: '#282828',
        },
        surface: {
          DEFAULT: '#181818',
          hover: '#282828',
          active: '#333333',
        },
        primary: {
          DEFAULT: '#1DB954',
          hover: '#1ED760',
          muted: '#1DB95433',
        },
        text: {
          DEFAULT: '#FFFFFF',
          muted: '#B3B3B3',
          subdued: '#6A6A6A',
        },
        border: {
          DEFAULT: '#333333',
          muted: '#282828',
        },
        error: {
          DEFAULT: '#E91429',
          muted: '#E9142933',
        },
        warning: {
          DEFAULT: '#FFA42B',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      spacing: {
        sidebar: '240px',
        'sidebar-collapsed': '72px',
        header: '64px',
      },
    },
  },
  plugins: [],
};
