import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundColor: {
        base: "#000000",
      },
      textColor: {
        base: "#ffffff",
      },
    },
  },
  plugins: [],
};
export default config;
