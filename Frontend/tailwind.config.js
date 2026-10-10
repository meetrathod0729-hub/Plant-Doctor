
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f1f7f0",
          100: "#e0eddf",
          200: "#c2ddc0",
          300: "#94c394",
          400: "#62a565",
          500: "#3f8645",
          600: "#2e6b35",
          700: "#26552c",
          800: "#214425",
          900: "#1b3820",
        },
        cream: "#faf8f2",
        sage: "#e8eee3",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        display: ["Playfair Display", "serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(27, 56, 32, 0.07)",
      },
    },
  },
  plugins: [],
};
