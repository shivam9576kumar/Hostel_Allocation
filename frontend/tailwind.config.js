/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iit: {
          blue: '#1e3a8a',
          navy: '#0f172a',
          accent: '#2563eb',
          gold: '#f59e0b'
        }
      }
    },
  },
  plugins: [],
}
