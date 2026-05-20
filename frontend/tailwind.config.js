/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7C3AED',
        secondary: '#8B5CF6',
        accent: '#059669',
        background: '#FAF5FF',
        foreground: '#0F172A',
        muted: '#F7F3FD',
        border: '#EFE7FC',
        destructive: '#DC2626',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}