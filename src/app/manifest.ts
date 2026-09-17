import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Dexee Talent Platform",
    short_name: "Dexee",
    start_url: "/en",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#011842",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
