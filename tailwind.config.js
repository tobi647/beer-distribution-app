/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bauhinia': {
          DEFAULT: '#BE202E',
          light: '#BE202E1A', // 10% opacity for subtle backgrounds
        },
        'natural': {
          brown: '#8B4513',
          sand: '#F4A460',
        },
        'tropical': {
          green: '#2E8B57',
        },
        'ocean': {
          blue: '#4682B4',
        },
      },
      fontFamily: {
        'sansation': ['Sansation Bold', 'sans-serif'],
        'gotham-bold': ['Gotham Bold', 'sans-serif'],
        'gotham': ['Gotham Medium', 'sans-serif'],
      },
      boxShadow: {
        'gentle': '0 2px 4px rgba(0, 0, 0, 0.05), 0 1px 2px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
} 