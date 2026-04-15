/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pitch: '#0B2E13',
        powerplay: '#E5FF61',
        sunset: '#FF7B54',
        navy: '#0F172A',
      },
      boxShadow: {
        neon: '0 10px 30px rgba(229, 255, 97, 0.35)',
      },
      backgroundImage: {
        stadium:
          'radial-gradient(circle at 20% 20%, rgba(229,255,97,0.22), transparent 35%), radial-gradient(circle at 80% 10%, rgba(255,123,84,0.2), transparent 30%), linear-gradient(120deg, #06140A 0%, #0E2F1A 45%, #132F4E 100%)',
      },
    },
  },
  plugins: [],
};
