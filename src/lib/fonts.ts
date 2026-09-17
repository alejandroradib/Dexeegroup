import localFont from "next/font/local";

export const inter = localFont({
  src: [
    { path: "../assets/fonts/Inter-Regular.ttf", weight: "400", style: "normal" },
    { path: "../assets/fonts/Inter-Medium.ttf", weight: "500", style: "normal" },
    { path: "../assets/fonts/Inter-SemiBold.ttf", weight: "600", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
});

export const montserrat = localFont({
  src: [
    { path: "../assets/fonts/Montserrat-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../assets/fonts/Montserrat-Bold.ttf", weight: "700", style: "normal" },
    { path: "../assets/fonts/Montserrat-ExtraBold.ttf", weight: "800", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
});
