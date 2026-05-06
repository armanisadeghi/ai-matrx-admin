import { createRouteMetadata } from "@/utils/route-metadata";
import type { ReactNode } from "react";

export const metadata = createRouteMetadata("/images/search", {
  title: "Image Search",
  description:
    "Search millions of public images from Unsplash and browse curated cover collections.",
  letter: "Is",
  additionalMetadata: {
    keywords: ["image search", "unsplash", "public images", "stock photos", "curated covers"],
  },
});

export default function ImagesSearchLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
