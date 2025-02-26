// styles/themes/fonts.ts
import { Inter, Montserrat, Open_Sans, Roboto } from "next/font/google";

// Load Inter as primary font
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Keep your existing Montserrat
export const montserrat = Montserrat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-montserrat",
});

// Add Open Sans as an additional readable font
export const openSans = Open_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-opensans",
});

// Add Roboto as an alternative
export const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});
