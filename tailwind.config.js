/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './views/**/*.ejs', // Includes all EJS files in the `views` folder and subfolders
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
 
    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {colors: {
      vuejss: "#09ed46"
    }},
  },
  plugins: [],
}

