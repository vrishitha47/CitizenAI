/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Highway-sign green — the civic identity color.
        sign: {
          50: "#e9f5ee",
          100: "#c7e6d3",
          200: "#94cdab",
          300: "#5db07f",
          400: "#2f8d59",
          500: "#0b5d3b", // primary
          600: "#094e32",
          700: "#073d27",
          800: "#052c1c",
          900: "#031a11",
        },
        // Hazard amber — reserved for warnings / priority signals.
        hazard: {
          400: "#ffc14d",
          500: "#f5a524",
          600: "#d4880f",
        },
        // Asphalt neutrals.
        asphalt: {
          50: "#f6f7f6",
          100: "#eceeed",
          200: "#d6dad8",
          300: "#b3bab6",
          400: "#828b86",
          500: "#5c645f",
          600: "#454b47",
          700: "#353a37",
          800: "#222624",
          900: "#141716",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        sans: ['"Archivo"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 23, 22, 0.04), 0 8px 24px -12px rgba(20, 23, 22, 0.12)",
      },
    },
  },
  plugins: [],
};
