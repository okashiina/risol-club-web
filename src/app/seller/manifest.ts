import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Risol Club Seller",
    short_name: "RC Seller",
    description: "Seller dashboard for Risol Club order, stock, and profit tracking.",
    start_url: "/seller",
    scope: "/seller",
    display: "standalone",
    background_color: "#fff8f6",
    theme_color: "#b91e1e",
    icons: [
      {
        src: "/brand/logo-white-bg.png?v=1",
        sizes: "768x768",
        type: "image/png",
      },
    ],
  };
}
