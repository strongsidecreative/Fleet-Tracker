/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // "Fleet Tracker" palette — colours sampled directly from the real
        // app icon/logo (public/icon-512.png), not an approximation.
        ink: "#070E1F",        // deep navy-black from the icon's background, primary text & dark surfaces
        steel: "#57647C",      // cool blue-grey, secondary text & borders
        paper: "#F5F7FB",      // cool off-white background
        brand: "#1365F2",      // primary blue accent, sampled from the pin's mid-tone — buttons, links, active states
        brandLight: "#2CAEFC", // lighter blue, sampled from the pin's highlight — gradients/hover states
        amber: "#E2A73B",      // status only: vehicle in use / caution
        track: "#22A06B",      // status only: vehicle available / success
        rust: "#D64545",       // status only: errors, odometer rejection
      },
      fontFamily: {
        // Backed by next/font/google in app/layout.tsx (self-hosted at
        // build time) rather than a runtime Google Fonts request — see
        // the comment in app/globals.css.
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
    },
  },
  plugins: [],
};
