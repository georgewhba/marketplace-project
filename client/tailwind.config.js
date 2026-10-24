/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0cec7',
          400: '#d2bab0',
          500: '#a36d54',
          600: '#8c5a45',
          'dark-brown': '#2C1810',
          'terracotta': '#C85A32',
          'light-sand': '#F9F6F0',
          'sand': '#E6DEC8',
        }
      }
    },
  },
  corePlugins: {
    preflight: false,
  },
  plugins: [],
}
