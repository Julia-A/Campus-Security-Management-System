module.exports = {
  mode: "jit",
  purge: ["./views/**/*.ejs"],
  theme: {
    extend: {
      colors: {
        primary: "#0E76A8", // Webflow-style blue
        secondary: "#F5F5F5", // Light background
        dark: "#222222",
      },
      fontFamily: {
        sans: ["Inter", "Poppins", "Arial", "sans-serif"],
      },
      boxShadow: {
        smooth: "0px 10px 30px rgba(0, 0, 0, 0.1)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
