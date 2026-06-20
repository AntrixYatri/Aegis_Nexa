/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/map/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        "bg-tactical": "#050507",
        primary: "#00e5ff",
        danger: "#ff3b3b",
        success: "#00ff88",
        alert: "#eab308",
        border: "#1f2937",
        "border-light": "#374151"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "Geist Mono", "monospace"],
      },
      letterSpacing: {
        tactical: "0.2em",
      }
    },
  },
  plugins: [],
};
