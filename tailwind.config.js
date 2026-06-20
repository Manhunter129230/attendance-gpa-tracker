/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'primary-grad': 'linear-gradient(to right, #f9d423, #ff4e50)',
        'cyber-ambient': 'linear-gradient(-45deg, #000428, #00294d, #13101c, #4a4464)',
      },
      animation: {
        'smooth-shift': 'smoothShift 25s ease infinite',
        'floaty': 'floaty 8s ease-in-out infinite',
      },
      keyframes: {
        smoothShift: {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [],
}