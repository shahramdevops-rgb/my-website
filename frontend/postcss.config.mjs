// Tailwind v4 runs as a PostCSS plugin inside Next's CSS pipeline (no separate CLI or watcher).
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
