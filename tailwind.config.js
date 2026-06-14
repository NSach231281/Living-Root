/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          earth:  "#2C1810",
          bone:   "#F5F0E8",
          clay:   "#8B5E3C",
          spice:  "#C4622D",
          gold:   "#D4A843",
          sand:   "#E8DCC8",
          border: "#D4C4A8",
          muted:  "#9C8672",
        },
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans:  ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        elite: "0 8px 32px rgba(44,24,16,0.12), 0 2px 8px rgba(44,24,16,0.08)",
        card:  "0 2px 12px rgba(44,24,16,0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
};
