import { createRouteMetadata } from "@/utils/route-metadata";
import type { ReactNode } from "react";

export const metadata = createRouteMetadata("/images/studio", {
  title: "Image Studio",
  description:
    "Drop one image in, get 60+ platform-perfect sizes out — favicons, Open Graph, social, e-commerce, avatars, logos, print.",
  letter: "Is",
  additionalMetadata: {
    keywords: [
      "image converter",
      "favicon generator",
      "social media image sizes",
      "open graph image",
      "image resizer",
      "avatar generator",
      "product image sizes",
      "WebP AVIF JPEG PNG",
    ],
  },
});

export default function ImagesStudioLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <span className="shell-hide-dock" aria-hidden="true" />
      {children}
    </>
  );
}
