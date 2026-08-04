/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#18181b',
        brand: '#ec4899',
        'brand-dark': '#be185d'
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.06), 0 10px 30px rgba(15, 23, 42, 0.04)'
      }
    }
  },
  plugins: []
};
