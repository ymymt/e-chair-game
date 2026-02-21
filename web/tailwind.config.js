/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./utils/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      animation: {
        "shock-vibrate": "shock-vibrate 0.25s linear infinite both",
        "flip-in-ver-right":
          "flip-in-ver-right 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940)  both",
        "scale-in": "scale-in 0.2s ease-out forwards",
        "winner-result-dialog":
          "winner-result-dialog 1.5s ease infinite alternate, scale-in 0.2s ease-out forwards",
        "loser-result-dialog":
          "loser-result-dialog 1.5s ease infinite alternate, scale-in 0.2s ease-out forwards",
        "draw-result-dialog":
          "draw-result-dialog 1.5s ease infinite alternate, scale-in 0.2s ease-out forwards",
      },
      keyframes: {
        "scale-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "shock-vibrate": {
          "0%,to": {
            transform: "translate(0)",
          },
          "10%,50%,80%": {
            transform: "translate(-60px, -30px)",
          },
          "20%,60%,90%": {
            transform: "translate(30px, -60px)",
          },
          "30%,70%": {
            transform: "translate(-60px, 30px)",
          },
          "40%": {
            transform: "translate(30px, 60px)",
          },
        },
        "flip-in-ver-right": {
          "0%": {
            transform: "rotateY(-80deg)",
            opacity: "0",
          },
          to: {
            transform: "rotateY(0)",
            opacity: "1",
          },
        },
        "winner-result-dialog": {
          "0%": {
            border: "6px solid #fefcbf",
          },
          "100%": {
            border: "6px solid #eab308",
          },
        },
        "loser-result-dialog": {
          "0%": {
            border: "6px solid #1f2937",
          },
          "100%": {
            border: "6px solid #ef4444",
          },
        },
        "draw-result-dialog": {
          "0%": {
            border: "6px solid #d1d5db",
          },
          "100%": {
            border: "6px solid #a0aec0",
          },
        },
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
    },
  },
  plugins: [],
};
