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
        display: ["'Space Grotesk'", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
    },
  },
  plugins: [],
};
