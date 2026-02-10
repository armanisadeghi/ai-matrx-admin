import React from "react";
import { createRouteMetadata } from "@/utils/route-metadata";

export const metadata = createRouteMetadata("/image-editing/public-image-search", {
    title: "Image Search",
    description: "Browse a collection of images you can use in your projects",
});

export default function ImageSearchLayout({ children }: { children: React.ReactNode }) {
    return children;
}
