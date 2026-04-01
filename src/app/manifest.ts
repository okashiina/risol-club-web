import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Risol Club",
    short_name: "Risol Club",
    description: "Cute artisanal risol storefront for easy mobile pre-orders.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8f6",
    theme_color: "#b91e1e",
    icons: [
      {
        src: "/brand/logo-red-transparent.png?v=4",
        sizes: "768x768",
        type: "image/png",
      },
      {
        src: "/brand/logo-red-transparent.png?v=4",
        sizes: "768x768",
        type: "image/png",
      },
    ],
  };
}
