/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",              // ← Root App.tsx
    "./*.{js,ts,jsx,tsx}"     // ← All root files
  ],
  theme: { extend: {} },
  plugins: [],
}
