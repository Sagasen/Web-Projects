// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Sage green (warna primary Tarasari)
        sage: {
          50 : '#f2f7f2',
          100: '#e0ede0',
          200: '#c2dbc3',
          300: '#9dc29e',
          400: '#74a376',
          500: '#528854',
          600: '#3d6e3f',   // ← dipakai paling sering
          700: '#315733',
          800: '#28452a',
          900: '#1e3320',
        },
        // Cream background
        cream: '#faf9f6',
      },
    },
  },
  plugins: [],
}
